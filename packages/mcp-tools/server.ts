/**
 * @file server.ts
 * @description Entry point serwera MCP — uruchamia stdio lub HTTP/SSE transport.
 *
 * ## Użycie
 *
 * ```bash
 * # Tryb stdio (domyślny) — klient uruchamia jako subprocess
 * bun run packages/mcp-tools/server.ts
 *
 * # Tryb HTTP/SSE — serwer nasłuchuje na porcie (domyślnie 3001)
 * bun run packages/mcp-tools/server.ts --http
 * bun run packages/mcp-tools/server.ts --http --port 3002
 * ```
 *
 * ## Kiedy używać którego trybu?
 *
 * ### stdio (domyślny)
 * - Narzędzia lokalne — klient i serwer na tej samej maszynie
 * - Serwer jest uruchamiany i zatrzymywany razem z klientem (subprocess lifecycle)
 * - Brak problemów z portami, CORS, autoryzacją
 * - Standardowy tryb dla Claude Desktop i większości MCP klientów
 *
 * ### HTTP/SSE (--http)
 * - Serwer działa niezależnie od klienta (można go restartować osobno)
 * - Klient może być na innej maszynie (np. agent w chmurze → lokalny serwer przez tunel)
 * - Wiele klientów może się połączyć jednocześnie
 * - Debugowanie łatwiejsze (można testować przez curl)
 *
 * ## Architektura przepływu danych
 *
 * ```
 * [stdio]
 * stdin → createStdioServerTransport → createMessageHandler → registry → tool.execute()
 *                                    ← send(response) ← stdout
 *
 * [HTTP/SSE]
 * GET /sse  → SSE stream otwierany dla klienta
 * POST /msg → createSseServerTransport → createMessageHandler → registry → tool.execute()
 *           → send(response) → SSE stream → klient
 * ```
 */

import chalk from "chalk";

// 1. Import wszystkich narzędzi (efekt uboczny: rejestracja w registry)
import "./tools/index.ts";

// 2. Import logiki protokołu
import { createMessageHandler } from "./mcp-server.ts";

// 3. Import transportów
import { createStdioServerTransport } from "./protocol/stdio-transport.ts";
import { createSseServerTransport } from "./protocol/sse-transport.ts";

import { getToolNames } from "./registry.ts";

// =============================================================================
// Parsowanie argumentów CLI
// =============================================================================

const args = process.argv.slice(2);
const useHttp = args.includes("--http");
const portArg = args.indexOf("--port");
const port = portArg >= 0 ? parseInt(args[portArg + 1] ?? "3001") : 3001;

// =============================================================================
// Startup
// =============================================================================

process.stderr.write(chalk.bold.cyan("=== AI-Devs MCP Tools Server ===\n"));
process.stderr.write(chalk.gray(`Transport: ${useHttp ? `HTTP/SSE (port ${port})` : "stdio"}\n`));
process.stderr.write(chalk.gray(`Zarejestrowane narzędzia: ${getToolNames().join(", ")}\n`));
process.stderr.write("\n");

// =============================================================================
// Uruchom serwer z wybranym transportem
// =============================================================================

const handler = createMessageHandler();

if (useHttp) {
  // ── Tryb HTTP/SSE ─────────────────────────────────────────────────────────
  //
  // Serwer nasłuchuje na HTTP. Klient łączy się przez SSE.
  // Użyj createMcpHttpClient("http://localhost:<port>") po stronie klienta.
  const transport = createSseServerTransport(port);
  await transport.listen(handler);
} else {
  // ── Tryb stdio ────────────────────────────────────────────────────────────
  //
  // Serwer czyta stdin i pisze do stdout.
  // Klient uruchamia ten process jako subprocess (Bun.spawn).
  // Użyj createMcpStdioClient("bun", ["run", "packages/mcp-tools/server.ts"])
  const transport = createStdioServerTransport();
  await transport.listen(handler);
}
