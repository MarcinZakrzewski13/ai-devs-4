/**
 * @file sse-transport.ts
 * @description Transport HTTP/SSE dla serwera MCP (strona serwerowa).
 *
 * ## Co to jest transport SSE?
 *
 * SSE (Server-Sent Events) to technologia HTTP pozwalająca serwerowi
 * na wysyłanie strumienia danych do klienta przez długotrwałe połączenie HTTP.
 * W odróżnieniu od WebSocket, SSE jest jednostronny: tylko serwer → klient.
 *
 * MCP używa SSE w hybrydowym schemacie:
 *   - Klient → Serwer: zwykłe POST żądania HTTP
 *   - Serwer → Klient: strumień SSE (stałe połączenie)
 *
 * ## Dlaczego SSE a nie WebSocket?
 *
 * SSE jest prostszy i działa "nad HTTP" (nie wymaga upgradeu protokołu).
 * Klient może być prostą aplikacją HTTP, przeglądarką, lub skryptem.
 * WebSocket wymaga obsługi WS handshake i ma inny API.
 *
 * ## Schemat komunikacji SSE
 *
 * ```
 * Klient                                      Serwer MCP
 *    │                                              │
 *    │── GET /sse ──────────────────────────────→   │ Otwiera SSE stream
 *    │                                              │
 *    │← event: endpoint ──────────────────────────  │ Serwer wysyła URL endpointu
 *    │  data: /message?sessionId=abc123             │ (pierwsze zdarzenie SSE)
 *    │                                              │
 *    │── POST /message?sessionId=abc123 ──────────→ │ Klient wysyła request
 *    │   body: {"jsonrpc":"2.0","id":1,...}         │
 *    │                                              │
 *    │← HTTP 202 Accepted ────────────────────────  │ Potwierdzenie przyjęcia
 *    │                                              │
 *    │← event: message ───────────────────────────  │ Serwer wysyła odpowiedź
 *    │  data: {"jsonrpc":"2.0","id":1,"result":{}}  │ przez SSE stream
 *    │                                              │
 * ```
 *
 * ## Format zdarzeń SSE
 *
 * SSE to proste zdarzenia tekstowe w formacie:
 * ```
 * event: <nazwa>\n
 * data: <dane>\n
 * \n
 * ```
 * Każde zdarzenie zakończone podwójną pustą linią (\n\n).
 *
 * MCP używa dwóch typów zdarzeń:
 *   - `endpoint`: jednorazowe, zawiera URL do POSTowania żądań
 *   - `message`: odpowiedź JSON-RPC od serwera
 *
 * ## Obsługa wielu klientów
 *
 * Transport SSE obsługuje wiele równoczesnych sesji.
 * Każda sesja GET /sse dostaje unikalny sessionId.
 * POST /message?sessionId=xxx trafia do odpowiedniej sesji.
 */

import chalk from "chalk";
import type { JsonRpcMessage, MessageHandler } from "./types.ts";
import { JSONRPC_ERROR } from "./types.ts";

export type SseServerTransport = {
  /** Uruchamia HTTP serwer i blokuje (nie zwraca) do zakończenia procesu */
  listen(handler: MessageHandler): Promise<void>;
  /** Port na którym nasłuchuje serwer */
  port: number;
};

/**
 * Formatuje zdarzenie SSE zgodnie z protokołem Server-Sent Events.
 *
 * Format (RFC 8895):
 *   event: <event-type>\n
 *   data: <payload>\n
 *   \n
 */
const formatSseEvent = (event: string, data: string): string =>
  `event: ${event}\ndata: ${data}\n\n`;

/**
 * Tworzy transport HTTP/SSE dla serwera MCP.
 *
 * @param port - port HTTP (domyślnie 3001; nie używaj 3000 — zajęty przez serwer S01E03)
 */
