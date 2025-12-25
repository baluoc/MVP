import { DIVPacket, validateDIV } from '../div/validator';
import { applyDIV, rollbackDIV } from '../div/applier';
import fs from 'fs';
import path from 'path';

// --- Types ---

export interface Tool {
    name: string;
    title: string;
    description: string;
    inputSchema: Record<string, any>;
}

export interface ToolResult {
    content: { type: string; text?: string; data?: string; mimeType?: string; resource?: any }[];
    structuredContent?: any;
    isError?: boolean;
}

// --- Data Access Helpers (Duplicate from index.ts - should ideally be shared) ---
const DATA_DIR = path.join(process.cwd(), 'mcp-data');

function loadDIV(id: string): DIVPacket | null {
    const p = path.join(DATA_DIR, 'queue', `${id}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveDIV(div: DIVPacket) {
    const p = path.join(DATA_DIR, 'queue', `${div.id}.json`);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(div, null, 2));
}

function listDIVs(): DIVPacket[] {
    const dir = path.join(DATA_DIR, 'queue');
    if(!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
        .sort((a, b) => new Date(b.erstelltAm).getTime() - new Date(a.erstelltAm).getTime());
}

// --- Tools Definitions ---

export const tools: Record<string, (args: any) => Promise<ToolResult>> = {
    "div.list_queue": async () => {
        const divs = listDIVs();
        const summary = divs.map(d => ({ id: d.id, title: d.titel, status: d.review.status, role: d.rolle }));
        return {
            content: [{ type: "text", text: `Found ${divs.length} DIVs in queue.` }],
            structuredContent: { count: divs.length, divs: summary }
        };
    },

    "div.get_details": async (args: { id: string }) => {
        if (!args.id) throw new Error("Missing id");
        const div = loadDIV(args.id);
        if (!div) throw new Error("DIV not found");
        return {
            content: [{ type: "text", text: JSON.stringify(div, null, 2) }],
            structuredContent: div
        };
    },

    "div.create_draft": async (args: Partial<DIVPacket>) => {
        // Minimal required fields check?
        // Let's create a skeleton if missing
        const div: DIVPacket = {
            id: args.id || `div_${Date.now()}`,
            titel: args.titel || "Untitled",
            autor: args.autor || "mcp",
            rolle: (args.rolle as any) || "addon_dev",
            erstelltAm: new Date().toISOString(),
            intent: args.intent || "feature",
            scope: args.scope || { paths: [], risiko: "low" },
            plan: args.plan || [],
            changes: args.changes || [],
            qa: { required: ["test:unit"], results: { status: "pending", artifacts: [] } },
            rollback: { strategy: "reverse", notes: "Auto-generated" },
            review: { status: "draft", comments: [] }
        };

        saveDIV(div);
        return {
            content: [{ type: "text", text: `DIV ${div.id} created as draft.` }],
            structuredContent: { id: div.id, status: "draft" }
        };
    },

    "div.validate": async (args: { id: string }) => {
        const div = loadDIV(args.id);
        if (!div) throw new Error("DIV not found");
        const res = validateDIV(div);
        if (!res.valid) {
            return {
                content: [{ type: "text", text: `Validation failed: ${res.error}` }],
                structuredContent: { valid: false, error: res.error },
                isError: true
            };
        }
        return {
            content: [{ type: "text", text: "Validation passed." }],
            structuredContent: { valid: true }
        };
    },

    "div.apply": async (args: { id: string }) => {
        const div = loadDIV(args.id);
        if (!div) throw new Error("DIV not found");

        // Re-validate
        const valid = validateDIV(div);
        if (!valid.valid) throw new Error(`Cannot apply invalid DIV: ${valid.error}`);

        try {
            await applyDIV(div, process.cwd());
            div.review.status = "applied";
            saveDIV(div);
            return {
                content: [{ type: "text", text: `DIV ${div.id} applied successfully.` }],
                structuredContent: { success: true, status: "applied" }
            };
        } catch (e: any) {
             return {
                content: [{ type: "text", text: `Apply failed: ${e.message}` }],
                structuredContent: { success: false, error: e.message },
                isError: true
            };
        }
    },

    "div.rollback": async (args: { id: string }) => {
        const div = loadDIV(args.id);
        if (!div) throw new Error("DIV not found");

        try {
            await rollbackDIV(div, process.cwd());
            div.review.status = "rolled_back";
            saveDIV(div);
            return {
                content: [{ type: "text", text: `DIV ${div.id} rolled back successfully.` }],
                structuredContent: { success: true, status: "rolled_back" }
            };
        } catch (e: any) {
            return {
                content: [{ type: "text", text: `Rollback failed: ${e.message}` }],
                structuredContent: { success: false, error: e.message },
                isError: true
            };
        }
    },

    "system.get_status": async () => {
        return {
            content: [{ type: "text", text: "System running." }],
            structuredContent: {
                status: "running",
                pid: process.pid,
                uptime: process.uptime(),
                cwd: process.cwd()
            }
        };
    },

    "system.get_logs": async () => {
        // Need access to manager logs?
        // Or reading from log file?
        // Since we are INSIDE the MCP process, we don't have access to the Manager's log buffer easily unless we expose it or write to file.
        // The previous step implemented `mcpManager` in Core.
        // This is the MCP Service. It logs to stderr.
        // If we want logs *of* the MCP service, we can't easily read our own stderr unless we hook it.
        // BUT, maybe we can read `server.log` if we piped it?
        // Requirement says "MCP kann Logs liefern".
        // Let's implement a simple internal log buffer here too?
        // For now, return a placeholder or read a shared log file if one exists.
        return {
             content: [{ type: "text", text: "Logs access not fully implemented inside isolated process." }],
             structuredContent: { logs: [] }
        };
    }
};

export const toolDefinitions: Tool[] = [
    {
        name: "div.list_queue",
        title: "List DIV Queue",
        description: "Lists all DIV packets in the queue with their status.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
        name: "div.get_details",
        title: "Get DIV Details",
        description: "Gets full JSON content of a DIV.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
        name: "div.create_draft",
        title: "Create DIV Draft",
        description: "Creates a new DIV packet. Returns ID.",
        inputSchema: { type: "object", properties: { titel: { type: "string" }, changes: { type: "array" } } }
    },
    {
        name: "div.validate",
        title: "Validate DIV",
        description: "Checks if a DIV is valid against policies.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
        name: "div.apply",
        title: "Apply DIV",
        description: "Applies the changes in the DIV to the codebase.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
        name: "div.rollback",
        title: "Rollback DIV",
        description: "Reverts the changes of a DIV.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
    },
    {
        name: "system.get_status",
        title: "System Status",
        description: "Returns process status and info.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }
    },
    {
        name: "system.get_logs",
        title: "System Logs",
        description: "Returns recent logs.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false }
    }
];
