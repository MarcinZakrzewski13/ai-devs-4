# S02 — Plan rozwiazywania zadan

## Przeglad sezonu

Sezon 2 koncentruje sie na **zaawansowanej pracy z modelami** — optymalizacja promptow, vision, kompresja danych, przeszukiwanie zrodel i planowanie misji. W odroznieniu od S01 (pipeline, API, agent loop), tutaj nacisk jest na iteracyjne dopracowywanie wynikow na podstawie feedbacku.

---

## Czesci wspolne i wzorce do wydzielenia

### 1. Petla iteracyjna z feedbackiem (E01, E03, E05)

Trzy zadania wymagaja cyklu: wyslij -> przeczytaj feedback -> popraw -> wyslij ponownie.

- **E01** — prompt testowany na 10 produktach, budzetowanie tokenow, reset i retry
- **E03** — skondensowane logi oceniane przez technikow, poprawki na podstawie ich uwag
- **E05** — instrukcje drona walidowane przez API, korekta na podstawie bledow

**Wzorzec:** Wspolna struktura `feedbackLoop(send, interpret, adjust, maxIter)` — ale kazde zadanie ma inny mechanizm feedbacku, wiec lepiej trzymac to jako konwencje (nie abstrakcje). Kazde zadanie implementuje swoja petle w `main.ts`.

### 2. Vision — analiza obrazow (E02, E05)

Dwa zadania wymagaja analizy PNG przez model z Vision:

- **E02** — siatka 3x3 z kablami, identyfikacja orientacji segmentow
- **E05** — mapa terenu z siatka, identyfikacja sektora tamy

**Wspolne:** Oba uzyja `ImageContentPart` z `@ai-devs/ai-core` (juz zaimplementowane w S01E04). Wzorzec: zaladuj obraz jako Base64 -> wyslij z promptem opisujacym zadanie -> Structured Output na odpowiedz.

**Referencja z S01:** `S01/E04/extractRouteCode.ts` — identyczny wzorzec (Vision + Structured Output).

### 3. API discovery z akcja `help` (E04, nawiazanie do E05-S01)

- **E04** — `POST /api/zmail { action: "help" }` zwraca dokumentacje operacji
- Identyczny wzorzec co S01E05 (`help` -> discovery -> execution)

**Do ponownego uzycia:** Wzorzec `apiClient.ts` z S01E05 (retry na 503/429).

### 4. Agent loop z Function Calling (E02, E03, E04)

Trzy zadania naturalnie pasuja do petli agentowej:

- **E02** — agent z narzedziem `rotate(cell)` + `checkBoard()` (vision)
- **E03** — agent z narzedziem `searchLogs(query)` do przeszukiwania plikow
- **E04** — agent z narzedziami `searchMail(query)`, `readMail(id)`

**Do ponownego uzycia:** `agentLoop.ts` z S01E03 — petla tool-call z limitem iteracji.

### 5. Wspólna infrastruktura z S01

| Element | Pakiet/Zrodlo | Uzycie w S02 |
|---|---|---|
| `sendAnswer()` | `@ai-devs/ai-devs-hub` | Wszystkie zadania |
| `saveTmpAnswer()` / `saveFinalAnswer()` | `@ai-devs/ai-devs-hub` | Wszystkie zadania |
| `createDefaultProvider()` | `@ai-devs/ai-core` | E01, E02, E03, E04, E05 |
| `ImageContentPart`, `MessageContent` | `@ai-devs/ai-core` | E02, E05 |
| `AiTool`, `ToolRegistry` | `@ai-devs/ai-core` | E02, E03, E04 |
| `buildStrictSchema` | `@ai-devs/ai-core` | E01, E02, E03 |
| Retry/backoff z `apiClient.ts` | S01E05 (wzorzec) | E01 (reset/retry), E04 (rate limit) |
| Agent loop z `agentLoop.ts` | S01E03 (wzorzec) | E02, E03, E04 |
| Vision + Structured Output | S01E04 (wzorzec) | E02, E05 |

---

## Plany poszczegolnych zadan

### E01 — Categorize (optymalizacja promptu)

**Cel dydaktyczny:** Prompt engineering pod restrykcyjny limit tokenow, prompt caching, iteracyjne testowanie.

