/**
 * @file types.ts
 * @description Typy protokołu MCP (Model Context Protocol) i JSON-RPC 2.0.
 *
 * ## Co to jest MCP?
 *
 * MCP (Model Context Protocol) to otwarty protokół opracowany przez Anthropic,
 * który standaryzuje komunikację między klientami AI (np. Claude Desktop, agentami)
 * a serwerami dostarczającymi narzędzia, zasoby i szablony promptów.
 *
 * Analogia: MCP to "USB dla AI" — jeden standard podłączania dowolnych narzędzi
 * do dowolnego klienta AI bez pisania dedykowanych integracji.
 *
 * ## Warstwa transportowa: JSON-RPC 2.0
 *
 * MCP używa JSON-RPC 2.0 jako warstwy transportowej. JSON-RPC to lekki protokół
 * wywołań zdalnych (RPC) przez JSON, gdzie każda wiadomość to obiekt JSON z polami:
 *   - `jsonrpc`: zawsze "2.0" (wersja protokołu)
 *   - `id`: identyfikator żądania (string lub liczba) — odpowiedź musi mieć to samo id
 *   - `method`: nazwa wywoływanej metody (np. "tools/list", "tools/call")
 *   - `params`: opcjonalne parametry metody (obiekt lub tablica)
 *
 * Rodzaje wiadomości JSON-RPC:
 *   - Request: ma `id` i `method` → oczekuje odpowiedzi
 *   - Notification: ma `method` BEZ `id` → jednostronna, bez odpowiedzi
 *   - Response (Success): ma `id` i `result`
 *   - Response (Error): ma `id` i `error`
 *
 * Dokumentacja MCP: https://modelcontextprotocol.io/docs/specification
 * Dokumentacja JSON-RPC 2.0: https://www.jsonrpc.org/specification
 */

// =============================================================================
// JSON-RPC 2.0 — warstwa transportowa
// =============================================================================

/** ID żądania — string lub liczba całkowita. Musi być unikalne w danej sesji. */
export type JsonRpcId = string | number;

/**
 * Żądanie JSON-RPC — klient oczekuje odpowiedzi od serwera.
 * Pole `id` jest WYMAGANE — serwer musi je powtórzyć w odpowiedzi.
 */
export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

/**
 * Notyfikacja JSON-RPC — jednostronna wiadomość, serwer NIE odpowiada.
 * Identyczna strukturalnie jak Request, ale BEZ pola `id`.
 *
 * Przykład w MCP: `notifications/initialized` — klient informuje serwer,
 * że zakończył handshake i jest gotowy do pracy.
 */
export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  // Celowo bez `id` — to odróżnia notyfikację od żądania
};

/** Odpowiedź sukces JSON-RPC — `result` zawiera dane zwrotne metody */
export type JsonRpcSuccess = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
};

/**
 * Odpowiedź błędu JSON-RPC.
 * `id` może być null gdy błąd wystąpił przed parsowaniem żądania
 * (np. błąd parsowania JSON — nie wiadomo jakie id miał request).
 */
export type JsonRpcError = {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  error: {
    code: number;    // standardowy kod błędu z zakresu -32768 do -32000
    message: string; // opis błędu
    data?: unknown;  // opcjonalne dodatkowe dane (stack trace, szczegóły)
  };
};

/** Unia wszystkich możliwych typów wiadomości JSON-RPC */
export type JsonRpcMessage =
  | JsonRpcRequest
  | JsonRpcNotification
  | JsonRpcSuccess
  | JsonRpcError;

/**
 * Standardowe kody błędów JSON-RPC 2.0.
 * Zakres -32768 do -32000 jest zarezerwowany przez specyfikację JSON-RPC.
 * Aplikacje mogą definiować własne kody poza tym zakresem.
 */
export const JSONRPC_ERROR = {
  PARSE_ERROR:      -32700, // nieprawidłowy JSON — nie można sparsować wiadomości
  INVALID_REQUEST:  -32600, // poprawny JSON, ale nieprawidłowy format żądania
  METHOD_NOT_FOUND: -32601, // wywołana metoda nie istnieje
  INVALID_PARAMS:   -32602, // nieprawidłowe parametry metody
  INTERNAL_ERROR:   -32603, // wewnętrzny błąd serwera
} as const;

// =============================================================================
// MCP — warstwa protokołu wyższego poziomu (nad JSON-RPC)
// =============================================================================

/** Informacje identyfikujące serwer MCP (zwracane w odpowiedzi na initialize) */
export type McpServerInfo = {
  name: string;    // np. "ai-devs-mcp-tools"
  version: string; // np. "0.1.0"
};

