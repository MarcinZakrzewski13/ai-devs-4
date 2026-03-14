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

- Używaj wyłącznie modeli z listy w `architecture.md`
- Nowy model = zaproponuj i dopisz do listy (nie dodawaj samodzielnie)
- Structured Output tam gdzie odpowiedź ma określony schemat
- Komentarz na początku `main.ts` z listą użytych modeli i ich rolą

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

## Secrets

- `.env` nigdy w git
- `apikey` nie w plikach odpowiedzi ani w logach commitowanych
- Klucze tylko przez `process.env.*`
