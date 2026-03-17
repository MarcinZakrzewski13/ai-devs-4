/**
 * @file mcp-client.ts
 * @description Klient MCP — łączy się z serwerem i udostępnia narzędzia jako AiTool[].
 *
 * ## Po co klient?
 *
 * Klient MCP to "most" między protokołem MCP a naszym agentem (agentLoop.ts).
 * Pozwala agentLoop używać narzędzi z serwera MCP bez wiedzy o protokole —
 * z zewnątrz wygląda to jak zwykła tablica AiTool[].
 *
 * ## Jak to działa?
 *
 * ```
 * agentLoop.ts
 *   ↓ importuje AiTool[] z
 * McpClient.listTools()
 *   ↓ wrappuje tools/call jako
 * AiTool.execute() → McpClient.callTool() → JSON-RPC tools/call
 *   ↓ przez transport
 * subprocess stdin/stdout (stdio) LUB HTTP POST (SSE)
 *   ↓ serwer MCP odpowiada
 * McpToolCallResult → ToolResult<T> (format ai-core)
 * ```
 *
 * ## Dwa tryby połączenia
 *
 * ### stdio (createMcpStdioClient)
 *
 * Klient uruchamia serwer jako subprocess i komunikuje się przez jego
 * stdin/stdout. Najprostszy tryb dla lokalnych narzędzi.
 *
 * ```typescript
 * const client = createMcpStdioClient("bun", ["run", "packages/mcp-tools/server.ts"]);
 * await client.connect();
 * const tools = await client.listTools();
 * // tools to AiTool[] — możesz przekazać wprost do agentLoop
 * await client.disconnect();
 * ```
 *
 * ### HTTP/SSE (createMcpHttpClient)
 *
 * Klient łączy się do działającego serwera HTTP. Używany gdy serwer
 * działa niezależnie (np. na innym porcie lub maszynie).
 *
 * ```typescript
 * const client = createMcpHttpClient("http://localhost:3001");
 * await client.connect(); // handshake przez POST /message
 * const tools = await client.listTools();
 * ```
 *
 * ## Zarządzanie pending requests
 *
 * JSON-RPC pozwala na wiele żądań "w locie" jednocześnie (każde z innym id).
 * Klient śledzi oczekujące żądania w mapie `pendingRequests`:
 *   - klucz: id żądania
 *   - wartość: {resolve, reject} z Promise
 *
 * Gdy odpowiedź nadejdzie (w pętli odczytu), dopasowujemy po id
 * i rozwiązujemy/odrzucamy odpowiedni Promise.
 */

import { createLineReader } from "./protocol/line-reader.ts";
import type {
  JsonRpcMessage,
  McpToolCallResult,
  McpToolsListResult,
} from "./protocol/types.ts";
import type { AiTool, ToolResult } from "@ai-devs/ai-core";

// =============================================================================
// Typy wspólne
// =============================================================================

export type McpClientOptions = {
  /** Timeout żądania w ms (domyślnie 30 000 = 30s) */
  timeoutMs?: number;
};

export type McpClient = {
  /** Nawiązuje połączenie i wykonuje MCP handshake (initialize) */
  connect(): Promise<void>;

  /**
   * Pobiera listę narzędzi z serwera i zwraca je jako AiTool[].
   * Każdy AiTool.execute() wysyła tools/call do serwera MCP.
   */
  listTools(): Promise<AiTool[]>;

  /**
   * Wywołuje konkretne narzędzie na serwerze MCP.
   * Zwraca McpToolCallResult (format MCP, z isError i content[]).
   */
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolCallResult>;

  /** Rozłącza się (zabija subprocess lub zamyka połączenie HTTP) */
  disconnect(): void;
};

// =============================================================================
// Helper: konwersja McpToolCallResult → ToolResult<T> (format @ai-devs/ai-core)
// =============================================================================

/**
 * Konwertuje wynik narzędzia MCP na format ToolResult używany przez agentLoop.
 *
 * MCP zwraca: { content: [{type: "text", text: "..."}], isError: bool }
 * ai-core chce: { ok: true, data: T } lub { ok: false, error: string }
 *
 * Próbujemy sparsować tekst jako JSON — jeśli się uda, `data` to obiekt.
 * Jeśli nie — `data` to surowy string.
 */