**Architektura modulow:**
```
S02/E01/
  main.ts             — orkiestracja: load CSV -> test prompt -> iterate
  types.ts            — ProductRecord, ClassificationResult, BudgetStatus
  fetchProducts.ts    — GET categorize.csv, parsowanie do ProductRecord[]
  buildPrompt.ts      — generowanie prompta klasyfikacyjnego (< 100 tokenow)
  testPrompt.ts       — wysylka 10 requestow do /verify, tracking budzetu
  evaluateResults.ts  — porownanie wynikow z oczekiwaniami, metryki
  optimizePrompt.ts   — LLM jako "prompt engineer" — poprawia prompt na podstawie bledow
```

**Podejscie:**
1. Pobierz CSV z produktami
2. Zbuduj poczatkowy prompt (recznie lub LLM-generated)
3. Wyslij 10 requestow, zbierz wyniki i zuzycie tokenow
4. Jesli bledy — uzyj LLM do optymalizacji promptu
5. `reset` i powtorz z nowym promptem

**Model:** `gpt-5-mini` (testowany prompt), `gpt-5` (optymalizacja promptu)

**Resources do pobrania:**
- `https://hub.ag3nts.org/data/{apikey}/categorize.csv` — pobierane dynamicznie w runtime (zmienia sie co minute, nie cachujemy)

---

### E02 — Electricity (puzzle rotacji kabli)

**Cel dydaktyczny:** Vision + spatial reasoning, agent loop z function calling, iteracyjna weryfikacja stanu.

**Architektura modulow:**
```
S02/E02/
  main.ts             — orkiestracja: analyze -> plan -> execute -> verify
  types.ts            — CellId, CableOrientation, BoardState, RotateAction
  fetchBoard.ts       — GET electricity.png jako Base64
  analyzeBoard.ts     — Vision: PNG -> BoardState (orientacja kazdej komorki)
  planRotations.ts    — LLM: current state + target -> lista rotacji
  executeRotation.ts  — POST /verify { rotate: "2x3" }
  verifyBoard.ts      — ponowna analiza PNG po rotacjach
```

**Podejscie:**
1. Pobierz aktualny stan planszy (PNG)
2. Vision: opisz orientacje kabli w kazdej z 9 komorek
3. Porownaj z docelowym stanem (solved_electricity.png)
4. Zaplanuj rotacje (kazda rotacja = 90 CW, wiec CCW = 3x CW)
5. Wykonaj rotacje jedna po drugiej
6. Zweryfikuj wizualnie po kazdej partii
7. Jesli nie OK — powtorz od kroku 1

**Alternatywa agentowa:** Agent z narzedziem `rotate(cell)` i `getBoard()` (vision) — sam planuje i weryfikuje.

**Model:** `gpt-5` lub `gpt-5.1` (vision + spatial reasoning wymaga wiekszego modelu)

**Resources do pobrania:**
- `https://hub.ag3nts.org/i/solved_electricity.png` -> `lessons/ts/resources/solved_electricity.png` (statyczny cel — nie zmienia sie)
- `https://hub.ag3nts.org/data/{apikey}/electricity.png` — pobierane dynamicznie (stan planszy zmienia sie po rotacjach)

---

### E03 — Failure (kompresja logow)

**Cel dydaktyczny:** Przetwarzanie duzych plikow, token counting, iteracyjne dopracowywanie na podstawie feedbacku ekspertow.

**Architektura modulow:**
```
S02/E03/
  main.ts             — orkiestracja: load -> extract -> compress -> submit -> iterate
  types.ts            — LogEntry, CompressedLog, TechFeedback
  fetchLogs.ts        — pobranie pliku logow (URL z zadania)
  extractEvents.ts    — LLM: filtracja zdarzen istotnych (power, cooling, pumps, software)
  compressLogs.ts     — formatowanie do jednoliniowych wpisow, skracanie
  countTokens.ts      — walidacja limitu 1500 tokenow przed wyslaniem
  submitLogs.ts       — POST /verify z logs, parsowanie feedbacku technikow
  refineLogs.ts       — LLM: poprawki na podstawie feedbacku (brakujace komponenty, niejasnosci)
```

