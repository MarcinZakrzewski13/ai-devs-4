# ADR-002: Monorepo kernel — packages/ai-core + packages/ai-devs-hub

**Status:** Accepted
**Data:** 2026-03-14

## Context

Stary `lessons/ts/toolset/` rósł organicznie bez wyraźnych granic:
- `ai-devs.ts` + `save-answer.ts` mieszały odpowiedzialności (HTTP, persystencja, logowanie)
- Importy opierały się na względnych ścieżkach (`../../toolset/ai-devs.ts`) — kruche przy przenoszeniu zadań
- Brak jawnego interfejsu — każdy plik toolsetu był publicznym API
- Nieuniknione duplikacje przy kolejnych zadaniach wymagających podobnych abstrakcji

## Decision

Wyodrębniamy dwa pakiety jako Bun workspaces w `packages/`:

| Pakiet | Odpowiedzialność |
|---|---|
| `@ai-devs/ai-devs-hub` | Komunikacja z Centralą, persystencja odpowiedzi |
| `@ai-devs/ai-core` | Model provider, prompty, narzędzia, observability |

**Zakres `@ai-devs/ai-devs-hub`:**
- `verify.ts` — `sendAnswer()` (migracja z `toolset/ai-devs.ts`)
- `answer-store.ts` — `saveTmpAnswer()`, `saveFinalAnswer()` (migracja z `toolset/save-answer.ts`)
- `answer-loader.ts` — `loadFinalAnswer()`, `loadAllFinalAnswers()` (nowe — czytanie cross-episode deps)
- `types.ts` — `AiDevsResponse`, `FinalAnswerFile`

**Zakres `@ai-devs/ai-core`:**
- `model/` — `ModelProvider` interface, `createOpenAIProvider()`, `structured-output` helpers
- `prompts/` — `PromptAsset<TVars>`, `createPromptAsset()`, `loadPromptAsset()`
- `tools/` — `AiTool<TArgs,TResult>`, `ToolResult`, `createToolRegistry()`
- `obs/` — `logger`, `createEventBus()` z `AgentEvent`, `createRunReporter()`

**Co NIE weszło (świadome pominięcia):**
- Agent runtime z pętlą / state machine
- Checkpoint persistence
- MCP adapter
- Recipe DSL

**Konfiguracja:**
- `package.json` root: `"workspaces": ["packages/*"]`
- `tsconfig.json`: `paths` — `@ai-devs/ai-core` → `./packages/ai-core/index.ts`

**Stary toolset:** pozostaje bez zmian jako deprecated. Nie usuwamy — historia gita i działające zadania S01E01/E02 w starych ścieżkach nie są cofane.

## Consequences

**Pozytywne:**
- Import przez `@ai-devs/*` zamiast kruchych ścieżek względnych
- Jawne granice pakietów — `index.ts` definiuje publiczne API
- `loadFinalAnswer()` eliminuje bezpośrednie `fs.readFileSync` dla cross-episode deps
- `ModelProvider` interface umożliwia podmianę modelu bez zmiany kodu zadania

**Negatywne:**
- Dwie warstwy importów przez okres przejściowy (toolset + packages)
- Wymaga dyscypliny: nowe zadania muszą używać `@ai-devs/*`, nie `toolset/`
