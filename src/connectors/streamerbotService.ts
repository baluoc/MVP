import WebSocket from 'ws';
import { EventEmitter } from 'events';

interface SBConfig {
    address?: string;
    port?: number;
    endpoint?: string;
    password?: string;
}

export class StreamerBotService extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: SBConfig = {};
    private isConnected: boolean = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private explicitDisconnect: boolean = false;

    // Cache
    private actions: any[] = [];
    private events: any = {};

    constructor() {
        super();
    }

    public configure(cfg: SBConfig) {
        this.config = cfg;
        // Auto-connect if configured
        if (this.config.address && this.config.port) {
            this.connect();
        }
    }

    public connect() {
        if (this.isConnected) return;
        if (!this.config.address) return;

        this.explicitDisconnect = false;

        const host = this.config.address || '127.0.0.1';
        const port = this.config.port || 8080;
        const endpoint = this.config.endpoint || '/';
        const url = `ws://${host}:${port}${endpoint}`;

        console.log(`[Streamer.bot] Connecting to ${url}...`);

        try {
            this.ws = new WebSocket(url);

            this.ws.on('open', () => {
                this.isConnected = true;
                console.log('[Streamer.bot] Connected');
                this.emit('connected');

                // Initial Fetches
                this.getActions();
                this.getEvents();
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.ws = null;
                console.log('[Streamer.bot] Disconnected');
                this.emit('disconnected');
                if (!this.explicitDisconnect) {
                    this.attemptReconnect();
                }
            });

            this.ws.on('error', (err) => {
                console.error('[Streamer.bot] Error:', err.message);
                this.ws = null;
            });

            this.ws.on('message', (data) => {
                 try {
                     const msg = JSON.parse(data.toString());
                     // Handle Responses
                     if (msg.status === 'ok') {
                         if (msg.actions) {
                             this.actions = msg.actions;
                         }
                         if (msg.events) {
                             this.events = msg.events;
                             // Auto Subscribe to key events once we know they exist
                             this.subscribeToDefaults();
                         }
                     }
                 } catch(e) { console.error("[Streamer.bot] Parse error", e); }
            });

        } catch (e: any) {
            console.error('[Streamer.bot] Connection setup failed:', e.message);
            this.attemptReconnect();
        }
    }

    public disconnect() {
        this.explicitDisconnect = true;
        if (this.reconnectInterval) clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    private attemptReconnect() {
        if (this.reconnectInterval) return;
        this.reconnectInterval = setInterval(() => {
            console.log('[Streamer.bot] Attempting reconnect...');
            this.connect();
        }, 5000);
    }

    // --- COMMANDS ---

    public getActions() {
        this.sendJson({
            request: 'GetActions',
            id: 'init-actions'
        });
    }

    public getEvents() {
        this.sendJson({
            request: 'GetEvents',
            id: 'init-events'
        });
    }

    private subscribeToDefaults() {
        // We want to subscribe to General.Custom at minimum if it exists
        // Structure of events from GetEvents is usually { "General": ["Custom", ...], ... }
        const subs: any = {};
        let hasSubs = false;

        // Example: Subscribe to everything or selective
        // For this task: Core relevant events (Action/General)
        // If "General" exists, sub to it.
        if (this.events["General"]) {
            subs["General"] = this.events["General"];
            hasSubs = true;
        }

        if (hasSubs) {
            this.sendJson({
                request: 'Subscribe',
                events: subs,
                id: 'auto-sub'
            });
            console.log("[Streamer.bot] Auto-subscribed to defaults");
        }
    }

    public async doAction(actionId: string, args: any = {}) {
        if (!this.isConnected) throw new Error("Not connected");

        const id = Date.now().toString();
        const payload = {
            request: 'DoAction',
            action: {
                id: actionId
            },
            args: args,
            id: id
        };

        this.sendJson(payload);
    }

    public sendJson(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
             // For background fetches, we might silently fail if not connected
             if (data.request === 'GetActions' || data.request === 'GetEvents') return;
             throw new Error("WebSocket not open");
        }
    }

    public getStatus() {
        return {
            connected: this.isConnected,
            url: `ws://${this.config.address}:${this.config.port}`,
            actionsCount: this.actions.length,
            eventsAvailable: Object.keys(this.events).length
        };
    }

    public getCachedActions() {
        return this.actions;
    }
}

export const streamerBotService = new StreamerBotService();
