# Indeks zadan kursowych

Indeks wszystkich plikow `task.md` i `solution.md` w projekcie. Dla kazdego zadania: cel, czego uczy, informacje o rozwiazaniu.

---

## Przeglad: LLM vs deterministyczne

> **Aktualizuj po kazdym rozwiazanym zadaniu.**

| Zadanie | Problem | Typ | Model LLM |
|---------|---------|-----|-----------|
| S01E01 | Klasyfikacja zawodow z CSV | LLM | gpt-5-mini |
| S01E02 | Geolokalizacja podejrzanego (Haversine) | deterministyczne | — |
| S01E03 | Agent proxy HTTP z function calling | LLM | gpt-5-mini |
| S01E04 | Odczyt kodu trasy z PNG (Vision) | LLM | gpt-5-mini (Vision) |
| S01E05 | Aktywacja trasy przez samo-dokumentujace API | deterministyczne | — |
| S02E01 | Optymalizacja promptu klasyfikacyjnego (100 tokenow) | LLM | claude-sonnet |
| S02E02 | Puzzle rotacji kabli na planszy 3x3 | deterministyczne | — |
| S02E03 | Kompresja logow do 1500 tokenow | deterministyczne | — |
| S02E04 | Przeszukiwanie skrzynki mailowej przez API | LLM | Gemini Flash |
| S02E05 | Planowanie misji drona z analiza mapy | LLM | gpt-5.4 (Vision) |
| S03E01 | Wykrywanie anomalii w 9999 plikach sensorow | LLM (hybrydowe) | gpt-5-nano |
| S03E02 | Debugowanie firmware na VM przez Shell API | LLM | Claude Sonnet 4.6 |
| S03E03 | Nawigacja robota przez plansze z ruchomymi blokami | deterministyczne | — |
| S03E04 | Budowanie narzedzi HTTP dla zewnetrznego agenta | LLM | gpt-5-nano + gpt-5-mini |
| S03E05 | Planowanie trasy na mapie z przeszkodami | LLM | gpt-5-mini |
| S04E01 | API discovery + CRUD w systemie OKO | LLM | gpt-5-mini |
| S04E02 | Harmonogram turbiny wiatrowej (async API, 40s limit) | deterministyczne | — |

**Razem:** 6 deterministycznych, 11 LLM

---

## Sezon 1

### S01E01 — People (klasyfikacja zawodow)

| | |
|---|---|
| **Task** | `lessons/ts/S01/E01/task.md` |
| **Solution** | `lessons/ts/S01/E01/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Pobranie CSV z danymi osobowymi, filtracja po kryteriach demograficznych (M, Grudziadz, 20-40 lat w 2026), klasyfikacja zawodow przez LLM i wyslanie osob z tagiem "transport".

**Czego uczy:**
- Structured Output z enum constraints — wymuszenie schematu JSON na odpowiedzi modelu
- Separacja logiki deterministycznej (filtrowanie) od LLM (klasyfikacja)
- Batch processing — wszystkie opisy w jednym wywolaniu API
- Pipeline danych: load -> filter -> classify -> build -> verify

**Rozwiazanie:** Modulowy pipeline (6 plikow). `classifyJobs.ts` uzywa gpt-5-mini z Structured Output i enum constraint na 7 tagach. Filtracja demograficzna w czystej funkcji `filterCandidates.ts` bez LLM. Zwroc uwage na uzycie pola `id` zamiast indeksu tablicy w schemacie — eliminuje off-by-one errors.

---

### S01E02 — Findhim (lokalizacja podejrzanego)

| | |
|---|---|
| **Task** | `lessons/ts/S01/E02/task.md` |
| **Solution** | `lessons/ts/S01/E02/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Znalezienie ktorego z podejrzanych (wynik S01E01) widziano blisko elektrowni jadrowej. Pobranie lokalizacji GPS z API, porownanie z koordynatami elektrowni (Haversine), pobranie poziomu dostepu.

**Czego uczy:**
- Cross-episode dependencies — uzycie `loadFinalAnswer("S01E01")` do ladowania danych z poprzedniego zadania
- Integracja wielu endpointow API (`/api/location`, `/api/accesslevel`, `/verify`)
- Obliczenia geoprzestrzenne (formula Haversine) bez LLM
- Zadanie w 100% deterministyczne — nie kazdy problem wymaga modelu jezykowego

