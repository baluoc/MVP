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
    private explicitDisconnect: boolean = false;
    private isStreaming: boolean = false;
    private isRecording: boolean = false;

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
            if (!this.explicitDisconnect) {
                this.attemptReconnect();
            }
        });

        this.obs.on('CurrentProgramSceneChanged', (data) => {
            this.currentScene = data.sceneName;
            this.emit('sceneChanged', this.currentScene);
        });

        this.obs.on('StreamStateChanged', (data) => {
            this.isStreaming = data.outputActive;
            this.emit('streamStateChanged', this.isStreaming);
        });

        this.obs.on('RecordStateChanged', (data) => {
            this.isRecording = data.outputActive;
            this.emit('recordStateChanged', this.isRecording);
        });
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

        this.explicitDisconnect = false;

        const url = `ws://${this.config.ip}:${this.config.port || 4455}`;
        try {
            await this.obs.connect(url, this.config.password);
        } catch (e: any) {
            console.error('[OBS] Connection failed:', e.message);
            this.attemptReconnect();
        }
    }

    public async disconnect() {
        this.explicitDisconnect = true;
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

             const streamStatus = await this.obs.call('GetStreamStatus');
             this.isStreaming = streamStatus.outputActive;

             const recordStatus = await this.obs.call('GetRecordStatus');
             this.isRecording = recordStatus.outputActive;

        } catch(e) {}
    }

    // --- ACTIONS ---

    public async switchScene(sceneName: string) {
        if (!this.isConnected) throw new Error("Not connected");
        await this.obs.call('SetCurrentProgramScene', { sceneName });
    }

    public async getScenes() {
        if (!this.isConnected) return [];
        const res = await this.obs.call('GetSceneList');
        // obs-websocket v5 returns { currentProgramSceneName, scenes: [] }
        return res.scenes || [];
    }

    public async getInputs() {
        if (!this.isConnected) return [];
        // v5 uses GetInputList
        const res = await this.obs.call('GetInputList');
        return res.inputs || [];
    }

    public async toggleInput(inputName: string, enabled: boolean) {
        if (!this.isConnected) throw new Error("Not connected");

        try {
            const scene = await this.obs.call('GetCurrentProgramScene');
            const items = await this.obs.call('GetSceneItemList', { sceneName: scene.currentProgramSceneName });
            const item = items.sceneItems.find((i: any) => i.sourceName === inputName);

            if (item) {
                const itemId = item.sceneItemId as number;
                await this.obs.call('SetSceneItemEnabled', {
                    sceneName: scene.currentProgramSceneName,
                    sceneItemId: itemId,
                    sceneItemEnabled: enabled
                });
            } else {
                 console.warn(`[OBS] Source '${inputName}' not found in current scene.`);
            }
        } catch(e) { console.error("[OBS] Toggle Input failed", e); throw e; }
    }

    public async toggleMute(inputName: string) {
        if (!this.isConnected) throw new Error("Not connected");
        try {
            await this.obs.call('ToggleInputMute', { inputName });
        } catch(e) { console.error("[OBS] Toggle Mute failed", e); throw e; }
    }

    public async setStreamState(streaming: boolean) {
        if (!this.isConnected) throw new Error("Not connected");
        if (streaming) {
            await this.obs.call('StartStream');
        } else {
            await this.obs.call('StopStream');
        }
    }

    public async setInputSettings(inputName: string, settings: any) {
        if (!this.isConnected) throw new Error("Not connected");
        await this.obs.call('SetInputSettings', { inputName, inputSettings: settings });
    }

    public async sendRaw(requestType: string, requestData?: any) {
        if (!this.isConnected) throw new Error("Not connected");
        return await this.obs.call(requestType as any, requestData);
    }

    public getStatus() {
        return {
            connected: this.isConnected,
            currentScene: this.currentScene,
            streaming: this.isStreaming,
            recording: this.isRecording
        };
    }
}

export const obsService = new OBSService();
