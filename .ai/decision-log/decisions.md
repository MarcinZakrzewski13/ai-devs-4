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

## DL-011 — Obowiązkowy solution.md po każdym zadaniu

**Data:** 2026-03-15
**Decyzja:** Po zakończeniu każdego zadania tworzony jest plik `solution.md` w katalogu zadania. Zawiera: czego dotyczy zadanie, czego uczy (cele dydaktyczne), jak działa rozwiązanie, dlaczego takie podejście, dane referencyjne, komendę uruchomienia. Dodatkowo, podczas analizy nowego zadania należy z góry identyfikować cele dydaktyczne.
**Powód:** Bez dokumentacji podsumowującej trudno wrócić do rozwiązania po tygodniach i zrozumieć kontekst decyzji. Identyfikacja celów dydaktycznych pomaga unikać nadmiarowej złożoności (np. nie używać LLM tam, gdzie wystarczy deterministyka).
**Konsekwencje:** Nowe sekcje w `architecture.md`: "Dokumentacja rozwiązania" i "Analiza zadania — identyfikacja celów dydaktycznych". Retroaktywnie utworzono `solution.md` dla S01E01–E05.

---

## DL-012 — Feature flag RAILWAY_FAST + hammer mode dla S01E05

**Data:** 2026-03-15
**Decyzja:** `apiClient.ts` w S01E05 ma dwa tryby sterowane env var `RAILWAY_FAST=true`. Normal: respektuje `retry-after`. Fast/hammer: ignoruje rate limit headers, retry co 0.1s (do 500 prób). Hammer mode ujawnił ukrytą extra flagę po ~55 próbach.
**Powód:** Rate limity w tym API były celowo emulowane jako część zadania CTF. Inne LLM odmawiały pomocy uznając to za atak — ale w kontekście kursu jest to zamierzone ćwiczenie. Feature flag pozwala zachować oba tryby w jednym pliku.
**Konsekwencje:** Wzorzec feature flaga env var (`TASK_FAST=true`) może być przydatny w kolejnych zadaniach z celowo utrudnionymi API. Hammer mode = retry bez czekania, 0.1s interval, wysoka liczba prób.

---

## DL-013 — Współdzielony serwer MCP w packages/mcp-tools

**Data:** 2026-03-17
**Decyzja:** Dodano pakiet `@ai-devs/mcp-tools` — współdzielony serwer MCP (Model Context Protocol) dla całego projektu. Serwer obsługuje dwa transporty: stdio (domyślny, subprocess) i HTTP/SSE (serwer HTTP na porcie). Implementacja ręczna (bez SDK) — komentarze edukacyjne wyjaśniają protokół krok po kroku.
**Powód:** Przewidywanie że finałowe zadanie kursu połączy narzędzia z wielu wcześniejszych epizodów. Współdzielony serwer MCP pozwala akumulować narzędzia (każdy epizod dodaje swój plik do `tools/`) i udostępniać je każdemu przyszłemu agentowi bez kopiowania kodu.
**Konsekwencje:**
- `packages/mcp-tools/` jako Bun workspace — importować przez `@ai-devs/mcp-tools`
- `tsconfig.json` rozszerzony o path alias `@ai-devs/mcp-tools`
- `docs/mcp-server.md` — dokumentacja protokołu, transportów, narzędzi
- Reguła w `general.md`: przy dodaniu narzędzia → zaktualizuj `docs/mcp-server.md`
- Narzędzia S01E03 przeniesione do `tools/packages-api.ts` (oryginalne `tools.ts` pozostaje)
- Klient (`createMcpStdioClient`, `createMcpHttpClient`) zwraca `AiTool[]` — `agentLoop.ts` nie wymaga zmian

---

## DL-014 — Indeks zadań i przegląd materiałów lekcyjnych

**Data:** 2026-03-21
**Decyzja:** Utworzono `.ai/tasks-index.md` (indeks wszystkich task.md/solution.md z podsumowaniami) i `.ai/ai-devs-4-builders.md` (przegląd materiałów lekcyjnych z lessons/txt/). Przeprowadzono audyt spójności CLAUDE.md, .cursorrules i init-project skill z plikami nadrzędnymi (.ai/rules/general.md, .ai/architecture.md) — usunięto rozbieżności.
**Powód:** Brak centralnego indeksu utrudniał orientację w postępach kursu i celach dydaktycznych zadań. CLAUDE.md zawierał przestarzałe informacje (stary URL centrali, deprecated toolset jako zalecany, monolityczna struktura plików).
**Konsekwencje:** `tasks-index.md` wymaga aktualizacji po każdym nowym zadaniu/rozwiązaniu. `ai-devs-4-builders.md` wymaga aktualizacji po dodaniu nowych lekcji (S03–S05). CLAUDE.md i .cursorrules są teraz spójne z .ai/.

---

## DL-015 — Pixelowa detekcja kabli zamiast Vision w S02E02

