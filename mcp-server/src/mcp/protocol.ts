import { toolDefinitions, tools } from './tools';

export interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: number | string;
    method: string;
    params?: any;
}

export interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: number | string | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

export async function handleMCPRequest(req: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { id, method, params } = req;
    const msgId = id ?? null;

    if (req.jsonrpc !== "2.0") {
        return {
            jsonrpc: "2.0",
            id: msgId,
            error: { code: -32600, message: "Invalid Request" }
        };
    }

    try {
        switch (method) {
            case "initialize":
                return {
                    jsonrpc: "2.0",
                    id: msgId,
                    result: {
                        protocolVersion: "2025-03-26",
                        capabilities: { tools: { listChanged: true } },
                        serverInfo: { name: "JulesMCP", version: "1.0.0" }
                    }
                };

            case "notifications/initialized":
                // No response needed for notification
                return { jsonrpc: "2.0", id: msgId, result: {} }; // Actually usually no response, but if sent as request?

            case "tools/list":
                return {
                    jsonrpc: "2.0",
                    id: msgId,
                    result: {
                        tools: toolDefinitions
                    }
                };

            case "tools/call":
                const toolName = params?.name;
                const toolArgs = params?.arguments || {};

                const toolFn = tools[toolName];
                if (!toolFn) {
                    return {
                        jsonrpc: "2.0",
                        id: msgId,
                        error: {
                            code: -32601, // Method not found (or Tool not found)
                            message: `Unknown tool: ${toolName}`,
                            data: {
                                didYouMean: toolDefinitions.map(t => t.name).filter(n => n.includes(toolName.split('.')[1] || "")),
                                availableToolsHint: "Call tools/list"
                            }
                        }
                    };
                }

                try {
                    const result = await toolFn(toolArgs);

                    // If result has isError set, it's a Tool Execution Error (business logic)
                    // But protocol-wise it's a success result containing error info.
                    return {
                        jsonrpc: "2.0",
                        id: msgId,
                        result: result
                    };

                } catch (toolErr: any) {
                    // Unexpected JS error in tool execution
                    return {
                        jsonrpc: "2.0",
                        id: msgId,
                        result: {
                            content: [{ type: "text", text: `Internal Error: ${toolErr.message}` }],
                            isError: true
                        }
                    };
                }

            default:
                return {
                    jsonrpc: "2.0",
                    id: msgId,
                    error: { code: -32601, message: "Method not found" }
                };
        }
    } catch (e: any) {
        return {
            jsonrpc: "2.0",
            id: msgId,
            error: { code: -32603, message: "Internal Error", data: e.message }
        };
    }
}
