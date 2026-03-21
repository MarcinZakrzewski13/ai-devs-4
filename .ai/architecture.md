# Architecture

## Charakter projektu

Workspace do rozwiązywania zadań praktycznych z kursu **AI_Devs 4 Builder**.
Każde zadanie polega na napisaniu skryptu TypeScript, który przetwarza dane przy pomocy LLM i wysyła odpowiedź do Centrali (`https://hub.ag3nts.org`). Poprawna odpowiedź zwraca flagę w formacie `{FLG:NAZWA}`, którą wpisuje się na stronie hubu.

## Struktura projektu

```
ai-devs-4/
├── .ai/                          # Dokumentacja architektury
│   ├── architecture.md           # Ten plik
│   ├── tasks-index.md            # Indeks zadań kursowych (task.md + solution.md)
│   ├── ai-devs-4-builders.md     # Przegląd materiałów lekcyjnych kursu
│   ├── adr/                      # Architecture Decision Records
│   ├── decision-log/             # Lekkie meta-decyzje
│   └── rules/
│       └── general.md            # Reguły dla asystentów AI
├── packages/                     # Monorepo — reużywalne pakiety (Bun workspaces)
│   ├── ai-core/                  # Kernel AI: model, prompts, tools, obs
│   │   ├── model/                # ModelProvider interface + OpenAI adapter + schema helpers
│   │   ├── prompts/              # PromptAsset<TVars> + file-loader
│   │   ├── tools/                # AiTool<TArgs,TResult> + ToolRegistry
│   │   └── obs/                  # logger, EventBus, RunReport
│   └── ai-devs-hub/              # Komunikacja z Centralą + persystencja odpowiedzi
│       ├── verify.ts             # sendAnswer()
│       ├── answer-store.ts       # saveTmpAnswer(), saveFinalAnswer()
│       ├── answer-loader.ts      # loadFinalAnswer(), loadAllFinalAnswers()
│       └── types.ts              # AiDevsResponse, FinalAnswerFile
├── .cursor/rules/                # Reguły Cursor IDE
├── lessons/
│   ├── answers/                  # Wyniki zadań (gitignored — nie publikować)
│   │   ├── tmp/                  # Efemeryczne
│   │   └── final/                # Kanoniczne (cross-episode deps, bez apikey)
│   ├── ts/                       # Rozwiązania w TypeScript (główne)
│   │   ├── toolset/              # [DEPRECATED] Stare biblioteki — nie usuwać, nie rozszerzać
│   │   │   ├── ai-devs.ts        # → zastąpiony przez @ai-devs/ai-devs-hub
│   │   │   ├── save-answer.ts    # → zastąpiony przez @ai-devs/ai-devs-hub
│   │   │   ├── prompts/          # Szablony promptów
│   │   │   └── scripts/          # Skrypty pomocnicze
│   │   ├── S01/E01/              # Rozwiązania modułowe (wg ADR-001)
│   │   └── resources/            # Dane lokalne do lekcji
│   ├── py/                       # Rozwiązania w Pythonie (jeśli potrzebne)
│   └── txt/                      # Symlink → E:\devel\AI-Devs\AI-Devs-4-Builders\lekcje
│                                 # Materiały lekcji (ignorowane przez git)
├── .env                          # Klucze API (ignorowany przez git)
├── .env.example                  # Szablon zmiennych środowiskowych
├── package.json                  # Zależności + workspaces: ["packages/*"]
└── tsconfig.json                 # Konfiguracja TypeScript + paths dla @ai-devs/*
```

## Struktura zadań — konwencja katalogów

Każde zadanie ma własny podkatalog w `lessons/ts/S{sezon}/E{epizod}/`:

