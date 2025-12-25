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
                // If password exists, might need auth flow (SB specific).
                // Usually SB v0.x doesn't enforce auth on local WS unless configured.
                // We assume standard connection for now.

                // If we need to subscribe to events:
                this.sendJson({
                    request: 'Subscribe',
                    events: { "General": ["Custom"], "Twitch": ["ChatMessage", "Cheer", "Sub"] },
                    id: 'sub-init'
                });
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.ws = null;
                console.log('[Streamer.bot] Disconnected');
                this.emit('disconnected');
                this.attemptReconnect();
            });

            this.ws.on('error', (err) => {
                console.error('[Streamer.bot] Error:', err.message);
                this.ws = null; // Close event will handle reconnect
            });

            this.ws.on('message', (data) => {
                 // Handle incoming events if needed
            });

        } catch (e: any) {
            console.error('[Streamer.bot] Connection setup failed:', e.message);
            this.attemptReconnect();
        }
    }

    public disconnect() {
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

    // --- ACTIONS ---

    public async doAction(actionIdOrName: string) {
        if (!this.isConnected) throw new Error("Not connected");

        // Streamer.bot WebSocket API v1 usually uses 'DoAction'
        // Payload structure depends on version. Assuming standard JSON request.
        const id = Date.now().toString();
        const payload = {
            request: 'DoAction',
            action: {
                // It supports id or name
                name: actionIdOrName
            },
            id: id
        };

        this.sendJson(payload);
    }

    public sendJson(data: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            // Silently fail if just subscribing during startup, or throw if action
            // For now, robustly ignore if not open to avoid crashing loops
            if (data.request === 'Subscribe') return;
            throw new Error("WebSocket not open");
        }
    }

    public getStatus() {
        return {
            connected: this.isConnected,
            url: `ws://${this.config.address}:${this.config.port}`
        };
    }
}

export const streamerBotService = new StreamerBotService();
