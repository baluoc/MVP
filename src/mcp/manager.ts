import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export type MCPStatus = 'stopped' | 'running' | 'error';

export interface MCPState {
    status: MCPStatus;
    pid: number | null;
    port: number;
    url: string;
    lastError: string | null;
}

// Default config
const DEFAULT_PORT = 3001;

class MCPManager {
    private process: ChildProcess | null = null;
    private state: MCPState = {
        status: 'stopped',
        pid: null,
        port: DEFAULT_PORT,
        url: '',
        lastError: null
    };
    private logBuffer: string[] = [];

    constructor() {
        // Try to respect env or config
        if (process.env.MCP_PORT) {
            this.state.port = parseInt(process.env.MCP_PORT, 10);
        }
        this.updateUrl();
    }

    private updateUrl() {
        this.state.url = `http://localhost:${this.state.port}`;
    }

    public start() {
        if (this.state.status === 'running') return;

        console.log('[MCP Manager] Starting MCP Service...');

        // Resolve path to mcp-server build
        // Root is process.cwd()
        // mcp-server built to mcp-server/dist/index.js
        const scriptPath = path.join(process.cwd(), 'mcp-server', 'dist', 'index.js');

        if (!fs.existsSync(scriptPath)) {
            this.state.lastError = `MCP executable not found at ${scriptPath}. Run 'npm run build'.`;
            this.state.status = 'error';
            return;
        }

        const env = { ...process.env, MCP_PORT: this.state.port.toString() };

        this.process = spawn('node', [scriptPath], {
            env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        this.state.pid = this.process.pid || null;
        this.state.status = 'running';
        this.state.lastError = null;

        this.process.stdout?.on('data', (data) => {
            const line = data.toString().trim();
            console.log(`[MCP] ${line}`);
            this.logBuffer.push(`[STDOUT] ${line}`);
            if (this.logBuffer.length > 100) this.logBuffer.shift();
        });

        this.process.stderr?.on('data', (data) => {
            const line = data.toString().trim();
            console.error(`[MCP ERR] ${line}`);
            this.logBuffer.push(`[STDERR] ${line}`);
            this.state.lastError = line;
            if (this.logBuffer.length > 100) this.logBuffer.shift();
        });

        this.process.on('close', (code) => {
            console.log(`[MCP Manager] Process exited with code ${code}`);
            this.state.status = 'stopped';
            this.state.pid = null;
            this.process = null;
        });

        this.process.on('error', (err) => {
            console.error(`[MCP Manager] Failed to spawn: ${err.message}`);
            this.state.status = 'error';
            this.state.lastError = err.message;
            this.process = null;
        });
    }

    public stop() {
        if (this.process) {
            console.log('[MCP Manager] Stopping MCP Service...');
            this.process.kill();
            this.process = null;
            this.state.status = 'stopped';
            this.state.pid = null;
        }
    }

    public getStatus(): MCPState {
        return { ...this.state };
    }

    public getLogs(): string[] {
        return [...this.logBuffer];
    }
}

export const mcpManager = new MCPManager();