**Data:** 2026-03-22
**Decyzja:** W S02E02 (puzzle kabli 3x3) zamiast Vision LLM użyto deterministycznej analizy pikseli — skanowanie czarnych pasków na krawędziach komórek. Vision models (Gemini Flash, GPT-5-mini) testowane na kadrowanych i pełnych obrazach dawały niespójne wyniki.
**Powód:** Kable to grube czarne paski (~30px) na jasnym tle. Skanowanie gestości czarnych pikseli (>30% = połączenie) jest deterministyczne, powtarzalne, i darmowe. Vision models myliły typy kabli (np. T-junction vs straight), co uniemożliwiało obliczenie obrotów.
**Konsekwencje:** Moduł `detect-cables.ts` z auto-detekcją linii grida. Wzorzec: gdy obraz ma prosty, binarny schemat (czarno-białe linie), analiza pikseli > Vision LLM. Koszt rozwiązania: $0.00.

---

## DL-016 — Obowiązkowy szacunek kosztów w planach zadań

**Data:** 2026-03-22
**Decyzja:** Każdy plan implementacji zadania musi zawierać tabelę z szacunkiem kosztów (operacja, ilość wywołań, model, koszt USD). Dodano sekcję "Szacunek kosztów w planie zadania" do `architecture.md` i regułę w `general.md`.
**Powód:** Świadome zarządzanie budżetem LLM — unikanie nadmiarowych wywołań i wybór odpowiedniego modelu do złożoności zadania.
**Konsekwencje:** Feedback memory zapisane. Reguła w `.ai/rules/general.md` i `.ai/architecture.md`.

---

## DL-017 — Gemini Flash jako dozwolony model OpenRouter

**Data:** 2026-03-22
**Decyzja:** Dodano `google/gemini-3-flash-preview` do listy dozwolonych modeli w `architecture.md` w nowej sekcji "Modele OpenRouter (non-OpenAI)". Model dostępny wyłącznie przez `createOpenRouterProvider()`.
**Powód:** Sugerowany przez zadanie S02E02 do Vision-intensive analizy. Choć w tym zadaniu nie był potrzebny (pixelowa detekcja wystarczyła), model może być użyteczny w przyszłych zadaniach wymagających analizy grid/puzzle.
**Konsekwencje:** Nowa sekcja w `architecture.md`. Modele OpenRouter nie są dostępne przez `createDefaultProvider()` ani `createOpenAIProvider()` — wymagają jawnego `createOpenRouterProvider()`.

---

## DL-018 — Pliki tymczasowe zadań w resources/S{XX}E{YY}/tmp/

**Data:** 2026-03-22
**Decyzja:** Pliki tymczasowe powstające podczas rozwiązywania zadania (pobrane obrazy, pośrednie wyniki, logi) przechowywane w `lessons/ts/resources/S{XX}E{YY}/tmp/`. Nie usuwać — mogą być przydatne przy debugowaniu.
**Powód:** Dotychczas pliki tymczasowe trafiały do `/tmp` (gubiły się po restarcie) lub do katalogu zadania (zaśmiecały repo). Dedykowane miejsce w `resources/` (gitignored symlink) rozwiązuje oba problemy.
**Konsekwencje:** Reguła w `architecture.md` (sekcja "Pliki tymczasowe zadań") i `general.md` (Scope). Feedback memory zapisane.

---

## DL-004 — Rozwiązanie S01E02 (findhim)

**Data:** 2026-03-14
**Decyzja:** S01E02 zrealizowane w architekturze modułowej (ADR-001). Flow deterministyczny: API Hub + Haversine, bez LLM.
**Powód:** Zadanie wymaga znalezienia osoby z S01E01, która była blisko elektrowni — porównanie współrzędnych z API `/api/location` z koordynatami elektrowni.
**Konsekwencje:** Nowy toolset `haversine.ts`. Dane wejściowe z `answers/final/S01E01-people.json` (root). Plik `findhim_locations.json` w `lessons/ts/resources/` — brak współrzędnych w JSON, mapa miasto→(lat,lon) w `loadPowerPlants.ts`. Próg „blisko” = 5 km.

---

## DL-019 — Obowiązkowa sekcja “Wnioski z lekcji” w solution.md

**Data:** 2026-03-22
**Decyzja:** Każdy `solution.md` musi zawierać sekcję “Wnioski z lekcji”. Każdy wniosek ma: tytuł zasady, co się wydarzyło (konkretna sytuacja), analogię (spoza programowania), przykład zastosowania w innych kontekstach.
**Powód:** Suche opisy techniczne nie budują trwałej wiedzy. Analogie i przykłady sprawiają, że wzorce decyzyjne są zapamiętywalne i przenoszalne na przyszłe zadania. Celem jest budowanie osobistej biblioteki mentalnych modeli.
**Konsekwencje:** Nowy punkt 6 w wymaganiach `solution.md` w `architecture.md`. Wzór formatu: `lessons/ts/S02/E03/solution.md`. Feedback memory zapisane.