```
lessons/ts/
├── S01/
│   ├── E01/
│   │   ├── main.ts              # orkiestrator — import i wywołanie kroków
│   │   ├── types.ts             # wszystkie typy zadania
│   │   ├── loadPeople.ts        # I/O i parsowanie danych wejściowych
│   │   ├── filterCandidates.ts  # filtracja deterministyczna
│   │   ├── classifyJobs.ts      # integracja z LLM (Structured Output)
│   │   ├── buildAnswer.ts       # transformacja danych → payload odpowiedzi
│   │   └── verifyAnswer.ts      # wysyłka + logowanie wyniku
│   └── E02/
│       └── ...
└── toolset/                     # biblioteki reużywalne (wspólne dla wszystkich zadań)
```

**Zasady podziału:**
- `main.ts` — wyłącznie orkiestracja: import kroków, wywołanie w kolejności, zero logiki biznesowej
- każdy moduł eksportuje **jedną funkcję** i robi **jedną rzecz**
- moduły filtrowania i transformacji danych to **czyste funkcje** (bez efektów ubocznych) — łatwe do przetestowania
- integracja z LLM izolowana w osobnym module (`classifyJobs.ts` itp.)
- typy współdzielone przez moduły zadania żyją w `types.ts`

**Przepływ danych (przykład S01E01):**
```
CSV → loadPeople() → PersonRecord[]
    → filterCandidates() → PersonRecord[]
    → classifyJobs() → Map<id, string[]>
    → buildAnswer() → PersonAnswer[]
    → verifyAnswer() → AiDevsResponse
```

## Zadania HTTP — serwery proxy/webhook

Zadania wymagające wystawienia publicznego endpointu (np. S01E03 proxy) uruchamiają `Bun.serve` i rejestrują URL w Centrali.

**Wzorzec modułów:**
```
types.ts          — typy żądań/odpowiedzi + typy wiadomości sesji
sessionStore.ts   — in-memory Map<sessionID, SessionMessage[]>
sessionLogger.ts  — zapis konwersacji na dysk (JSONL, folder per run)
packageApi.ts     — surowe wywołania zewnętrznego API
tools.ts          — AiTool wrappery (z hardcode overrides jeśli potrzeba)
systemPrompt.ts   — buildSystemPrompt()
agentLoop.ts      — pętla tool-call z rawMessages as any (max N iteracji)
handleRequest.ts  — glue: HTTP ↔ agentLoop ↔ sessionStore ↔ sessionLogger
main.ts           — Bun.serve + rejestracja endpointu w Centrali
```

**Session logging:**
- Przy starcie serwera tworzony jest katalog `sessions/S{s}E{e}-YYYYMMDD-HHMM/`
- Każda sesja (`sessionID`) zapisywana jest do osobnego pliku `{sessionID}.jsonl`
- Format: jeden JSON per linia `{ timestamp, sessionID, user, assistant }`
- Ułatwia debugowanie bez konieczności czytania logów terminala
- Każdy restart serwera tworzy nowy katalog z timestampem

**Detekcja flag:**
- `handleRequest.ts` skanuje każdą przychodzącą wiadomość pod kątem `{FLG:...}`
- Wykryta flaga logowana z `chalk.bgGreen` — widoczna natychmiast w terminalu

**Rejestracja endpointu:**
```typescript
await sendAnswer("proxy", { url: endpointUrl, sessionID: "s01e03" });
```

## Cross-episode data

Zadania mogą mieć zależności danych — np. S01E02 potrzebuje wyników S01E01.

**Wzorzec:**
1. `verifyAnswer.ts` wywołuje `saveFinalAnswer()` po potwierdzeniu flagi
2. Plik ląduje w `answers/final/{episodeId}-{task}.json`
3. Kolejny epizod ładuje przez `loadFinalAnswer()`:

```typescript
import { loadFinalAnswer } from "@ai-devs/ai-devs-hub";
const prev = await loadFinalAnswer("S01E01", "people");
```

Plik `final/` zawiera tylko pole `answer` (nie `apikey`). Cały katalog `answers/` jest gitignored.

## Pakiety reużywalne (`packages/`)