**Podejscie:**
1. Pobierz plik logow
2. LLM: wyodrebnij zdarzenia istotne dla awarii (severity >= WARN, komponenty reaktorowe)
3. Skompresuj do formatu jednoliniowego, zachowaj timestamp + severity + component ID
4. Sprawdz limit tokenow (< 1500)
5. Wyslij do hubu, przeczytaj feedback technikow
6. Popraw na podstawie feedbacku (dodaj brakujace, wyjasnij niejasne)
7. Powtorz 5-6 az do akceptacji

**Model:** `gpt-5-mini` (ekstrakcja), `gpt-5` (refinement na podstawie feedbacku)

**Resources do pobrania:**
- URL pliku logow (z tresci zadania lub z API) -> `lessons/ts/resources/failure-logs.txt` (lub podobna nazwa)

---

### E04 — Mailbox (przeszukiwanie skrzynki mailowej) ✅ ROZWIAZANE

**Cel dydaktyczny:** API discovery, dwuetapowe pobieranie danych, agent z function calling do przeszukiwania.

**Rozwiazanie:** Petla agentowa z 6 narzedziami, model Gemini Flash. 12 iteracji, koszt ~$0.01. Szczegoly: `S02/E04/solution.md`.

---

### E05 — Drone (planowanie misji drona) ✅ ROZWIAZANE

**Cel dydaktyczny:** Vision (analiza mapy), parsowanie dokumentacji HTML z pulapkami, reaktywne podejscie.

**Rozwiazanie:** Dwuetapowe — Vision gpt-5.4 (siatka 3x4, tama w sektorze 2,4) + deterministyczne 12 instrukcji. Flaga za pierwsza proba. Szczegoly: `S02/E05/solution.md`.

**Resources do pobrania:**
- `https://hub.ag3nts.org/dane/drone.html` -> `lessons/ts/resources/drone-api-docs.html` (statyczna dokumentacja — warto zcachowac)
- `https://hub.ag3nts.org/data/{apikey}/drone.png` — pobierane dynamicznie w runtime

---

## Kolejnosc rozwiazywania

Sugerowana kolejnosc uwzgledniajaca rosnaca zlozonosc i budowanie na poprzednich rozwiazaniach:

1. **E01** — najprostsze: brak agenta, czysta optymalizacja promptu
2. **E04** — API discovery + agent (buduje na S01E03 agentLoop + S01E05 help)
3. **E03** — iteracyjna kompresja z feedbackiem (wymaga dobrej ekstrakcji LLM)
4. **E02** — vision + spatial reasoning (najtrudniejsze vision zadanie)
5. **E05** — vision + parsowanie pulapek + reaktywna petla (laczy wszystko)

---

## Checklist resources do pobrania

| Zadanie | URL | Lokalizacja docelowa | Typ |
|---|---|---|---|
| E01 | `hub.ag3nts.org/data/{apikey}/categorize.csv` | runtime (nie cachuj — zmienia sie) | dynamiczny |
| E02 | `hub.ag3nts.org/i/solved_electricity.png` | `lessons/ts/resources/solved_electricity.png` | statyczny |
| E02 | `hub.ag3nts.org/data/{apikey}/electricity.png` | runtime | dynamiczny |
| E03 | URL logow (z tresci zadania) | `lessons/ts/resources/failure-logs.*` | statyczny |
| E04 | brak statycznych zasobow | — | — |
| E05 | `hub.ag3nts.org/dane/drone.html` | `lessons/ts/resources/drone-api-docs.html` | statyczny |
| E05 | `hub.ag3nts.org/data/{apikey}/drone.png` | runtime | dynamiczny |

**Przed rozpoczeciem S02** pobierz statyczne resources:
```bash
# E02 — docelowy stan planszy
curl -o lessons/ts/resources/solved_electricity.png "https://hub.ag3nts.org/i/solved_electricity.png"

# E05 — dokumentacja API drona
curl -o lessons/ts/resources/drone-api-docs.html "https://hub.ag3nts.org/dane/drone.html"

# E03 — logi (URL do ustalenia z task.md lub API)
# curl -o lessons/ts/resources/failure-logs.txt "<URL_Z_ZADANIA>"
```
