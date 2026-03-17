/**
 * @file mcp-server.ts
 * @description Logika protokołu MCP — obsługa wiadomości JSON-RPC.
 *
 * ## Odpowiedzialność tego modułu
 *
 * McpServer to "serce" serwera — implementuje protokół MCP niezależnie od transportu.
 * Nie wie czy jest uruchomiony w trybie stdio czy HTTP/SSE.
 * Otrzymuje wiadomość JSON-RPC + funkcję `send` → interpretuje i odpowiada.
 *
 * ## Separacja odpowiedzialności
 *
 * ```
 * stdio-transport.ts  ─┐
 *                       ├─→ mcp-server.ts (protokół) ─→ registry.ts (narzędzia)
 * sse-transport.ts    ─┘
 * ```
 *
 * Transport zajmuje się I/O (czytanie/pisanie bajtów).
 * McpServer zajmuje się protokołem (rozumienie i odpowiadanie na metody MCP).
 * Registry zajmuje się narzędziami (rejestracja i wyszukiwanie).
 *
 * ## Obsługiwane metody MCP
 *
 * - `initialize`               — handshake, wymiana capabilities
 * - `notifications/initialized`— klient potwierdza zakończenie handshake
 * - `tools/list`               — zwraca listę dostępnych narzędzi
 * - `tools/call`               — wykonuje narzędzie i zwraca wynik
 * - `ping`                     — health check
 *
 * ## Bezstanowość handlera
 *
 * `createMessageHandler()` zwraca bezstanową funkcję handlera.
 * Można ją współdzielić między sesjami (SSE: wiele klientów jednocześnie).
 * Stan sesji (jeśli potrzebny) powinien być zarządzany przez transport lub rejestr.
 */

import chalk from "chalk";
import {
  JSONRPC_ERROR,
  type JsonRpcMessage,
  type JsonRpcRequest,
  type McpInitializeParams,
  type McpToolCallParams,
  type MessageHandler,
  type SendFn,
} from "./protocol/types.ts";
import { getAllTools, getTool, getToolNames } from "./registry.ts";

/** Stałe identyfikujące ten serwer MCP */
const SERVER_INFO = {
  name: "ai-devs-mcp-tools",
  version: "0.1.0",
} as const;

/**
 * Wersja protokołu MCP którą implementuje ten serwer.
 * Klient podaje swoją wersję w `initialize` — serwer odpowiada tą samą.
 * W przyszłości można dodać negocjację wersji.
 */
const PROTOCOL_VERSION = "2024-11-05";

/**
 * Tworzy bezstanowy handler wiadomości MCP.
 *
 * Zwracana funkcja (MessageHandler) może być bezpiecznie wywołana współbieżnie
 * z różnymi wiadomościami — nie współdzieli stanu między wywołaniami.
 *
 * @returns MessageHandler — funkcja (message, send) => Promise<void>
 */