---

## DL-020 — Dodanie gpt-5.4 do listy dozwolonych modeli

**Data:** 2026-03-22
**Decyzja:** Dodano `gpt-5.4` do listy dozwolonych modeli OpenAI w `architecture.md`. Przeznaczony do vision-intensive zadań wymagających precyzyjnego zliczania elementów siatki i spatial reasoning.
**Powód:** Zadanie S02E05 sugerowało użycie `gpt-5.4` do analizy mapy z siatką. Model dał poprawny wynik za pierwszym razem (siatka 3×4, tama w sektorze 2,4). Jest droższy od dotychczasowych modeli — używać oszczędnie, z cachowaniem wyników.
**Konsekwencje:** Nowy wiersz w tabelach "Modele OpenAI" i "Vision" w `architecture.md`. Zasada: minimalizować wywołania (max 1-2), cachować wyniki w `tmp/`, nie używać w pętlach retry.

---

## DL-021 — Obowiązkowy katalog analysis-tools/ w zadaniach

**Data:** 2026-03-23
**Decyzja:** Skrypty ad-hoc użyte do eksploracji i analizy danych zadania muszą być zachowane w `lessons/ts/S{XX}/E{YY}/analysis-tools/`. Nie są częścią runtime — dokumentują proces analityczny.
**Powód:** Bez wiedzy o tym, jak przeprowadzono klasyfikację, oczyszczenie i normalizację danych wejściowych, wartość ucząca zadania znacząco spada. Proces myślowy i eksploracja danych są integralną częścią rozwiązania.
**Konsekwencje:** Nowa reguła w `.ai/rules/general.md` (Scope) i nowy katalog w strukturze zadań w `.ai/architecture.md`. Retroaktywnie zastosowane w S03E01 (3 skrypty Python: rozkład sensorów, detekcja anomalii, keyword matching notatek).

---

## DL-022 — Claude Sonnet 4.6 jako dozwolony model OpenRouter

**Data:** 2026-03-24
**Decyzja:** Dodano `anthropic/claude-sonnet-4-6` do listy dozwolonych modeli OpenRouter w `architecture.md`. Przeznaczony do agentowych zadań wymagających dobrego rozumowania, śledzenia kontekstu i adaptacji do nieznanych API.
**Powód:** Zadanie S03E02 (debugowanie firmware na VM przez Shell API) wymagało modelu zdolnego do wielokrokowej eksploracji nieznanych komend, diagnozowania błędów i naprawy konfiguracji. Task hints wprost sugerowały ten model. GPT-5-mini mógłby utknąć w pętli przy niestandardowym shellu.
**Konsekwencje:** Nowy wiersz w tabeli "Modele OpenRouter (non-OpenAI)" w `architecture.md`. Model dostępny przez `createDefaultProvider()` (bo OpenRouter jest domyślnym providerem). Koszt: $3/$15 per 1M tokens — droższy od Gemini Flash, używać tylko gdy potrzebne dobre rozumowanie agentowe.

---

## DL-023 — Learning Goals: LLM-first approach w rozwiązaniach zadań

**Data:** 2026-03-27
**Decyzja:** Dodano sekcję "Learning Goals" do `.ai/rules/general.md`. Rozwiązania zadań muszą demonstrować użycie LLM jako centralnego elementu decyzyjnego. Algorytmy opakowujemy jako tools dla agenta. Decyzje o strategii podejmuje LLM, nie if/else w kodzie.
**Powód:** Celem kursu jest nauka efektywnego wykorzystywania LLM w IT. Rozwiązanie czysto deterministyczne (np. BFS bez agenta) nie uczy niczego o programowaniu z AI. Każde zadanie to mini-system IT współdzielący z innymi jedynie mechanizmy w `./packages`.
**Konsekwencje:** Nowa sekcja w `general.md`. Feedback memory `feedback_llm_first.md`. Przebudowa S03E05 z deterministycznego na dwufazową architekturę agentową (ADR-004).

---

## DL-024 — Whisper-1 jako dozwolony model Speech-to-Text

**Data:** 2026-04-22
**Decyzja:** Dodano `whisper-1` do listy dozwolonych modeli w `architecture.md` w nowej sekcji "Modele audio (Speech-to-Text)". Model przeznaczony do transkrypcji plików audio (mp3, wav, m4a, webm, ogg, flac) przez OpenAI API `audio.transcriptions.create`.
**Powód:** Zadania z sezonu S02 wymagają transkrypcji nagrań audio. Dotychczas lista dozwolonych modeli obejmowała wyłącznie text/vision — brak pozycji S2T blokował realizację takich zadań.
**Konsekwencje:** Nowa sekcja "Modele audio (Speech-to-Text)" w `architecture.md` pomiędzy Vision a OpenRouter. Użycie wymaga bezpośredniego klienta OpenAI (nie przez `ModelProvider`) — `createDefaultProvider()` nie obsługuje audio endpointa.
