import OBSWebSocket from 'obs-websocket-js';
import { EventEmitter } from 'events';

interface OBSConfig {
    ip?: string;
    port?: number;
    password?: string;
}

export class OBSService extends EventEmitter {
    private obs: OBSWebSocket;
    private config: OBSConfig = {};
    private isConnected: boolean = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private currentScene: string = "";

    constructor() {
        super();
        this.obs = new OBSWebSocket();

        // Forward Events
        this.obs.on('ConnectionOpened', () => {
            this.isConnected = true;
            console.log('[OBS] Connected');
            this.emit('connected');
            this.fetchState();
        });

        this.obs.on('ConnectionClosed', (err) => {
            this.isConnected = false;
            console.log('[OBS] Disconnected', err.message);
            this.emit('disconnected');
            this.attemptReconnect();
        });

        this.obs.on('CurrentProgramSceneChanged', (data) => {
            this.currentScene = data.sceneName;
            this.emit('sceneChanged', this.currentScene);
        });

        // Forward generic events if needed for addons
        // this.obs.on('Identified', ...)
    }

    public configure(cfg: OBSConfig) {
        this.config = cfg;
        // If configured and not connected, try connect
        if (this.config.ip && this.config.port) {
            this.connect();
        }
    }

    public async connect() {
        if (this.isConnected) return;
        if (!this.config.ip) return;

        const url = `ws://${this.config.ip}:${this.config.port || 4455}`;
        try {
            await this.obs.connect(url, this.config.password);
        } catch (e: any) {
            console.error('[OBS] Connection failed:', e.message);
            this.attemptReconnect();
        }
    }

    public async disconnect() {
        if (this.reconnectInterval) clearInterval(this.reconnectInterval);
        this.reconnectInterval = null;
        try {
            await this.obs.disconnect();
        } catch(e) {}
    }

    private attemptReconnect() {
        if (this.reconnectInterval) return;
        this.reconnectInterval = setInterval(() => {
            console.log('[OBS] Attempting reconnect...');
            this.connect();
        }, 5000);
    }

    private async fetchState() {
        try {
             const res = await this.obs.call('GetCurrentProgramScene');
             this.currentScene = res.currentProgramSceneName;
        } catch(e) {}
    }

    // --- ACTIONS ---

    public async switchScene(sceneName: string) {
        if (!this.isConnected) throw new Error("Not connected");
        await this.obs.call('SetCurrentProgramScene', { sceneName });
    }

    public async sendRaw(requestType: string, requestData?: any) {
        if (!this.isConnected) throw new Error("Not connected");
        // FIX: Cast string to any or specific type because obs-websocket-js types are strict about keys
        return await this.obs.call(requestType as any, requestData);
    }

    public getStatus() {
        return {
            connected: this.isConnected,
            currentScene: this.currentScene
        };
    }
}

export const obsService = new OBSService();