**Rozwiazanie:** 8 modulow, zero LLM. `findNearPlant.ts` uzywa `@ai-devs/geo-utils` (Haversine) z progiem 5 km. Hardcoded koordynaty miast (API ich nie zwraca). Zwroc uwage na wzorzec cross-episode: `loadFinalAnswer()` zamiast bezposredniego odczytu plikow.

---

### S01E03 — Proxy (asystent logistyczny HTTP)

| | |
|---|---|
| **Task** | `lessons/ts/S01/E03/task.md` |
| **Solution** | `lessons/ts/S01/E03/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Zbudowanie publicznego endpointu HTTP jako proxy do systemu logistycznego. Agent AI prowadzi konwersacje z operatorem, sprawdza/przekierowuje paczki, potajemnie przekierowujac przesylki jadrowe do PWR6132PL.

**Czego uczy:**
- Function calling (tool use) — `check_package` i `redirect_package`
- Petla agentowa (agent loop) z limitem iteracji (max 5)
- System prompt jako kontroler zachowania (tajna misja)
- Session management — wieloturowa konwersacja z pamiecia (in-memory + JSONL)
- Serwer HTTP z `Bun.serve()`, rejestracja endpointu w Centrali

**Rozwiazanie:** 9 modulow, LLM: gpt-5-mini (agent loop z function calling). Kluczowy mechanizm: hardcoded override w `tools.ts` — destination zawsze nadpisywany na PWR6132PL niezalezenie od parametrow modelu. System prompt nadaje agentowi tozsamosc "Marka". JSONL logging per sesja ulatwia debugowanie. Zwroc uwage na separacje: model decyduje "co" (check/redirect), ale system kontroluje "jak" (override destination).

---

### S01E04 — Sendit (deklaracja transportu SPK)

| | |
|---|---|
| **Task** | `lessons/ts/S01/E04/task.md` |
| **Solution** | `lessons/ts/S01/E04/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Wypelnienie deklaracji transportowej w Systemie Przesylek Konduktorskich. Pobranie dokumentacji (markdown + PNG), odczyt kodu trasy z grafiki (Vision AI), budowa sformatowanej deklaracji.

**Czego uczy:**
- Vision (analiza obrazow przez LLM) — odczyt kodu trasy z PNG
- Structured Output z Vision — polaczenie dwoch technik
- Praca z dokumentacja zewnetrzna (5 plikow: markdown + PNG)
- Formatowanie zgodne ze specyfikacja — Hub weryfikuje uklad tekstu

**Rozwiazanie:** 5 modulow. `extractRouteCode.ts` uzywa gpt-5-mini Vision + Structured Output do odczytu kodu trasy "X-01" z obrazu. `buildDeclaration.ts` to czysta funkcja formatujaca — zero LLM. Kluczowe wartosci: kategoria A (strategiczna), WDP 4, koszt 0 PP, trasa X-01. Zwroc uwage na interpretacje regulaminu — kategoria A pozwala na trasy wylaczone i jest finansowana przez System.

---

### S01E05 — Railway (aktywacja trasy X-01)

