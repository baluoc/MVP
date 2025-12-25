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
                    // Simple Levenshtein distance for suggestions
                    const levenshtein = (a: string, b: string) => {
                        const matrix = [];
                        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
                        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
                        for (let i = 1; i <= b.length; i++) {
                            for (let j = 1; j <= a.length; j++) {
                                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                                    matrix[i][j] = matrix[i - 1][j - 1];
                                } else {
                                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                                }
                            }
                        }
                        return matrix[b.length][a.length];
                    };

                    const candidates = toolDefinitions.map(t => t.name);
                    // Filter candidates with distance <= 5 or substring match
                    const didYouMean = candidates
                        .map(c => ({ name: c, dist: levenshtein(toolName, c) }))
                        .filter(x => x.dist <= 5 || x.name.includes(toolName) || toolName.includes(x.name))
                        .sort((a, b) => a.dist - b.dist)
                        .slice(0, 3) // Top 3
                        .map(x => x.name);

                    return {
                        jsonrpc: "2.0",
                        id: msgId,
                        error: {
                            code: -32601, // Method not found (or Tool not found)
                            message: `Unknown tool: ${toolName}`,
                            data: {
                                didYouMean,
                                availableToolsHint: "Call tools/list to see all available tools."
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
                    let helpfulMessage = `Internal Error: ${toolErr.message}`;
                    const suggestions = [];

                    // Heuristics for common errors
                    if (toolErr.message.includes("not connected") || toolErr.message.includes("Session missing")) {
                        helpfulMessage += "\n\n(Es scheint keine Verbindung zu TikTok zu bestehen. Versuche tiktok.connect)";
                        suggestions.push("tiktok.connect");
                    }
                    if (toolErr.message.includes("ENOENT") || toolErr.message.includes("not found")) {
                        helpfulMessage += "\n\n(Datei oder Resource fehlt. Prüfe den Pfad oder rufe repo.index auf)";
                    }

                    return {
                        jsonrpc: "2.0",
                        id: msgId,
                        result: {
                            content: [{ type: "text", text: helpfulMessage }],
                            isError: true,
                            _meta: {
                                suggestedTools: suggestions
                            }
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
