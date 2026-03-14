# Decision Log

Lekkie meta-decyzje, które nie wymagają pełnego formatu ADR.
Format: append-only, nowe wpisy na dole.

---

## DL-001 — Bun jako runtime

**Data:** 2026-01-01
**Decyzja:** Używamy Bun zamiast Node.js jako runtime TypeScript.
**Powód:** Natywna obsługa TS bez transpilacji, wbudowany test runner, szybsze instalowanie zależności.
**Konsekwencje:** `bun run`, `bun test`, `Bun.write()` zamiast odpowiedników Node/npm.

---

## DL-002 — Centralne `lessons/answers/` dla wyników zadań

**Data:** 2026-03-14
**Decyzja:** Wyniki zadań zapisujemy w `lessons/answers/tmp/` (efemeryczne) i `lessons/answers/final/` (kanoniczne, w git).
**Powód:** Zadania mają zależności danych (np. S01E02 potrzebuje wyników S01E01). Bez persystencji trzeba by re-uruchamiać wcześniejsze zadania.
**Konsekwencje:** `save-answer.ts` w toolset, plik `final/` importowalny przez kolejne epizody. Apikey nigdy nie trafia do pliku. Cały `lessons/answers/` gitignored — odpowiedzi nie trafiają do repozytorium.

---

## DL-003 — Skill `close-session` jako rytuał zamknięcia sesji

**Data:** 2026-03-14
**Decyzja:** Każdą sesję zamykamy przez `/close-session` — skill sprawdza potrzebę aktualizacji ADR/decision-log i wykonuje commit.
**Powód:** Bez rytuału zamknięcia decyzje z sesji giną, a zmiany lądują w niezorganizowanych commitach lub wcale.
**Konsekwencje:** Skill w `.claude/skills/close-session/SKILL.md`. Wymaga dyscypliny — wywoływać świadomie, nie pomijać.
