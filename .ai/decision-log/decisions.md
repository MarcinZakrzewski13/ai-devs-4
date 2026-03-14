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

---

## DL-004 — Rozwiązanie S01E02 (findhim)

**Data:** 2026-03-14
**Decyzja:** S01E02 zrealizowane w architekturze modułowej (ADR-001). Flow deterministyczny: API Hub + Haversine, bez LLM.
**Powód:** Zadanie wymaga znalezienia osoby z S01E01, która była blisko elektrowni — porównanie współrzędnych z API `/api/location` z koordynatami elektrowni.
**Konsekwencje:** Nowy toolset `haversine.ts`. Dane wejściowe z `answers/final/S01E01-people.json` (root). Plik `findhim_locations.json` w `lessons/ts/resources/` — brak współrzędnych w JSON, mapa miasto→(lat,lon) w `loadPowerPlants.ts`. Próg „blisko” = 5 km.
