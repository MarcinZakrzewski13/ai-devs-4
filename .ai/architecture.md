# Architecture

## Charakter projektu

Workspace do rozwiązywania zadań praktycznych z kursu **AI_Devs 4 Builder**.
Każde zadanie polega na napisaniu skryptu TypeScript, który przetwarza dane przy pomocy LLM i wysyła odpowiedź do Centrali (`https://hub.ag3nts.org`). Poprawna odpowiedź zwraca flagę w formacie `{FLG:NAZWA}`, którą wpisuje się na stronie hubu.

## Struktura projektu

```
ai-devs-4/
├── .ai/                          # Dokumentacja architektury
│   ├── architecture.md           # Ten plik
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
createOpenAIProvider(apiKey?): ModelProvider
// helpers: buildStrictSchema, objectSchema, arraySchema, enumSchema
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

### `lessons/ts/toolset/` — DEPRECATED

Stary toolset pozostaje dla zgodności z historią gita. Nie rozszerzaj, nie importuj w nowych zadaniach.
Użyj `@ai-devs/ai-devs-hub` zamiast `toolset/ai-devs.ts` i `toolset/save-answer.ts`.

## Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `API_KEY_AI_DEVS4` | Klucz API do hubu kursu (https://hub.ag3nts.org) |
| `OPENAI_API_KEY` | Klucz API OpenAI |

Dodawane w miarę potrzeb kolejnych lekcji (Qdrant, Neo4j, itp.)

## Technologia

- **Runtime:** Bun
- **Język:** TypeScript (strict mode, ESNext, moduleResolution: bundler)
- **Kluczowe zależności:** `openai`, `axios`, `chalk`, `dotenv`

## Dozwolone modele OpenAI

Używaj wyłącznie modeli z poniższej listy.
Jeśli potrzebny jest inny model (np. modalny, audio, image) — zaproponuj go i poproś o dopisanie do listy.
Dodatkowe reguły dotyczące AI: `.ai/rules/general.md`.
Dobierz model odpowiednio do złożoności zadania:

| Model | Kiedy używać |
|---|---|
| `gpt-5.2` | Najtrudniejsze zadania wymagające zaawansowanego rozumowania, wielokrokowego planowania lub złożonej analizy |
| `gpt-5.1` | Zadania złożone: wieloetapowe przetwarzanie, zaawansowana klasyfikacja, generowanie kodu |
| `gpt-5` | Zadania standardowe wymagające dobrej jakości rozumowania i generowania |
| `gpt-5-mini` | Zadania rutynowe: klasyfikacja, tagging, ekstrakcja danych, proste transformacje — domyślny wybór |
| `gpt-5-nano` | Zadania bardzo proste i masowe: krótkie klasyfikacje binarne, formatowanie, gdzie liczy się szybkość i koszt |

## Dokumentowanie użycia modeli w zadaniach

**Każde zadanie musi zawierać na początku pliku komentarz** informujący o użytych modelach i ich roli:

```typescript
// Modele użyte w zadaniu:
//   - gpt-5-mini  → batch tagging opisów zawodów (Structured Output)
```

Konwencja ta ułatwia audyt kosztów i dobór modeli w przyszłych zadaniach.
