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

## DL-005 — Monorepo kernel: packages/ai-core + packages/ai-devs-hub

**Data:** 2026-03-14
**Decyzja:** Wyciągamy reużywalne abstrakcje do `packages/ai-core` i `packages/ai-devs-hub` jako Bun workspaces. Stary `toolset/` pozostaje deprecated — nie usuwamy, nie rozszerzamy.
**Powód:** Toolset rozrastał się bez granic. Pakiety wymuszają czyste interfejsy i umożliwiają import przez `@ai-devs/*` zamiast względnych ścieżek. Szczegóły: ADR-002.
**Konsekwencje:** `package.json` → `"workspaces": ["packages/*"]`. `tsconfig.json` → `paths` dla `@ai-devs/ai-core` i `@ai-devs/ai-devs-hub`. Nowe zadania importują wyłącznie z pakietów.

---

## DL-006 — Session logging dla zadań HTTP

**Data:** 2026-03-14
**Decyzja:** Zadania wystawiające serwer HTTP logują wszystkie konwersacje na dysk w katalogu `sessions/S{s}E{e}-YYYYMMDD-HHMM/{sessionID}.jsonl`. Każdy restart serwera tworzy nowy katalog z aktualnym timestampem.
**Powód:** Bez zapisu na dysk debugging wymaga kopiowania logów z terminala. Historia sesji ginie po restarcie serwera. Wiele sesji (różne sessionID od Centrali) musi być rozróżnialne.
**Konsekwencje:** Moduł `sessionLogger.ts` w każdym zadaniu HTTP. Format JSONL — łatwy do parsowania. Katalog `sessions/` w `.gitignore`.

---

## DL-007 — Detekcja flag w przychodzących wiadomościach

**Data:** 2026-03-14
**Decyzja:** `handleRequest.ts` w zadaniach konwersacyjnych skanuje każdą przychodzącą wiadomość pod kątem wzorca `{FLG:...}` i loguje wykrytą flagę z `chalk.bgGreen`.
**Powód:** W S01E03 flaga dotarła osadzona w ostatniej wiadomości od Centrali — nie została wykryta przez `sendAnswer` (który sprawdza odpowiedź hubu, nie ruch przychodzący).
**Konsekwencje:** Dodać `detectFlags(msg)` w handlerze żądań we wszystkich zadaniach HTTP.

---

## DL-008 — Hardening reguł AI IDE

**Data:** 2026-03-15
**Decyzja:** Wdrożono wielowarstwowy hardening dla Claude Code: `deny`/`ask` w `~/.claude/settings.json` + PreToolUse hook (`~/.claude/hooks/pre-tool-use.sh`) blokujący destruktywne operacje (`rm`, `dd`, `mkfs` itp.). Zaktualizowano `CLAUDE.md` — wymagane przeczytanie `.ai/rules/general.md` i `.ai/architecture.md` na początku każdej sesji.
**Powód:** AI IDE mogą wykonywać destruktywne polecenia bez potwierdzenia. Na WSL2 utrata danych może być trudna do odwrócenia — warto zabezpieczyć się hook'iem na poziomie procesu, nie tylko instrukcją tekstową.
**Konsekwencje:** Hook działa globalnie dla wszystkich projektów (`~/.claude/`). `rm *` → pyta, `rm -rf /` → twarda blokada (exit 2). Snapshoty WSL: `wsl --export` z PowerShell (wbudowane, bez dodatkowych narzędzi). Konfiguracja Cursor: `.cursor/rules/safety.mdc` z `alwaysApply: true`.

---

## DL-009 — Refactoring S01E01–E04: zgodność z architekturą

**Data:** 2026-03-15
**Decyzja:** Wykonano systematyczny refactoring epizodów S01E01–E04 usuwający 7 naruszeń architektury. Zmiany w kolejności prereqów: (1) global, (2) E03, (3) E02, (4) E01, (5) E04.
**Powód:** Raport zgodności `.ai/compliance-report-S01-E01-E04.md` wykrył: zakazany model `gpt-4o-mini` jako DEFAULT_MODEL, brak multimodal w `Message`, relative imports do `packages/`, `fs.readFileSync` zamiast `loadFinalAnswer()`, import z deprecated `toolset/`.
**Konsekwencje:**
- `packages/ai-core/model/openai.ts` — DEFAULT_MODEL zmieniony na `gpt-5-mini`
- `packages/ai-core/model/types.ts` — `Message.content` rozszerzony do `MessageContent` (multimodal: `TextContentPart`, `ImageContentPart`)
- `packages/geo-utils/` — nowy pakiet `@ai-devs/geo-utils` z `haversineDistanceKm()` (przeniesiony z `toolset/haversine.ts`)
- `tsconfig.json` — dodany alias `@ai-devs/geo-utils`
- E01/E04 — `new OpenAI()` → `createOpenAIProvider()` + `generateStructured()`
- E02 — `fs.readFileSync` → `loadFinalAnswer()`, `toolset/haversine` → `@ai-devs/geo-utils`
- E03 — 3 pliki: `../../../../packages/...` → `@ai-devs/ai-core` / `@ai-devs/ai-devs-hub`

---

## DL-010 — OpenRouter jako domyślny provider w ai-core

**Data:** 2026-03-15
**Decyzja:** Dodano `createOpenRouterProvider()` i `createDefaultProvider()` do `packages/ai-core/model/openai.ts`. `createDefaultProvider()` wybiera OpenRouter jeśli `OPEN_ROUTER_API_KEY` jest dostępny, w przeciwnym razie fallback na OpenAI. `createOpenAIProvider()` pozostaje bez zmian.
**Powód:** OpenRouter daje dostęp do wielu modeli przez jeden klucz i jedno API, często taniej. Użytkownik dodał `OPEN_ROUTER_API_KEY` do `.env`.
**Konsekwencje:** Nowe zadania używają `createDefaultProvider()` zamiast `createOpenAIProvider()`. Bezpośredni `createOpenAIProvider()` pozostaje dla przypadków wymagających funkcji niedostępnych w OpenRouter (np. ścisłe Structured Output z `json_schema`).

---

## DL-004 — Rozwiązanie S01E02 (findhim)

**Data:** 2026-03-14
**Decyzja:** S01E02 zrealizowane w architekturze modułowej (ADR-001). Flow deterministyczny: API Hub + Haversine, bez LLM.
**Powód:** Zadanie wymaga znalezienia osoby z S01E01, która była blisko elektrowni — porównanie współrzędnych z API `/api/location` z koordynatami elektrowni.
**Konsekwencje:** Nowy toolset `haversine.ts`. Dane wejściowe z `answers/final/S01E01-people.json` (root). Plik `findhim_locations.json` w `lessons/ts/resources/` — brak współrzędnych w JSON, mapa miasto→(lat,lon) w `loadPowerPlants.ts`. Próg „blisko” = 5 km.