const mcpResultToToolResult = (mcpResult: McpToolCallResult): ToolResult<unknown> => {
  const text = mcpResult.content.map((c) => c.text).join("\n");

  if (mcpResult.isError) {
    return { ok: false, error: text };
  }

  // Próbujemy parsować JSON — surowe stringi zostają stringami
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: true, data: text };
  }
};

// =============================================================================
// Helper: generowanie unikalnych id dla żądań JSON-RPC
// =============================================================================

let nextId = 1;
const generateId = (): number => nextId++;

// =============================================================================
// Helper: oczekiwanie na odpowiedź z timeout
// =============================================================================

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

// =============================================================================
// stdio Client
// =============================================================================

/**
 * Tworzy klienta MCP komunikującego się z serwerem przez stdio (subprocess).
 *
 * @param command - komenda do uruchomienia serwera (np. "bun")
 * @param args    - argumenty komendy (np. ["run", "packages/mcp-tools/server.ts"])
 * @param options - opcje (timeout)
 */
export const createMcpStdioClient = (
  command: string,
  args: string[],
  options: McpClientOptions = {}
): McpClient => {
  const timeoutMs = options.timeoutMs ?? 30_000;

  // Subprocess serwera MCP — tworzony w connect()
  let proc: ReturnType<typeof Bun.spawn> | null = null;

  // Mapa oczekujących żądań: id → {resolve, reject, timer}
  const pending = new Map<number | string, PendingRequest>();

  /**
   * Wysyła żądanie JSON-RPC do serwera (przez subprocess stdin).
   * Zwraca Promise który resolwuje się gdy nadejdzie odpowiedź.
   */
  const request = <T>(method: string, params: unknown): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      if (!proc) {
        reject(new Error("MCP client not connected — call connect() first"));
        return;
      }

      const id = generateId();

      // Timeout — jeśli odpowiedź nie nadejdzie w timeoutMs, odrzucamy
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP request timeout: ${method} (id=${id})`));
      }, timeoutMs);

      pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      });

      // Wysyłamy żądanie do stdin subprocess
      const message = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      proc.stdin.write(message);
    });
  };

  /**
   * Wysyła notyfikację JSON-RPC (bez id, bez odpowiedzi).
   * Używana do `notifications/initialized` po handshake.
   */
  const notify = (method: string, params?: unknown): void => {
    if (!proc) return;
    const message = JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n";
    proc.stdin.write(message);
  };

  /**
   * Pętla odczytu odpowiedzi z stdout subprocess.
   * Działa w tle (nie jest awaited) — dopasowuje odpowiedzi do pending requests.
   */
  const startReadLoop = async (): Promise<void> => {
    if (!proc) return;

    const lineReader = createLineReader(proc.stdout as ReadableStream<Uint8Array>);

    for await (const line of lineReader.lines()) {
      let message: JsonRpcMessage;
      try {
        message = JSON.parse(line) as JsonRpcMessage;
      } catch {
        process.stderr.write(`[mcp-client] błąd parsowania odpowiedzi: ${line.slice(0, 100)}\n`);
        continue;
      }

      // Odpowiedź musi mieć id (żądania i notyfikacje nie mają result/error)
      if (!("id" in message)) continue;

      const id = (message as any).id as number | string;
      const pendingReq = pending.get(id);

      if (!pendingReq) {
        process.stderr.write(`[mcp-client] odpowiedź bez oczekującego żądania (id=${id})\n`);
        continue;
      }

      // Wyczyść timeout i usuń z mapy
      clearTimeout(pendingReq.timer);
      pending.delete(id);

      if ("error" in message) {
        // Błąd protokołu JSON-RPC
        pendingReq.reject(new Error(`MCP error: ${(message as any).error.message}`));
      } else {
        // Sukces
        pendingReq.resolve((message as any).result);
      }
    }

    process.stderr.write("[mcp-client] pętla odczytu zakończona — subprocess zamknięty\n");
  };

  // --------------------------------------------------------------------------
  // McpClient interface
  // --------------------------------------------------------------------------

  const connect = async (): Promise<void> => {
    process.stderr.write(`[mcp-client] uruchamiam serwer: ${command} ${args.join(" ")}\n`);

    // Uruchamiamy subprocess z pipe na stdin i stdout
    proc = Bun.spawn([command, ...args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "inherit", // logi serwera idą bezpośrednio do terminala
    });

    // Startujemy pętlę odczytu w tle (nie await — działa asynchronicznie)
    startReadLoop().catch((err) =>
      process.stderr.write(`[mcp-client] błąd pętli odczytu: ${err}\n`)
    );

    // Wykonaj handshake MCP: initialize
    process.stderr.write("[mcp-client] initialize handshake...\n");
    await request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "ai-devs-agent", version: "0.1.0" },
    });

    // Notyfikujemy serwer że klient jest gotowy (kończy handshake)
    notify("notifications/initialized");
    process.stderr.write("[mcp-client] połączono z serwerem MCP\n");
  };

  const listTools = async (): Promise<AiTool[]> => {
    const result = await request<McpToolsListResult>("tools/list", {});

    // Konwertujemy definicje MCP na AiTool — każdy AiTool.execute() = tools/call
    return result.tools.map((toolDef) => ({
      name: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,

      execute: async (args: unknown): Promise<ToolResult<unknown>> => {
        try {
          const mcpResult = await callTool(toolDef.name, args as Record<string, unknown>);
          return mcpResultToToolResult(mcpResult);
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      },
    }));
  };

  const callTool = async (
    name: string,
    args: Record<string, unknown>
  ): Promise<McpToolCallResult> => {
    return request<McpToolCallResult>("tools/call", { name, arguments: args });
  };

  const disconnect = (): void => {
    if (!proc) return;
    process.stderr.write("[mcp-client] rozłączam subprocess...\n");
    // Anuluj wszystkie oczekujące żądania
    for (const [id, req] of pending) {
      clearTimeout(req.timer);
      req.reject(new Error("MCP client disconnected"));
    }
    pending.clear();
    proc.kill();
    proc = null;
  };

  return { connect, listTools, callTool, disconnect };
};

// =============================================================================
// HTTP/SSE Client
// =============================================================================

/**
 * Tworzy klienta MCP komunikującego się z serwerem przez HTTP/SSE.
 *
 * Używaj gdy serwer MCP działa jako oddzielny proces HTTP
 * (uruchomiony z flagą `--http`).
 *
 * @param baseUrl - adres serwera MCP, np. "http://localhost:3001"
 * @param options - opcje (timeout)
 */
export const createMcpHttpClient = (
  baseUrl: string,
  options: McpClientOptions = {}
): McpClient => {
  const timeoutMs = options.timeoutMs ?? 30_000;

  // URL endpointu POST — otrzymujemy go z pierwszego zdarzenia SSE "endpoint"
  let messageEndpoint: string | null = null;

  // Mapa oczekujących żądań
  const pending = new Map<number | string, PendingRequest>();

  /**
   * Wysyła żądanie JSON-RPC przez HTTP POST.
   * Odpowiedź przyjdzie przez SSE stream (jest dispatched przez startSseListener).
   */
  const request = <T>(method: string, params: unknown): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      if (!messageEndpoint) {
        reject(new Error("MCP HTTP client not connected — call connect() first"));
        return;
      }

      const id = generateId();

      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`MCP HTTP request timeout: ${method} (id=${id})`));
      }, timeoutMs);

      pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      });

      // POST żądania do endpointu sesji
      const url = messageEndpoint.startsWith("http")
        ? messageEndpoint
        : `${baseUrl}${messageEndpoint}`;

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      }).catch((err) => {
        clearTimeout(timer);
        pending.delete(id);
        reject(new Error(`HTTP POST failed: ${err}`));
      });
    });
  };

  const notify = (method: string, params?: unknown): void => {
    if (!messageEndpoint) return;

    const url = messageEndpoint.startsWith("http")
      ? messageEndpoint
      : `${baseUrl}${messageEndpoint}`;

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method, params }),
    }).catch((err) =>
      process.stderr.write(`[mcp-http] błąd wysyłania notyfikacji: ${err}\n`)
    );
  };

  /**
   * Nasłuchuje zdarzeń SSE i dispatchuje odpowiedzi do pending requests.
   *
   * SSE stream działa przez cały czas połączenia — każda odpowiedź serwera
   * pojawia się tutaj jako zdarzenie `message` z danymi JSON-RPC.
   */
  const startSseListener = async (): Promise<void> => {
    process.stderr.write(`[mcp-http] łączę z SSE: ${baseUrl}/sse\n`);

    const response = await fetch(`${baseUrl}/sse`, {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE connect failed: ${response.status} ${response.statusText}`);
    }

    // Czytamy SSE stream linia po linii
    // Format SSE: "event: <type>\n" + "data: <payload>\n" + "\n"
    const lineReader = createLineReader(response.body as ReadableStream<Uint8Array>);

    let currentEvent = "";

    for await (const line of lineReader.lines()) {
      if (line.startsWith("event: ")) {
        // Typ zdarzenia
        currentEvent = line.slice("event: ".length).trim();
      } else if (line.startsWith("data: ")) {
        // Dane zdarzenia
        const data = line.slice("data: ".length).trim();

        if (currentEvent === "endpoint") {
          // Pierwsze zdarzenie SSE — URL endpointu POST
          messageEndpoint = data;
          process.stderr.write(`[mcp-http] endpoint do POSTowania: ${messageEndpoint}\n`);
        } else if (currentEvent === "message") {
          // Odpowiedź JSON-RPC od serwera
          try {
            const message = JSON.parse(data) as JsonRpcMessage;
            dispatchResponse(message);
          } catch {
            process.stderr.write(`[mcp-http] błąd parsowania SSE data: ${data.slice(0, 100)}\n`);
          }
        }

        currentEvent = ""; // reset po każdym data: (uproszczone SSE parsing)
      }
      // Pusta linia = separator zdarzeń SSE — ignorujemy
    }
  };

  /** Dispatchuje odpowiedź JSON-RPC do oczekującego żądania */
  const dispatchResponse = (message: JsonRpcMessage): void => {
    if (!("id" in message)) return;

    const id = (message as any).id as number | string;
    const pendingReq = pending.get(id);

    if (!pendingReq) {
      process.stderr.write(`[mcp-http] odpowiedź bez oczekującego żądania (id=${id})\n`);
      return;
    }

    clearTimeout(pendingReq.timer);
    pending.delete(id);

    if ("error" in message) {
      pendingReq.reject(new Error(`MCP error: ${(message as any).error.message}`));
    } else {
      pendingReq.resolve((message as any).result);
    }
  };

  // --------------------------------------------------------------------------
  // McpClient interface
  // --------------------------------------------------------------------------

  const connect = async (): Promise<void> => {
    // Startujemy listener SSE — nasłuchuje zdarzeń w tle
    // UWAGA: czekamy aż messageEndpoint zostanie ustawiony (przez zdarzenie "endpoint")
    const sseReady = new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (messageEndpoint !== null) {
          clearInterval(check);
          resolve();
        }
      }, 10);
    });

    // Listener SSE w tle (nie await — blokuje do zamknięcia strumienia)
    startSseListener().catch((err) =>
      process.stderr.write(`[mcp-http] błąd SSE listener: ${err}\n`)
    );

    // Czekaj aż SSE endpoint zostanie znany (max 10s)
    await Promise.race([
      sseReady,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("SSE endpoint timeout")), 10_000)
      ),
    ]);

    // Handshake
    process.stderr.write("[mcp-http] initialize handshake...\n");
    await request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "ai-devs-agent", version: "0.1.0" },
    });

    notify("notifications/initialized");
    process.stderr.write("[mcp-http] połączono z serwerem MCP przez HTTP/SSE\n");
  };

  const listTools = async (): Promise<AiTool[]> => {
    const result = await request<McpToolsListResult>("tools/list", {});

    return result.tools.map((toolDef) => ({
      name: toolDef.name,
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,

      execute: async (args: unknown): Promise<ToolResult<unknown>> => {
        try {
          const mcpResult = await callTool(toolDef.name, args as Record<string, unknown>);
          return mcpResultToToolResult(mcpResult);
        } catch (err) {
          return { ok: false, error: String(err) };
        }
      },
    }));
  };

  const callTool = async (
    name: string,
    args: Record<string, unknown>
  ): Promise<McpToolCallResult> => {
    return request<McpToolCallResult>("tools/call", { name, arguments: args });
  };

  const disconnect = (): void => {
    process.stderr.write("[mcp-http] rozłączam klienta HTTP...\n");
    for (const [, req] of pending) {
      clearTimeout(req.timer);
      req.reject(new Error("MCP HTTP client disconnected"));
    }
    pending.clear();
    messageEndpoint = null;
  };

  return { connect, listTools, callTool, disconnect };
};