| | |
|---|---|
| **Task** | `lessons/ts/S01/E05/task.md` |
| **Solution** | `lessons/ts/S01/E05/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Aktywacja trasy kolejowej "X-01" przez samo-dokumentujace API bez dokumentacji. Start od akcji `help`, obsluga bledow 503 i rate limitow.

**Czego uczy:**
- Praca z samo-dokumentujacym API — discovery przez `help`
- Odpornosc na bledy HTTP (503 retry, 429 rate limit)
- Deterministyczna interakcja bez LLM — sekwencja krokow wynika z dokumentacji
- Adaptacyjne podejscie dwufazowe: discovery -> execution

**Rozwiazanie:** 4 moduly, zero LLM. `apiClient.ts` obsluguje retry na 503 (exponential backoff) i rate limit (parsowanie `retry-after`). Sekwencja: `help` -> `getstatus` -> `reconfigure` -> `setstatus(RTOPEN)` -> `save` -> flaga. Bonus: tryb RAILWAY_FAST=true (hammer mode) — ignoruje rate limit, co daje dodatkowa flage po ~55 requestach. Zwroc uwage na lekcje: rate limity moga byc celowo "lamalne" w kontekscie CTF.

---

## Sezon 2

### S02E01 — Categorize (optymalizacja promptu)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E01/task.md` |
| **Solution** | `lessons/ts/S02/E01/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Napisanie kompaktowego promptu (max 100 tokenow) klasyfikujacego 10 towarow jako DNG (niebezpieczny) lub NEU (neutralny). Produkty zwiazane z reaktorem musza byc klasyfikowane jako NEU pomimo niebezpiecznych opisow.

**Czego uczy:**
- Optymalizacja promptu pod restrykcyjny limit tokenow
- Iteracyjne doskonalenie promptu (agentowe testowanie wersji)
- Prompt caching — statyczny poczatek promptu obniaza koszty
- Wyjatki w klasyfikacji — celowe "oszukiwanie" systemu

**Rozwiazanie:** Iteracyjna petla z prompt versioning (8 modulow). Prompt 33 tokenow template: `DNG=weapon/explosive. NEU=everything else. Reactor/nuclear=ALWAYS NEU.` Cache hit 60.7%, budjet 0.68/1.5 PP. Infrastruktura: historia promptow w `resources/S02E01/prompt-v*.md`, kolekcja produktow w `all-products.csv`, LLM-optymalizacja (claude-sonnet) po bledach.

---

### S02E02 — Electricity (puzzle rotacji kabli)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E02/task.md` |
| **Solution** | `lessons/ts/S02/E02/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Rozwiazanie puzzle na planszy 3x3 — obrot segmentow kabli o 90 stopni, aby polaczyc 3 elektrownie ze zrodlem zasilania awaryjnego w zamkniety obwod.

**Czego uczy:**
- Deterministyczna analiza obrazu — detekcja kabli przez skanowanie pikseli zamiast Vision LLM
- Automatyczne wykrywanie siatki — detekcja linii grida przez gestosci czarnych pikseli
- Spatial reasoning — obliczanie obrotow na podstawie porownania stanow
- Walidacja obwodu — sprawdzanie obustronnosci polaczen miedzy komorkami

**Rozwiazanie:** 7 modulow, zero LLM. Kluczowy mechanizm: `detect-cables.ts` skanuje piksele na krawediach komorek (czarne paski = kable, >30% = polaczenie). Target state hardcoded po jednorazowej analizie `solved_electricity.png`. `compute-rotations.ts` oblicza obroty CW (0-3 per komorka). Typowy przebieg: 5-7 obrotow API. Koszt: $0.00 (brak LLM). Uwaga: Vision models (Gemini Flash, GPT-5-mini) testowane ale dawaly niespojne wyniki — pixelowa detekcja okazala sie niezawodna.

---

### S02E03 — Failure (kompresja logow)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E03/task.md` |
| **Solution** | `lessons/ts/S02/E03/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Skondensowanie ogromnego pliku logow systemowych (2137 linii) do 1500 tokenow, zachowujac zdarzenia istotne dla analizy awarii elektrowni.

**Czego uczy:**
- Przetwarzanie duzych plikow — selektywna ekstrakcja i deduplikacja
- Token counting i kompresja tekstu (roznice miedzy tokenizerami)
- Priorytetyzacja zdarzen (CRIT > ERRO > WARN) i deterministyczne skracanie fraz
- Iteracyjne dopracowywanie na podstawie feedbacku z API

**Rozwiazanie:** 8 modulow, zero LLM. Kluczowy mechanizm: deduplikacja (890 → 55 unikalnych wpisow z licznikami xN) + deterministyczne skracanie fraz + usuwanie WARN z najnizszym priorytetem az do limitu. Margines 1350 tokenow (hub uzywa innego tokenizera, ~3% rozbieznosc). Koszt: $0.00.

**Extra flag:** `{FLG:VIBECODER}` — "Tokeny zlych odpowiedzi to znaki - nadaj FLAG". Wysylanie logow z precyzyjnym token count = ASCII litery (70=F, 76=L, 65=A, 71=G). Hub przy blednych logach (code -949) zwraca `tokenCount` i `letter`. Po nadaniu 4 liter w kolejnosci → flaga.

---

### S02E04 — Mailbox (przeszukiwanie skrzynki mailowej)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E04/task.md` |
| **Solution** | `lessons/ts/S02/E04/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Przeszukanie skrzynki mailowej przez API (operatory Gmail-like) w celu znalezienia hasla, daty ataku (YYYY-MM-DD) i kodu potwierdzenia (SEC-32znaki). Skrzynka jest aktywna — nowe wiadomosci moga wplywac.

**Czego uczy:**
- API discovery (akcja `help`)
- Dwuetapowe pobieranie danych: lista maili -> pelna tresc
- Iteracyjne przeszukiwanie aktywnego zrodla danych
- Agentowe podejscie z Function Calling do przeszukiwania i ekstrakcji

**Rozwiazanie:** Petla agentowa z 6 narzedziami (zmail_help, zmail_inbox, zmail_search, zmail_get_message, submit_answer, finish). Agent Gemini Flash sam decyduje jakie zapytania wykonac. Typowy przebieg: 12 iteracji. Kluczowy detail: API uzywa `getMessages` z param `ids` (nie `getMessage`/`messageId`). Kod potwierdzenia pojawil sie w dwoch wariantach — agent musial przeczytac kontekst i wybrac poprawny.

---

### S02E05 — Drone (planowanie misji drona)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E05/task.md` |
| **Solution** | `lessons/ts/S02/E05/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Analiza mapy terenu (PNG z siatka), odczyt dokumentacji API drona (HTML), identyfikacja sektora tamy i zaprogramowanie drona do zbombardowania tamy (nie elektrowni).

**Czego uczy:**
- Vision — analiza siatki mapy, zliczanie kolumn/wierszy
- Parsowanie dokumentacji HTML z pulapkami (kolidujace nazwy funkcji)
- Reaktywne podejscie — iteracja na podstawie bledow API
- Dwuetapowe: analiza mapy (vision) -> generowanie instrukcji (tekst)

**Rozwiazanie:** Dwuetapowe: (1) Vision gpt-5.4 analizuje mape — siatka 3x4, tama w sektorze (2,4), (2) deterministyczne budowanie 12 instrukcji drona (hardReset, kalibracja, cel, koordynaty, silnik, lot, destroy, return). Flaga za pierwsza proba. Wynik vision cachowany w tmp/. Zero LLM w fazie instrukcji — czysta funkcja. Overloaded `set()` rozroznia parametry po formacie (x,y vs engineON vs N% vs Nm vs destroy).

---

## Sezon 3

### S03E01 — Evaluation (anomalie w danych sensorow)

| | |
|---|---|
| **Task** | `lessons/ts/S03/E01/task.md` |
| **Solution** | `lessons/ts/S03/E01/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Analiza 9999 plikow JSON z odczytami sensorow elektrowni jadrowej. Znalezienie anomalii: dane poza zakresem, nieaktywne sensory z wartoscia != 0, notatki operatora niezgodne z danymi.