Projekt używa monorepo z Bun workspaces. Nowe zadania importują z pakietów `@ai-devs/*`.

### `@ai-devs/ai-devs-hub`

Komunikacja z API Centrali i persystencja odpowiedzi.

**Eksportuje:**

```typescript
// verify.ts
sendAnswer(task: string, answer: unknown): Promise<AiDevsResponse>

// answer-store.ts
saveTmpAnswer(episodeId: string, task: string, answer: unknown): Promise<string>
saveFinalAnswer(episodeId: string, task: string, answer: unknown, response: AiDevsResponse): Promise<string>

// answer-loader.ts
loadFinalAnswer(episodeId: string, task: string): Promise<FinalAnswerFile | null>
loadAllFinalAnswers(): Promise<FinalAnswerFile[]>

// types.ts
type AiDevsResponse = { code: number; message: string; error?: string; flag?: string }
type FinalAnswerFile = { episodeId, task, computedAt, confirmedAt, flag, answer, hubResponse }
```

**Format odpowiedzi API:**
- `code < 0` — błąd, treść w `message`
- `code === 0` — sukces, flaga w `message` lub `flag` jako `{FLG:NAZWA}`

**Użycie:**
```typescript
import { sendAnswer, saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
```

### `@ai-devs/ai-core`

Kernel AI: abstrakcje nad modelem, promptami, narzędziami i observability.

**`ai-core/model`:**
```typescript
interface ModelProvider {
  generateText(input): Promise<GenerateTextResult>
  generateStructured<T>(input): Promise<StructuredResult<T>>
  callTools(input): Promise<ToolCallTurnResult>
}
createOpenAIProvider(apiKey?): ModelProvider      // bezpośrednie API OpenAI
createOpenRouterProvider(apiKey?): ModelProvider  // OpenRouter (kompatybilny z OpenAI)
createDefaultProvider(): ModelProvider            // auto: OpenRouter jeśli OPEN_ROUTER_API_KEY, fallback OpenAI
// helpers: buildStrictSchema, objectSchema, arraySchema, enumSchema

// Typy wiadomości (multimodal):
type TextContentPart  = { type: "text"; text: string }
type ImageContentPart = { type: "image_url"; image_url: { url: string; detail?: "auto"|"low"|"high" } }
type MessageContent   = string | Array<TextContentPart | ImageContentPart>
type Message          = { role: "system"|"user"|"assistant"; content: MessageContent }
```

**`ai-core/prompts`:**
```typescript
type PromptAsset<TVars> = { id: string; render(vars: TVars): string }
createPromptAsset<TVars>(id, template): PromptAsset<TVars>
loadPromptAsset<TVars>(id, filePath): Promise<PromptAsset<TVars>>
```

**`ai-core/tools`:**
```typescript
type AiTool<TArgs, TResult> = { name, description, inputSchema, execute(args): Promise<ToolResult<TResult>> }
createToolRegistry(initialTools?): ToolRegistry
toolOk<T>(data): ToolResult<T>
toolErr(error): ToolResult<never>
```

**`ai-core/obs`:**
```typescript
logger.info/warn/error/debug(msg, tag?)
setLogLevel(level: LogLevel)
createEventBus(): EventBus   // typed AgentEvent
createRunReporter(bus): { getReport(): RunReport }
```

### `@ai-devs/geo-utils`

Geometria geograficzna — obliczenia odległości na powierzchni Ziemi.

**Eksportuje:**
```typescript
haversineDistanceKm(lat1, lon1, lat2, lon2): number  // odległość w km (formuła Haversine)
```

Użyj zamiast `lessons/ts/toolset/haversine.ts` (deprecated).

### `@ai-devs/mcp-tools`

Współdzielony serwer MCP (Model Context Protocol) — reużywalne narzędzia dla agentów.