export const createSseServerTransport = (port = 3001): SseServerTransport => {
  const encoder = new TextEncoder();

  /**
   * Mapa aktywnych sesji SSE.
   * Klucz: sessionId (UUID)
   * Wartość: controller strumienia ReadableStream — pozwala pushować zdarzenia do klienta
   */
  const sessions = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

  /**
   * Wysyła wiadomość JSON-RPC do konkretnej sesji przez jej strumień SSE.
   * Jeśli sesja nie istnieje (klient rozłączył się) — loguje ostrzeżenie.
   */
  const sendToSession = (sessionId: string, message: JsonRpcMessage): void => {
    const controller = sessions.get(sessionId);
    if (!controller) {
      process.stderr.write(chalk.yellow(`[sse] brak sesji: ${sessionId} — klient rozłączony?\n`));
      return;
    }
    const sseEvent = formatSseEvent("message", JSON.stringify(message));
    controller.enqueue(encoder.encode(sseEvent));
  };

  const listen = async (handler: MessageHandler): Promise<void> => {
    process.stderr.write(chalk.cyan(`[sse] uruchamiam HTTP/SSE transport na porcie ${port}\n`));

    Bun.serve({
      port,

      async fetch(req) {
        const url = new URL(req.url);

        // =======================================================================
        // OPTIONS — preflight CORS
        // Przeglądarki i niektóre klienty wysyłają OPTIONS przed POST
        // =======================================================================
        if (req.method === "OPTIONS") {
          return new Response(null, {
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          });
        }

        // =======================================================================
        // GET /sse — klient otwiera stały strumień SSE
        //
        // Co tu się dzieje krok po kroku:
        // 1. Generujemy unikalny sessionId dla tego klienta
        // 2. Tworzymy ReadableStream z kontrolerem do pushowania zdarzeń
        // 3. Zapisujemy kontroler w mapie sessions (żeby POST /message mógł go znaleźć)
        // 4. Natychmiast wysyłamy zdarzenie `endpoint` z URL do POSTowania
        // 5. Zwracamy Response ze streamem — połączenie pozostaje otwarte
        // =======================================================================
        if (req.method === "GET" && url.pathname === "/sse") {
          const sessionId = crypto.randomUUID();
          process.stderr.write(chalk.gray(`[sse] nowa sesja: ${sessionId}\n`));

          // ReadableStream z "pull" kontrolerem — my pushujemy dane, klient odbiera
          let sessionController: ReadableStreamDefaultController<Uint8Array>;

          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              // Zapisujemy kontroler PRZED wysłaniem response
              sessionController = controller;
              sessions.set(sessionId, controller);

              // Zdarzenie `endpoint` — PIERWSZA i kluczowa wiadomość SSE.
              // Klient MUSI to odebrać zanim wyśle jakiekolwiek żądanie.
              // Bez tego nie wie na jaki URL POSTować.
              const endpointUrl = `/message?sessionId=${sessionId}`;
              const endpointEvent = formatSseEvent("endpoint", endpointUrl);
              controller.enqueue(encoder.encode(endpointEvent));

              process.stderr.write(chalk.gray(`[sse] wysłano endpoint: ${endpointUrl}\n`));
            },

            cancel() {
              // Klient rozłączył się (zamknął kartę, zabił proces, timeout)
              sessions.delete(sessionId);
              process.stderr.write(chalk.gray(`[sse] sesja zamknięta: ${sessionId}\n`));
            },
          });

          return new Response(stream, {
            headers: {
              // WYMAGANE nagłówki dla SSE
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "Connection": "keep-alive",
              // CORS — pozwól klientom z innych origin łączyć się
              "Access-Control-Allow-Origin": "*",
              // X-Accel-Buffering: no — wyłącza buforowanie w nginx/caddy
              // (ważne na produkcji — bez tego zdarzenia SSE będą opóźnione)
              "X-Accel-Buffering": "no",
            },
          });
        }

        // =======================================================================
        // POST /message?sessionId=xxx — klient wysyła żądanie JSON-RPC
        //
        // Co tu się dzieje:
        // 1. Wyciągamy sessionId z query param
        // 2. Sprawdzamy czy sesja SSE istnieje (klient musi być połączony)
        // 3. Parsujemy body JSON jako JsonRpcMessage
        // 4. Tworzymy send() zamknięty na sessionId — wysyła odpowiedź przez SSE
        // 5. Przekazujemy do handlera (fire-and-forget — odpowiedź przez SSE)
        // 6. Zwracamy 202 Accepted — odpowiedź przyjdzie asynchronicznie przez SSE
        // =======================================================================
        if (req.method === "POST" && url.pathname === "/message") {
          const sessionId = url.searchParams.get("sessionId");

          if (!sessionId || !sessions.has(sessionId)) {
            return new Response(
              JSON.stringify({ error: "Unknown session — connect to /sse first" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          let message: JsonRpcMessage;
          try {
            message = (await req.json()) as JsonRpcMessage;
          } catch {
            // Błąd parsowania — wysyłamy błąd przez SSE (session istnieje)
            sendToSession(sessionId, {
              jsonrpc: "2.0",
              id: null as any,
              error: { code: JSONRPC_ERROR.PARSE_ERROR, message: "Parse error: invalid JSON" },
            });
            return new Response(null, { status: 202 });
          }

          process.stderr.write(
            chalk.gray(`[sse] request [${sessionId.slice(0, 8)}]: ${JSON.stringify(message).slice(0, 100)}\n`)
          );

          // send() zamknięty na sessionId — handler wywołuje go żeby odesłać odpowiedź
          const send = (response: JsonRpcMessage) => sendToSession(sessionId, response);

          // Fire-and-forget z obsługą błędów
          handler(message, send).catch((err) => {
            process.stderr.write(chalk.red(`[sse] błąd handlera: ${err}\n`));
            // Informujemy klienta o błędzie przez SSE
            if ("id" in message && message.id !== undefined) {
              sendToSession(sessionId, {
                jsonrpc: "2.0",
                id: (message as any).id,
                error: { code: JSONRPC_ERROR.INTERNAL_ERROR, message: String(err) },
              });
            }
          });

          // 202 Accepted — HTTP odpowiedź nie zawiera rezultatu (idzie przez SSE)
          return new Response(null, {
            status: 202,
            headers: { "Access-Control-Allow-Origin": "*" },
          });
        }

        // =======================================================================
        // Endpoint informacyjny — GET / — pokazuje status serwera
        // =======================================================================
        if (req.method === "GET" && url.pathname === "/") {
          return new Response(
            JSON.stringify({
              server: "ai-devs-mcp-tools",
              transport: "HTTP/SSE",
              sessions: sessions.size,
              endpoints: {
                sse:  `GET  http://localhost:${port}/sse`,
                post: `POST http://localhost:${port}/message?sessionId=<id>`,
              },
            }, null, 2),
            { headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response("Not Found", { status: 404 });
      },
    });

    process.stderr.write(chalk.green(`[sse] serwer HTTP/SSE gotowy na porcie ${port}\n`));
    process.stderr.write(chalk.green(`[sse]   SSE:   GET  http://localhost:${port}/sse\n`));
    process.stderr.write(chalk.green(`[sse]   POST:  POST http://localhost:${port}/message?sessionId=<id>\n`));
    process.stderr.write(chalk.green(`[sse]   Info:  GET  http://localhost:${port}/\n`));

    // listen() nigdy nie zwraca — serwer działa do zakończenia procesu
    await new Promise<void>(() => {});
  };

  return { listen, port };
};