**Czego uczy:**
- Hybrydowe przetwarzanie — deterministyczny kod dla danych liczbowych, LLM tylko dla interpretacji jezyka naturalnego
- Optymalizacja kosztow LLM — deduplikacja (9953 plikow → 1993 unikalnych notatek), minimalizacja output tokens
- Limitacje keyword matching — negacje w jezyku naturalnym wymagaja LLM
- Ewaluacja danych — budowanie regul walidacyjnych na podstawie specyfikacji

**Rozwiazanie:** Dwufazowe: (1) deterministyczna detekcja anomalii danych (zakresy + nieaktywne sensory) → 46 plikow, (2) LLM klasyfikacja deduplikowanych notatek operatora (gpt-5-nano, Structured Output) → 6 plikow z falszywymi raportami bledow. Razem 52 anomalie. Koszt LLM: ~$0.04. Skrypty eksploracyjne zachowane w analysis-tools/.

---

### S03E02 — Firmware (debugowanie firmware na VM)

| | |
|---|---|
| **Task** | `lessons/ts/S03/E02/task.md` |
| **Solution** | `lessons/ts/S03/E02/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Uruchomienie binarki `/opt/firmware/cooler/cooler.bin` na ograniczonej maszynie wirtualnej dostepnej przez Shell API. VM ma niestandardowy shell, ograniczenia bezpieczenstwa (ban za .gitignore), lock file i zepsuta konfiguracje.

**Czego uczy:**
- Petla agentowa z Function Calling do interaktywnego debugowania
- Eksploracja nieznanych API — zaczynaj od `help`, nie zakladaj komend
- Respektowanie ograniczen srodowiska (.gitignore = nie czytaj, ban = czekaj)
- Wielokrokowe rozwiazywanie problemow: haslo → lock file → konfiguracja → uruchomienie

**Rozwiazanie:** Petla agentowa (Claude Sonnet 4.6, max 30 iteracji) z 3 narzedziami (shell_exec, submit_answer, finish). Agent sam eksploruje VM: poznaje komendy, znajduje haslo w `/home/operator/notes/pass.txt`, usuwa lock file, naprawia settings.ini (odkomentowanie SAFETY_CHECK, wylaczenie test_mode, wlaczenie cooling), uruchamia firmware i wyciaga kod ECCS. Typowy przebieg: 27 iteracji (z czego ~8 to czekanie na ban). Koszt: ~$0.20.

---

### S03E03 — Reactor (nawigacja robota)

| | |
|---|---|
| **Task** | `lessons/ts/S03/E03/task.md` |
| **Solution** | `lessons/ts/S03/E03/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Doprowadzenie robota przez plansze 7x5 z ruchomymi blokami reaktora. Robot porusza sie po dolnym wierszu od kolumny 1 do 7. Komendy: start, right, left, wait.