**Struktura:**
```
packages/mcp-tools/
├── server.ts          # entry point: bun run ... [--http] [--port N]
├── index.ts           # eksport: createMcpStdioClient, createMcpHttpClient
├── mcp-server.ts      # logika protokołu MCP (transport-agnostyczna)
├── mcp-client.ts      # klient MCP (stdio subprocess LUB HTTP/SSE)
├── registry.ts        # globalny rejestr McpTool
├── protocol/          # typy JSON-RPC 2.0, transporty stdio i SSE
└── tools/             # narzędzia wg zadań kursu (index.ts rejestruje wszystkie)
```

**Transporty:**
- **stdio** (domyślny): serwer = subprocess, komunikacja przez stdin/stdout
- **HTTP/SSE**: serwer HTTP na porcie, GET /sse + POST /message

**Użycie po stronie klienta (agentLoop):**
```typescript
import { createMcpStdioClient } from "@ai-devs/mcp-tools";

const mcp = createMcpStdioClient("bun", ["run", "packages/mcp-tools/server.ts"]);
await mcp.connect();
const tools = await mcp.listTools(); // AiTool[] — kompatybilne z agentLoop
mcp.disconnect();
```

**Dodawanie narzędzi:**
1. Utwórz `packages/mcp-tools/tools/<zadanie>.ts` z McpTool + registerTool()
2. Dodaj import w `packages/mcp-tools/tools/index.ts`
3. **Zaktualizuj `docs/mcp-server.md`** — sekcja "Dostępne narzędzia"

Pełna dokumentacja: `docs/mcp-server.md`

### `lessons/ts/toolset/` — DEPRECATED

Stary toolset pozostaje dla zgodności z historią gita. Nie rozszerzaj, nie importuj w nowych zadaniach.
Użyj `@ai-devs/ai-devs-hub` zamiast `toolset/ai-devs.ts` i `toolset/save-answer.ts`.

## Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `API_KEY_AI_DEVS4` | Klucz API do hubu kursu (https://hub.ag3nts.org) |
| `OPENAI_API_KEY` | Klucz API OpenAI (bezpośredni) |
| `OPEN_ROUTER_API_KEY` | Klucz API OpenRouter — domyślny provider w `createDefaultProvider()` |

Dodawane w miarę potrzeb kolejnych lekcji (Qdrant, Neo4j, itp.)

## Technologia

- **Runtime:** Bun
- **Język:** TypeScript (strict mode, ESNext, moduleResolution: bundler)
- **Kluczowe zależności:** `openai`, `axios`, `chalk`, `dotenv`

## Dozwolone modele OpenAI

**ZAKAZ używania modeli spoza tej listy.** Użycie nieautoryzowanego modelu (np. `gpt-4o`, `gpt-4o-mini`, `gpt-3.5-turbo`) jest błędem — należy go natychmiast poprawić.
Jeśli do zadania potrzebny jest inny model (modalny, audio, image) — zaproponuj właścicielowi projektu i poczekaj na dopisanie do listy.
Dodatkowe reguły: `.ai/rules/general.md`.

Dobierz model odpowiednio do złożoności zadania:

| Model | Kiedy używać |
|---|---|
| `gpt-5.2` | Najtrudniejsze zadania wymagające zaawansowanego rozumowania, wielokrokowego planowania lub złożonej analizy |
| `gpt-5.1` | Zadania złożone: wieloetapowe przetwarzanie, zaawansowana klasyfikacja, generowanie kodu |
| `gpt-5` | Zadania standardowe wymagające dobrej jakości rozumowania i generowania |
| `gpt-5-mini` | Zadania rutynowe: klasyfikacja, tagging, ekstrakcja danych, proste transformacje — **domyślny wybór** |
| `gpt-5-nano` | Zadania bardzo proste i masowe: krótkie klasyfikacje binarne, formatowanie, gdzie liczy się szybkość i koszt |

### Vision (przetwarzanie obrazów)

