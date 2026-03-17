/**
 * @file stdio-transport.ts
 * @description Transport stdio dla serwera MCP (strona serwerowa).
 *
 * ## Co to jest transport stdio?
 *
 * W trybie stdio serwer MCP to normalny proces systemu operacyjnego.
 * Klient uruchamia go jako subprocess i komunikuje się przez standardowe
 * strumienie systemu operacyjnego:
 *
 *   stdin  ← JSON-RPC requests od klienta (linia po linii)
 *   stdout → JSON-RPC responses do klienta (linia po linii)
 *   stderr → logi i debug (tylko dla człowieka, nie jest częścią protokołu)
 *
 * ## Dlaczego stdio a nie HTTP?
 *
 * stdio jest prostsze i bezpieczniejsze dla narzędzi lokalnych:
 *   - Brak problemu z portami (nie trzeba zarządzać wolnymi portami)
 *   - Automatyczne zamknięcie gdy klient kończy działanie (OS zamyka pipe)
 *   - Brak problemów CORS, firewalli, autoryzacji
 *   - Proces narzędzi działa z uprawnieniami klienta
 *
 * ## Schemat komunikacji
 *
 * ```
 * Klient (np. agentLoop)           Serwer MCP (ten plik)
 *       │                                  │
 *       │── stdin ──→ {"jsonrpc":"2.0"...} │ listen() czyta stdin
 *       │                                  │ handler(message, send)
 *       │← stdout ←── {"jsonrpc":"2.0"...} │ send() pisze do stdout
 *       │                                  │
 * ```
 *
 * WAŻNE: Logi (chalk.gray itp.) muszą iść na stderr, NIGDY na stdout.
 * stdout jest zarezerwowany wyłącznie dla protokołu JSON-RPC.
 */

import { createLineReader } from "./line-reader.ts";
import type { JsonRpcMessage, MessageHandler } from "./types.ts";
import { JSONRPC_ERROR } from "./types.ts";

export type StdioServerTransport = {
  /**
   * Uruchamia pętlę nasłuchiwania na stdin.
   * Dla każdej odebranej wiadomości JSON-RPC wywołuje `handler`.
   * Zwraca gdy stdin zostanie zamknięty (klient zakończył działanie).
   */
  listen(handler: MessageHandler): Promise<void>;
};

/**
 * Tworzy transport stdio dla serwera MCP.
 *
 * Transport jest bezstanowy — nie przechowuje sesji.
 * W trybie stdio zawsze jest jeden klient (ten który uruchomił subprocess).
 */
export const createStdioServerTransport = (): StdioServerTransport => {
  /**
   * Funkcja wysyłająca odpowiedź do klienta przez stdout.
   *
   * Każda wiadomość to jedna linia JSON zakończona \n.
   * `process.stdout.write` jest synchroniczne w Bun — brak problemu
   * z przeplotem wiadomości przy równoległych wywołaniach.
   */
  const send = (message: JsonRpcMessage): void => {
    // Kompaktowy JSON (bez spacji) — minimalizuje transfer i upraszcza parsowanie
    process.stdout.write(JSON.stringify(message) + "\n");
  };

  const listen = async (handler: MessageHandler): Promise<void> => {
    // Informacja na stderr (nie zakłóca protokołu na stdout)
    process.stderr.write("[stdio] transport uruchomiony — nasłuchuję na stdin\n");

    const lineReader = createLineReader(Bun.stdin.stream());

    for await (const line of lineReader.lines()) {
      let message: JsonRpcMessage;

      // Próba parsowania JSON — błąd parsowania to błąd protokołu
      try {
        message = JSON.parse(line) as JsonRpcMessage;
      } catch {
        process.stderr.write(`[stdio] błąd parsowania JSON: ${line.slice(0, 100)}\n`);
        // Wysyłamy błąd protokołu. id=null bo nie wiadomo jakie id miał request.
        send({
          jsonrpc: "2.0",
          id: null as any,
          error: { code: JSONRPC_ERROR.PARSE_ERROR, message: "Parse error: invalid JSON" },
        });
        continue; // kontynuuj nasłuchiwanie — jeden błąd nie kończy sesji
      }

      // Handler wywołujemy asynchronicznie (nie await) żeby nie blokować
      // pętli odczytu przy długich operacjach (np. wywołanie zewnętrznego API).
      // Błędy z handlera logujemy na stderr.
      handler(message, send).catch((err) => {
        process.stderr.write(`[stdio] błąd handlera: ${err}\n`);
      });
    }

    process.stderr.write("[stdio] stdin zamknięty — transport zatrzymany\n");
  };

  return { listen };
};