**Czego uczy:**
- Reagowanie na zmieniajacy sie stan otoczenia (kontekstowy feedback z API)
- Predykcja stanu — decyzje na podstawie przyszlych pozycji blokow, nie obecnych
- Discovery API — odkrywanie formatu odpowiedzi przez eksperyment
- Deterministyczna petla decyzyjna bez LLM

**Rozwiazanie:** 5 modulow, zero LLM. Petla gry: sendCommand → parseState → decideCommand → repeat. Algorytm 1-step lookahead: predykcja pozycji blokow po nastepnym ruchu, heurystyka right > wait > left. Discovery phase: start + 6x wait ujawnilo mechanike ruchu blokow (odwracanie kierunku na granicach). Rozwiazanie w 8 krokach. Koszt: $0.00.

---

### S03E04 — Negotiations (budowanie narzedzi dla agenta)

| | |
|---|---|
| **Task** | `lessons/ts/S03/E04/task.md` |
| **Solution** | `lessons/ts/S03/E04/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Przygotowanie 1-2 narzedzi HTTP dla agenta Centrali, ktory szuka miast sprzedajacych komponenty elektroniczne do turbiny wiatrowej. Agent wysyla zapytania w jezyku naturalnym. Musi znalezc miasta oferujace WSZYSTKIE 3 potrzebne produkty jednoczesnie.

**Czego uczy:**
- Projektowanie narzedzi (API) dla zewnetrznego agenta AI — opisy decyduja o skutecznosci
- Guard LLM jako warstwa bezpieczenstwa (walidacja + detekcja prompt injection)
- LLM normalizacja jezyka naturalnego → structured data (Structured Output)
- Trojwarstwowa architektura: guard → normalizer → deterministic search engine
- Ograniczenia komunikacji agent↔narzedzie (500B limit, max 10 krokow)

**Rozwiazanie:** 8 modulow, 2 endpointy HTTP. Endpoint 1 `/search-items`: szuka produktow w katalogu 2136 komponentow (keyword AND match z OR fallback). Endpoint 2 `/find-cities`: lookup miast dla danego kodu produktu (connections.csv → cities.csv). Kazdy request przechodzi: guard LLM (gpt-5-nano) → normalizer LLM (gpt-5-mini, Structured Output) → deterministyczny silnik. CSV dane ladowane in-memory z indeksami Map. Koszt: ~$0.004 per run. Kluczowy detail: opis narzedzia z "Use these codes with the find-cities tool" laczy oba endpointy w pipeline dla agenta.

---

### S03E05 — Save Them (planowanie trasy)

| | |
|---|---|
| **Task** | `lessons/ts/S03/E05/task.md` |
| **Solution** | `lessons/ts/S03/E05/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Zaplanowanie optymalnej trasy dla wyslannika na mapie 10x10 do miasta Skolwin. Mapa z przeszkodami (skaly, woda, drzewa), 4 pojazdy z roznym spalaniem, budzet 10 fuel + 10 food. Narzedzia API odkrywane przez meta-endpoint `toolsearch`.

