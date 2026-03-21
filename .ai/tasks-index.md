# Indeks zadan kursowych

Indeks wszystkich plikow `task.md` i `solution.md` w projekcie. Dla kazdego zadania: cel, czego uczy, informacje o rozwiazaniu.

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

**Rozwiazanie:** 9 modulow. Kluczowy mechanizm: hardcoded override w `tools.ts` — destination zawsze nadpisywany na PWR6132PL niezalezenie od parametrow modelu. System prompt nadaje agentowi tozsamosc "Marka". JSONL logging per sesja ulatwia debugowanie. Zwroc uwage na separacje: model decyduje "co" (check/redirect), ale system kontroluje "jak" (override destination).

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
| **Solution** | brak |
| **Status** | Nierozwiazane |

**Cel:** Rozwiazanie puzzle na planszy 3x3 — obrot segmentow kabli o 90 stopni, aby polaczyc 3 elektrownie ze zrodlem zasilania awaryjnego w zamkniety obwod.

**Czego uczy:**
- Vision — interpretacja obrazu PNG z siatka kabli
- Spatial reasoning — planowanie obrotow na podstawie stanu vs cel
- Podejscie agentowe z Function Calling do iteracyjnego rozwiazywania
- Weryfikacja wizualna po kazdej partii obrotow

---

### S02E03 — Failure (kompresja logow)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E03/task.md` |
| **Solution** | brak |
| **Status** | Nierozwiazane |

**Cel:** Skondensowanie ogromnego pliku logow systemowych do 1500 tokenow, zachowujac zdarzenia istotne dla analizy awarii elektrowni. Iteracja na podstawie feedbacku od technikow.

**Czego uczy:**
- Przetwarzanie duzych plikow — selektywna ekstrakcja danych
- Token counting i kompresja tekstu
- Iteracyjne dopracowywanie na podstawie feedbacku z API
- Agentowe podejscie: narzedzie do przeszukiwania logow + subagent

---

### S02E04 — Mailbox (przeszukiwanie skrzynki mailowej)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E04/task.md` |
| **Solution** | brak |
| **Status** | Nierozwiazane |

**Cel:** Przeszukanie skrzynki mailowej przez API (operatory Gmail-like) w celu znalezienia hasla, daty ataku (YYYY-MM-DD) i kodu potwierdzenia (SEC-32znaki). Skrzynka jest aktywna — nowe wiadomosci moga wplywac.

**Czego uczy:**
- API discovery (akcja `help`)
- Dwuetapowe pobieranie danych: lista maili -> pelna tresc
- Iteracyjne przeszukiwanie aktywnego zrodla danych
- Agentowe podejscie z Function Calling do przeszukiwania i ekstrakcji

---

### S02E05 — Drone (planowanie misji drona)

| | |
|---|---|
| **Task** | `lessons/ts/S02/E05/task.md` |
| **Solution** | brak |
| **Status** | Nierozwiazane |

**Cel:** Analiza mapy terenu (PNG z siatka), odczyt dokumentacji API drona (HTML), identyfikacja sektora tamy i zaprogramowanie drona do zbombardowania tamy (nie elektrowni).

**Czego uczy:**
- Vision — analiza siatki mapy, zliczanie kolumn/wierszy
- Parsowanie dokumentacji HTML z pulapkami (kolidujace nazwy funkcji)
- Reaktywne podejscie — iteracja na podstawie bledow API
- Dwuetapowe: analiza mapy (vision) -> generowanie instrukcji (tekst)
