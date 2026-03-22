# General Rules for AI Assistants

Reguły obowiązujące we wszystkich zadaniach kursu AI Devs 4.
Szczegóły architektury: `.ai/architecture.md`. Szczegóły decyzji: `.ai/adr/`, `.ai/decision-log/`.

---

## Scope

- Jedno zadanie = jeden katalog `lessons/ts/S{XX}/E{YY}/`
- Nie modyfikuj innych epizodów przy rozwiązywaniu bieżącego
- Nowe zadania importują z `@ai-devs/ai-core` i `@ai-devs/ai-devs-hub` — nie z `toolset/`
- `lessons/ts/toolset/` jest deprecated — nie rozszerzaj, nie twórz nowych plików

## Code

- Runtime: Bun (nie Node/npm)
- TypeScript strict mode
- Konwencje z `CLAUDE.md`: kebab-case pliki, camelCase zmienne, PascalCase typy
- Preferuj funkcje nad klasy, typy nad interfejsy
- `main.ts` = wyłącznie orkiestracja — zero logiki biznesowej

## Architecture

- Podział modułów wg ADR-001: każdy moduł eksportuje jedną funkcję, robi jedną rzecz
- Czyste funkcje (bez efektów ubocznych) wszędzie gdzie możliwe
- LLM izolowany w osobnym module (np. `classifyJobs.ts`)
- Monorepo kernel wg ADR-002: reużywalne abstrakcje w `packages/`, nie w `toolset/`

## AI Integration

- **UŻYWAJ WYŁĄCZNIE** modeli z listy dozwolonych w `architecture.md` (sekcja „Dozwolone modele OpenAI")
- **ZAKAZ** używania: `gpt-4o`, `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo` ani żadnych innych niewymienionych modeli
- Domyślny model to `gpt-5-mini` — dobry dla większości zadań
- Nowy model potrzebny do zadania → zaproponuj właścicielowi, poczekaj na zatwierdzenie i dopisanie do listy
- Structured Output tam gdzie odpowiedź ma określony schemat
- Komentarz na początku `main.ts` z listą użytych modeli i ich rolą
- **Domyślny provider: `createDefaultProvider()`** — wybiera OpenRouter (`OPEN_ROUTER_API_KEY`) lub OpenAI jako fallback
- Bezpośredni `createOpenAIProvider()` tylko gdy OpenRouter nie obsługuje danej funkcji (np. Structured Output z `json_schema`)
- **Szacunek kosztów:** każdy plan implementacji zadania musi zawierać tabelę z szacunkiem kosztów (model, ilość wywołań, koszt) — szczegóły w `architecture.md`

## Answer Saving

- Przed wysłaniem: `saveTmpAnswer(episodeId, task, answer)`
- Po potwierdzeniu flagi: `saveFinalAnswer(episodeId, task, answer, response)`
- **Nigdy** nie zapisuj `apikey` w plikach odpowiedzi
- Cross-episode deps ładuj przez `loadFinalAnswer()`, nie bezpośrednio przez `fs`:
  ```typescript
  import { sendAnswer, saveTmpAnswer, saveFinalAnswer, loadFinalAnswer } from "@ai-devs/ai-devs-hub";
  const prev = await loadFinalAnswer("S01E01", "people");
  ```

## Documentation

- Duże decyzje architektoniczne → nowe ADR w `.ai/adr/`
- Małe meta-decyzje → nowy wpis w `.ai/decision-log/decisions.md`
- Nie duplikuj reguł z `architecture.md` tutaj
- **MCP Tools:** gdy dodajesz narzędzie do `packages/mcp-tools/tools/` →
  obowiązkowo zaktualizuj `docs/mcp-server.md` (sekcja "Dostępne narzędzia")
  i dodaj import w `packages/mcp-tools/tools/index.ts`

## Secrets

- `.env` nigdy w git
- `apikey` nie w plikach odpowiedzi ani w logach commitowanych
- Klucze tylko przez `process.env.*`
- **Wartości flag (`{FLG:...}`) wyłącznie w `./answers/`** — nigdy w dokumentacji projektu (ADR, decision-log, solution.md, komentarze w kodzie). Katalog `answers/` jest gitignored. Projekt jest publiczny — flagi w dokumentach = spoilery dla innych uczestników kursu.
