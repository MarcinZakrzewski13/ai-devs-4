# General Rules for AI Assistants

Reguły obowiązujące we wszystkich zadaniach kursu AI Devs 4.
Szczegóły architektury: `.ai/architecture.md`. Szczegóły decyzji: `.ai/adr/`, `.ai/decision-log/`.

---

## Scope

- Jedno zadanie = jeden katalog `lessons/ts/S{XX}/E{YY}/`
- Nie modyfikuj innych epizodów przy rozwiązywaniu bieżącego
- Toolset (`lessons/ts/toolset/`) można rozszerzać, ale nie łam istniejącego API

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

## AI Integration

- Używaj wyłącznie modeli z listy w `architecture.md`
- Nowy model = zaproponuj i dopisz do listy (nie dodawaj samodzielnie)
- Structured Output tam gdzie odpowiedź ma określony schemat
- Komentarz na początku `main.ts` z listą użytych modeli i ich rolą

## Answer Saving

- Przed wysłaniem: `saveTmpAnswer(episodeId, task, answer)`
- Po potwierdzeniu flagi: `saveFinalAnswer(episodeId, task, answer, response)`
- **Nigdy** nie zapisuj `apikey` w plikach odpowiedzi
- `answers/final/{episodeId}-{task}.json` można importować w kolejnych epizodach:
  ```typescript
  import data from "../../../answers/final/S01E01-people.json" assert { type: "json" };
  ```

## Documentation

- Duże decyzje architektoniczne → nowe ADR w `.ai/adr/`
- Małe meta-decyzje → nowy wpis w `.ai/decision-log/decisions.md`
- Nie duplikuj reguł z `architecture.md` tutaj

## Secrets

- `.env` nigdy w git
- `apikey` nie w plikach odpowiedzi ani w logach commitowanych
- Klucze tylko przez `process.env.*`