/**
 * Możliwości (capabilities) serwera lub klienta MCP.
 * Każdy klucz sygnalizuje obsługę danej grupy funkcji protokołu.
 *
 * Obecna implementacja wspiera tylko `tools`. Protokół MCP ewoluuje —
 * w przyszłości mogą pojawić się: resources (pliki, bazy danych),
 * prompts (szablony), sampling (prośba do klienta o wywołanie LLM).
 *
 * Puste obiekty `{}` to celowy wybór specyfikacji MCP — obecność klucza
 * sygnalizuje wsparcie, a w przyszłości obiekt może zawierać konfigurację.
 */
export type McpCapabilities = {
  tools?: Record<string, never>;     // obsługuje tools/list i tools/call
  resources?: Record<string, never>; // (przyszłość) listowanie i czytanie zasobów
  prompts?: Record<string, never>;   // (przyszłość) szablony promptów
};

/**
 * Parametry żądania `initialize` — PIERWSZA wiadomość wysyłana przez klienta.
 * Klient przedstawia się i informuje o swoich możliwościach.
 * Serwer odpowiada własnymi możliwościami — obydwie strony "negocjują" protokół.
 */
export type McpInitializeParams = {
  protocolVersion: string;      // wersja protokołu MCP, np. "2024-11-05"
  capabilities: McpCapabilities;
  clientInfo: {
    name: string;    // np. "claude-desktop", "ai-devs-agent"
    version: string; // np. "1.0.0"
  };
};

/** Odpowiedź serwera na `initialize` */
export type McpInitializeResult = {
  protocolVersion: string;
  capabilities: McpCapabilities;
  serverInfo: McpServerInfo;
};

/**
 * Definicja narzędzia MCP — to co serwer zwraca w odpowiedzi na `tools/list`.
 *
 * Format `inputSchema` to JSON Schema (draft 7) — ten sam standard co
 * OpenAI function calling. Dzięki temu LLM wie jak wywołać narzędzie.
 */
export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema: type, properties, required, ...
};

/** Odpowiedź na `tools/list` */
export type McpToolsListResult = {
  tools: McpToolDefinition[];
};

/** Parametry `tools/call` — klient chce wywołać konkretne narzędzie */
export type McpToolCallParams = {
  name: string;
  arguments: Record<string, unknown>;
};

/**
 * Pojedynczy element treści wyniku narzędzia.
 * MCP obsługuje różne typy treści — implementujemy `text`.
 *
 * W pełnym protokole MCP istnieją też:
 *   - `image`: obraz w formacie base64
 *   - `resource`: odwołanie do zasobu serwera
 */
export type McpTextContent = {
  type: "text";
  text: string;
};

/**
 * Odpowiedź na `tools/call`.
 *
 * Ważna różnica:
 *   - `isError: true` → narzędzie wykonało się, ale zwróciło błąd aplikacyjny
 *     (np. "paczka nie istnieje"). To NIE jest błąd protokołu JSON-RPC.
 *   - błąd JSON-RPC (pole `error`) → coś poszło nie tak na poziomie protokołu
 *     (np. nieznana metoda, błąd parsowania)
 *
 * LLM widzi `isError: true` w `content` i może poinformować użytkownika
 * o problemie zamiast crashować cały przepływ.
 */
export type McpToolCallResult = {
  content: McpTextContent[];
  isError?: boolean;
};

// =============================================================================
// Typy wewnętrzne serwera MCP
// =============================================================================

/**
 * Narzędzie rejestrowane w serwerze MCP.
 * Rozszerza publiczną definicję (widoczną dla klienta) o funkcję `execute`
 * zawierającą faktyczną logikę biznesową.
 */
export type McpTool = McpToolDefinition & {
  execute(args: Record<string, unknown>): Promise<McpToolCallResult>;
};

/**
 * Funkcja wysyłająca odpowiedź JSON-RPC do klienta.
 * Transporty (stdio, SSE) dostarczają konkretne implementacje tej funkcji.
 */
export type SendFn = (message: JsonRpcMessage) => void;

/**
 * Handler wiadomości — wywoływany przez transport dla każdej przychodzącej wiadomości.
 * Otrzymuje wiadomość ORAZ funkcję `send` do odesłania odpowiedzi.
 *
 * Dlaczego `send` jest parametrem a nie globalną funkcją?
 * W transporcie SSE każda sesja ma własny strumień SSE — `send` musi być
 * przypisany do konkretnej sesji. Przekazanie `send` jako parametru sprawia,
 * że handler jest bezstanowy i można go współdzielić między sesjami.
 */
export type MessageHandler = (message: JsonRpcMessage, send: SendFn) => Promise<void>;

// =============================================================================
// Helpersy — skrócone tworzenie wyników narzędzi
// =============================================================================

/** Tworzy wynik sukcesu narzędzia z tekstem (serializuje obiekty do JSON) */
export const mcpOk = (data: unknown): McpToolCallResult => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data) }],
  isError: false,
});

/** Tworzy wynik błędu narzędzia (isError=true — błąd aplikacyjny, nie protokołu) */
export const mcpErr = (error: string): McpToolCallResult => ({
  content: [{ type: "text", text: error }],
  isError: true,
});