**Czego uczy:**
- API discovery przez agenta LLM — toolsearch jako meta-narzedzie, agent sam odkrywa endpointy
- Knowledge base pattern — agent zapisuje fakty, wstrzykiwane do promptu kolejnego agenta
- LLM jako decision-maker — planner analizuje mape, porownuje pojazdy, podejmuje decyzje
- Algorytm jako narzedzie agenta — BFS pathfinder opakowany jako AiTool, nie hardcoded

**Rozwiazanie:** Dwufazowa architektura agentowa. Faza 1: Discovery agent (gpt-5-mini, ~17 iteracji) odkrywa 3 endpointy, zbiera wiedzę do KnowledgeBase. Faza 2: knowledge extraction (parser). Faza 3: Route planner agent (gpt-5-mini, ~15 iteracji) z BFS jako narzedziem — sam wybiera rocket + dismount, submituje main route i beaver route. Koszt: ~$0.02.

**Extra flag:** `{FLG:ABEAVER}` — "Tam sa bobry!" Planner agent rozumuje o bobrach z knowledge base, szuka tras do polnocnej wody, znajduje (1,6) przy strumieniu. "You found beavers by the stream!"

---

## Sezon 4

### S04E01 — OKO Editor (API Discovery + CRUD)

| | |
|---|---|
| **Task** | `lessons/ts/S04/E01/task.md` |
| **Solution** | `lessons/ts/S04/E01/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Modyfikacja systemu OKO (Centrum Operacyjne) przez API. Agent LLM odkrywa API i panel webowy w runtime, reklasyfikuje incydent Skolwin (MOVE03→MOVE04), oznacza zadanie jako wykonane, tworzy nowy incydent Komarowo.

**Czego uczy:**
- API discovery przez agenta — akcja `help` ujawnia dostepne operacje
- Web panel indexing — odczyt HTML z sanityzacja (prompt injection, link loops, page limit)
- Temporal constraints — aktualizacje API wygasaja w sekundy, wymagaja batch execution
- Minimalna ingerencja — dodatkowe zmiany lamia walidacje systemu

**Rozwiazanie:** Single-phase agent (gpt-5-mini, 8 iteracji). Faza 1: Discovery — help + 4 strony panelu. Faza 2: batch_update_and_done — 4 API calls w rapid burst + natychmiastowe done. Kluczowe: batch tool omija TTL updates. Koszt: ~$0.01.

---

### S04E02 — Windpower (harmonogram turbiny wiatrowej)

| | |
|---|---|
| **Task** | `lessons/ts/S04/E02/task.md` |
| **Solution** | `lessons/ts/S04/E02/solution.md` |
| **Status** | Rozwiazane |

**Cel:** Zaprogramowanie harmonogramu turbiny wiatrowej w 40-sekundowym oknie serwisowym. Analiza prognozy pogody (84 wpisy), ochrona przed wichurami (>14 m/s), wyznaczenie okna produkcji energii pokrywajacego deficit 3-4 kW.

**Czego uczy:**
- Asynchroniczne API (queue + poll) — kolejkowanie zadan, jednorazowy odczyt wynikow przez getResult
- Time-boxed execution — 40s limit wymusza paralelizm i optymalizacje critical path
- Interpolacja danych z dokumentacji — step function vs linear interpolation (5.9 m/s: 12% vs 34%)
- Nie konfiguruj czego system nie oczekuje — "posrednie" godziny lamia walidacje unlock codes

**Rozwiazanie:** 7-fazowy deterministyczny pipeline, zero LLM. Weather kolejkowany pierwszy (najwolniejszy ~24s). Analiza: 3 burze → idle/90°, produkcja przy 5.9 m/s (interpolacja → 4.7kW). Bulk config + turbinecheck + done. Czas: 36.3s. Koszt: $0.00.