**Wszystkie modele z listy powyżej obsługują Vision** — przyjmują obrazy jako input (Base64, URL). Źródło: [OpenAI Images and vision](https://platform.openai.com/docs/guides/vision).

| Model | Vision | Uwagi |
|---|---|---|
| `gpt-5.2` | tak | Patch-based tokenization |
| `gpt-5` | tak | Tile-based tokenization |
| `gpt-5-mini` | tak | Domyślny wybór dla analizy obrazów |
| `gpt-5-nano` | tak | Szybszy, tańszy — gdy wystarczy prosta analiza |
| `gpt-5.1` | tak | Linia GPT-5 — obsługa vision |

Do analizy obrazów (np. map, schematów, skanów dokumentów) użyj `gpt-5-mini` lub `gpt-5` — przekaż obraz w `content` jako `input_image` / `image_url`.

## Pliki dokumentacji zadań

Gdy zadanie wymaga pobrania dokumentacji z zewnętrznego źródła (np. hub.ag3nts.org):

- **Po ściągnięciu zapisz pliki w** `./lessons/ts/resources/`
- Zachowaj oryginalne nazwy plików (np. `zalacznik-E.md`, `dodatkowe-wagony.md`, `trasy-wylaczone.png`)
- Pliki tekstowe umożliwiają szybkie ładowanie bez ponownego fetchu; obrazy można analizować oddzielnie (vision)

## Dokumentacja rozwiązania (`solution.md`)

**Po zakończeniu realizacji każdego zadania** należy utworzyć plik `solution.md` w katalogu zadania (`lessons/ts/S{XX}/E{YY}/solution.md`).

**Plik musi zawierać:**

1. **Czego dotyczy zadanie** — opis problemu w kontekście kursu
2. **Czego uczy zadanie** — identyfikacja umiejętności i wzorców, które dane zadanie ma przekazać (np. praca z API, prompt engineering, obsługa błędów, budowa agentów). To kluczowe dla refleksji i budowania wiedzy.
3. **Jak działa rozwiązanie** — architektura modułów, przepływ danych, opis kluczowych komponentów
4. **Dlaczego takie podejście** — uzasadnienie decyzji technicznych (np. dlaczego z LLM / bez LLM, wybór bibliotek, wzorce retry)
5. **Odpowiedzi API / dane referencyjne** — przykładowe odpowiedzi, formaty, które pomagają zrozumieć kontekst
6. **Uruchomienie** — komenda do uruchomienia rozwiązania

**Cel:** Plik pełni rolę dokumentacji podsumowującej — pozwala wrócić do zadania po czasie i szybko zrozumieć co, jak i dlaczego zostało zrobione. Ułatwia też identyfikację wzorców przydatnych w kolejnych zadaniach.

## Analiza zadania — identyfikacja celów dydaktycznych

Podczas analizy nowego zadania (zanim zaczniesz implementację) **zidentyfikuj czego dane zadanie ma nauczyć**. Typowe kategorie:

- **Interakcja z API** — discovery, rate limiting, retry, nagłówki HTTP
- **Prompt engineering** — system prompts, few-shot, structured output
- **Przetwarzanie danych** — parsowanie, filtrowanie, transformacja
- **Budowa agentów** — tool calling, pętle decyzyjne, session management
- **Multimodalność** — vision, audio, analiza obrazów/dokumentów
- **Odporność** — error handling, fallbacki, graceful degradation

Zapisz tę analizę w sekcji "Czego uczy zadanie" w `solution.md`. Pomaga to świadomie podejść do rozwiązania i uniknąć nadmiarowej złożoności (np. nie używać LLM tam, gdzie wystarczy deterministyczna logika).

## Dokumentowanie użycia modeli w zadaniach

**Każde zadanie musi zawierać na początku pliku komentarz** informujący o użytych modelach i ich roli:

```typescript
// Modele użyte w zadaniu:
//   - gpt-5-mini  → batch tagging opisów zawodów (Structured Output)
```

Konwencja ta ułatwia audyt kosztów i dobór modeli w przyszłych zadaniach.
