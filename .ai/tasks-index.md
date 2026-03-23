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
