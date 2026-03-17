/**
 * @file index.ts
 * @description Public API pakietu @ai-devs/mcp-tools.
 *
 * ## Co eksportujemy?
 *
 * Eksportujemy tylko to co potrzebuje klient (agentLoop.ts):
 *   - `createMcpStdioClient` — klient stdio (subprocess)
 *   - `createMcpHttpClient`  — klient HTTP/SSE (serwer zewnętrzny)
 *
 * Nie eksportujemy internali serwera (registry, transports, mcp-server)
 * — są one używane tylko przez server.ts.
 *
 * ## Przykład użycia w agentLoop.ts
 *
 * ```typescript
 * import { createMcpStdioClient } from "@ai-devs/mcp-tools";
 *
 * // Uruchom serwer MCP jako subprocess i pobierz narzędzia
 * const mcpClient = createMcpStdioClient("bun", ["run", "packages/mcp-tools/server.ts"]);
 * await mcpClient.connect();
 * const tools = await mcpClient.listTools(); // AiTool[] — gotowe do użycia w agentLoop
 *
 * // ... uruchom agenta ...
 *
 * // Na końcu rozłącz (zamknij subprocess)
 * mcpClient.disconnect();
 * ```
 *
 * ## Przykład użycia z HTTP/SSE
 *
 * ```typescript
 * import { createMcpHttpClient } from "@ai-devs/mcp-tools";
 *
 * // Serwer musi być uruchomiony osobno: bun run packages/mcp-tools/server.ts --http
 * const mcpClient = createMcpHttpClient("http://localhost:3001");
 * await mcpClient.connect();
 * const tools = await mcpClient.listTools();
 * ```
 */

export { createMcpStdioClient, createMcpHttpClient } from "./mcp-client.ts";
export type { McpClient, McpClientOptions } from "./mcp-client.ts";

// Eksportuj też typy protokołu — przydatne przy pisaniu własnych narzędzi
export type { McpTool, McpToolCallResult, McpTextContent } from "./protocol/types.ts";
export { mcpOk, mcpErr } from "./protocol/types.ts";
export { registerTool } from "./registry.ts";