export const createMessageHandler = (): MessageHandler => {
  /**
   * Wysyła odpowiedź sukces JSON-RPC.
   *
   * `id` z żądania MUSI pojawić się w odpowiedzi — to jedyny sposób
   * żeby klient skojarył odpowiedź z konkretnym żądaniem (szczególnie
   * gdy wiele żądań jest w locie jednocześnie).
   */
  const reply = (send: SendFn, id: string | number, result: unknown): void => {
    send({ jsonrpc: "2.0", id, result });
  };

  /**
   * Wysyła odpowiedź błędu JSON-RPC.
   *
   * Różnica od błędu narzędzia (`isError: true` w result):
   *   - Błąd JSON-RPC: coś poszło nie tak na poziomie PROTOKOŁU
   *     (nieznana metoda, błąd parsowania, nieprawidłowe parametry)
   *   - Błąd narzędzia (`isError: true`): narzędzie wykonało się,
   *     ale zwróciło błąd aplikacyjny (np. "paczka nie istnieje")
   *     LLM może zareagować na błąd narzędzia — na błąd protokołu nie może.
   */
  const replyError = (
    send: SendFn,
    id: string | number | null,
    code: number,
    message: string
  ): void => {
    send({
      jsonrpc: "2.0",
      id: id as any, // null jest dozwolone dla błędów parsowania
      error: { code, message },
    });
  };

  /**
   * Obsługuje żądania (wiadomości z `id`, które oczekują odpowiedzi).
   * Switch po metodzie MCP.
   */
  const handleRequest = async (req: JsonRpcRequest, send: SendFn): Promise<void> => {
    process.stderr.write(chalk.blue(`[mcp] → ${req.method} (id=${req.id})\n`));

    switch (req.method) {
      // -----------------------------------------------------------------------
      // initialize — handshake z klientem
      //
      // Klient wysyła: kto jestem + co obsługuję (capabilities)
      // Serwer odpowiada: kto ja jestem + co obsługuję
      //
      // To ZAWSZE pierwsza wiadomość w sesji MCP.
      // -----------------------------------------------------------------------
      case "initialize": {
        const params = req.params as McpInitializeParams;
        process.stderr.write(
          chalk.gray(
            `[mcp] klient: ${params.clientInfo.name} v${params.clientInfo.version}, ` +
            `protokół: ${params.protocolVersion}\n`
          )
        );

        reply(send, req.id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            // Deklarujemy że obsługujemy tools/list i tools/call
            tools: {},
            // Nie deklarujemy resources i prompts — nie implementujemy ich
          },
          serverInfo: SERVER_INFO,
        });
        break;
      }

      // -----------------------------------------------------------------------
      // tools/list — lista dostępnych narzędzi
      //
      // Klient pyta "co umiesz?". Odpowiadamy listą narzędzi z rejestru.
      // LLM użyje tych definicji (name, description, inputSchema) żeby wiedzieć
      // kiedy i jak wywołać narzędzie.
      // -----------------------------------------------------------------------
      case "tools/list": {
        const tools = getAllTools().map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        }));

        process.stderr.write(
          chalk.gray(`[mcp] tools/list → ${tools.length} narzędzi: ${getToolNames().join(", ")}\n`)
        );

        reply(send, req.id, { tools });
        break;
      }

      // -----------------------------------------------------------------------
      // tools/call — wywołanie narzędzia
      //
      // Klient (agent/LLM) chce wykonać konkretne narzędzie z podanymi argumentami.
      // Serwer szuka narzędzia w rejestrze, wywołuje execute(), zwraca wynik.
      //
      // WAŻNE: błąd aplikacyjny narzędzia NIE jest błędem protokołu.
      // Zwracamy go jako isError: true w result (nie w error).
      // -----------------------------------------------------------------------
      case "tools/call": {
        const params = req.params as McpToolCallParams;
        process.stderr.write(
          chalk.yellow(
            `[mcp] tools/call: ${params.name}(${JSON.stringify(params.arguments).slice(0, 80)})\n`
          )
        );

        const tool = getTool(params.name);
        if (!tool) {
          // Nieznane narzędzie — to błąd protokołu (METHOD_NOT_FOUND)
          replyError(send, req.id, JSONRPC_ERROR.METHOD_NOT_FOUND, `Unknown tool: ${params.name}`);
          return;
        }

        // Wykonujemy narzędzie — błędy execute() łapiemy i zwracamy jako isError
        let result;
        try {
          result = await tool.execute(params.arguments);
        } catch (err) {
          // Nieoczekiwany błąd w execute() — zwracamy jako błąd narzędzia
          result = {
            content: [{ type: "text" as const, text: `Tool execution error: ${String(err)}` }],
            isError: true,
          };
        }

        process.stderr.write(
          chalk.gray(
            `[mcp] wynik ${params.name}: isError=${result.isError}, ` +
            `text="${result.content[0]?.text?.slice(0, 60)}..."\n`
          )
        );

        reply(send, req.id, result);
        break;
      }

      // -----------------------------------------------------------------------
      // ping — health check
      //
      // Opcjonalne, ale przydatne do sprawdzenia czy serwer żyje.
      // Odpowiadamy pustym obiektem — zgodnie ze spec MCP.
      // -----------------------------------------------------------------------
      case "ping": {
        reply(send, req.id, {});
        break;
      }

      // -----------------------------------------------------------------------
      // Nieznana metoda
      // -----------------------------------------------------------------------
      default: {
        process.stderr.write(chalk.yellow(`[mcp] nieznana metoda: ${req.method}\n`));
        replyError(
          send,
          req.id,
          JSONRPC_ERROR.METHOD_NOT_FOUND,
          `Method not found: ${req.method}`
        );
      }
    }
  };

  /**
   * Obsługuje notyfikacje (wiadomości BEZ `id`, nie wymagają odpowiedzi).
   *
   * Zgodnie ze spec JSON-RPC: notyfikacje to "ogień i zapomnij" ze strony klienta.
   * Serwer może je ignorować lub reagować, ale NIE odpowiada.
   */
  const handleNotification = (notification: { method: string; params?: unknown }): void => {
    process.stderr.write(chalk.gray(`[mcp] notyfikacja: ${notification.method}\n`));

    switch (notification.method) {
      case "notifications/initialized":
        // Klient zakończył handshake — od tej chwili sesja jest "live"
        // Serwer może tutaj zalogować start sesji lub inicjalizować zasoby sesji
        process.stderr.write(chalk.green("[mcp] klient gotowy — sesja aktywna\n"));
        break;

      case "notifications/cancelled":
        // Klient anulował poprzednie żądanie (po id z params)
        // W tej implementacji ignorujemy — wywołane tools/call dobiegnie końca
        process.stderr.write(chalk.gray("[mcp] klient anulował żądanie (ignoruję)\n"));
        break;

      default:
        // Nieznane notyfikacje ignorujemy zgodnie ze spec MCP
        // (specyfikacja może dodać nowe notyfikacje w przyszłości)
        break;
    }
  };

  /**
   * Główny handler — wywoływany przez transport dla każdej przychodzącej wiadomości.
   *
   * Rozróżnia żądania od notyfikacji po obecności pola `id`:
   *   - Żądanie: ma `id` → oczekuje odpowiedzi → handleRequest()
   *   - Notyfikacja: brak `id` → bez odpowiedzi → handleNotification()
   *   - Odpowiedź (result/error): serwer nie wysyła żądań do klienta
   *     w tej implementacji, więc te wiadomości są nieoczekiwane
   */
  return async (message: JsonRpcMessage, send: SendFn): Promise<void> => {
    // Sprawdź czy to odpowiedź (result lub error z id) — serwer ich nie oczekuje
    if ("result" in message || ("error" in message && "id" in message)) {
      process.stderr.write(
        chalk.yellow(`[mcp] nieoczekiwana odpowiedź od klienta: ${JSON.stringify(message).slice(0, 80)}\n`)
      );
      return;
    }

    // Notyfikacja: ma `method` ale NIE ma `id`
    if (!("id" in message)) {
      handleNotification(message as any);
      return;
    }

    // Żądanie: ma `method` i `id`
    const req = message as JsonRpcRequest;
    try {
      await handleRequest(req, send);
    } catch (err) {
      process.stderr.write(chalk.red(`[mcp] błąd obsługi ${req.method}: ${err}\n`));
      send({
        jsonrpc: "2.0",
        id: req.id,
        error: { code: JSONRPC_ERROR.INTERNAL_ERROR, message: String(err) },
      });
    }
  };
};
