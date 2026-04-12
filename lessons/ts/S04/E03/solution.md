# S04E03 — Domatowo: Ewakuacja partyzanta

## Czego dotyczy zadanie

Zadanie symuluje operację ewakuacyjną na planszy 11×11 pól. Partyzant ukrywa się losowo
w jednym z 14 pól B3 (3-piętrowe bloki — "najwyższe"). Gracz dysponuje transporterami
(ruch po drogach, 1 pkt/pole) i zwiadowcami (ruch dowolny, 7 pkt/pole), budżetem 300
punktów akcji i musi wywołać helikopter na pole z partyzantem.

## Czego uczy zadanie

- **Budowa agenta taktycznego z tool calling** — LLM jako strateg z dostępem do serii
  akcji API (create, move, dismount, inspect, getLogs, callHelicopter)
- **Projektowanie systemu promptu z kontekstem przestrzennym** — mapa ASCII + opis
  sieci dróg + koszty akcji przekazane do modelu przed pętlą
- **Hybrydowe podejście**: deterministic (parsowanie mapy, ASCII viz, identyfikacja B3) +
  LLM (planowanie kolejności inspekcji, interpretacja logów, decyzja o helikopterze)
- **Ograniczenia budżetowe jako constraint** — agent musi planować z uwzględnieniem
  kosztu każdego ruchu
- **Interpretacja naturalnego języka w logach API** — odpowiedzi inspekcji są w polskim
  prozie ("Brak człowieka...", "Znaleziono..."); agent decyduje na ich podstawie

## Jak działa rozwiązanie

### Moduły

```
main.ts          — pobiera mapę, resetuje planszę, uruchamia agenta
map-analysis.ts  — parsuje grid JSON → B3 tiles, ASCII mapa dla system prompt
system-prompt.ts — buduje kontekst: mapa, klastry B3, sieć dróg, koszty, strategia
tools.ts         — AiTool: domatowo_action (wszystkie akcje API) + finish
agent-loop.ts    — standardowa pętla tool-calling (60 iteracji max)
domatowo-api.ts  — raw fetch do hub.ag3nts.org/verify
```

### Przepływ danych

```
getMap() → analyzeMap() → ASCII + B3 list → buildSystemPrompt()
         ↓
runAgentLoop(gpt-5-mini, systemPrompt)
         ↓
[create transporter + 3 scouts] → [move → dismount × 3] → [inspect → getLogs × N]
         ↓
callHelicopter(destination) → {FLG:WEVEGOTHIM}
```

### Strategia transportu (przekazana w system prompt)

```
Spawn A6 → D6 → D9 → B9   (dismount scout A dla klastra dół-lewo)
           → I9            (dismount scout B dla klastra dół-prawo)
           → D9 → D2       (dismount scout C dla klastra góra)
```

Transporter kosztuje 1 pkt/pole, scout 7 pkt/pole — kluczowe jest więc jak najdłuższe
wożenie zwiadowców i minimalizacja ich marszu.

## Dlaczego takie podejście

**LLM zamiast deterministycznej pętli**: zadanie wymaga interpretacji polskojęzycznych
logów inspekcji (nieznany format a priori), adaptacji kolejności pól do odkrytych
wyników, reagowania na błędy API (np. brakujące parametry). Agent LLM radzi sobie
z tym bez hardkodowania każdego kroku.

**Kontekst przestrzenny w promptcie**: zamiast dawać agentowi narzędzie `getMap`
(iteracja tracona), mapa jest pre-ładowana w `main.ts` i wbudowana w system prompt.
Agent od razu widzi topografię, B3 tiles, sieć dróg i proponowaną trasę.

**Jeden tool `domatowo_action`**: zamiast 8 osobnych narzędzi — jeden generyczny wrapper
z rozbudowanym opisem. Upraszcza schemat i zmniejsza rozmiar kontekstu narzędzi.

## Odpowiedzi API

Kluczowe kody odpowiedzi:
- `code: 10` — obiekt utworzony (odpowiedź na create)
- `code: 20` — ruch zakolejkowany (queue_id)
- `code: 30` — inspekcja wykonana (entries: N)
- `code: 40` — wysadzenie zakończone
- `code: 60` — logi załadowane (tablica `logs[]`)
- `code: 0`  — sukces, flaga w `message`
- `code: -9xx` — błąd (brakujące pola, zły hash)

Format logu inspekcji:
```json
{ "scout": "<hash>", "msg": "Nie ma tu nikogo. ...", "field": "B10" }
```

Pozytywna detekcja partyzanta: brak słów "nie ma", "brak", "nikogo", "żadnych", "pusto"
w połączeniu z obecnością "człowiek", "partyz", "znalezion".

## Przebieg konkretnej sesji

| Iteracja | Kluczowa akcja | Pkt pozostałe |
|----------|----------------|---------------|
| 3 | create transporter + 3 scouts | 280 |
| 9 | move T → D6 | 277 |
| 11 | move T → D9 | 274 |
| 14 | dismount scout A (D8) | 274 |
| 15 | move T → I9 | 269 |
| 17 | dismount scout B (I8) | 269 |
| 18 | move T → D2 | 257 |
| 20 | dismount scout C (J9) | 257 |
| 29–43 | inspekcje klastra dół-lewo (B10,A10,B11,C11,C10) | 194 |
| 44–49 | inspekcje klastra dół-prawo (I10,H10) | 170 |
| 50 | callHelicopter(H10) → flaga odebrana | — |

Użyte 73 z 300 punktów akcji (24%).

## Wnioski z lekcji

### 1. Kontekst przestrzenny > narzędzie "pobierz mapę"

**Co się wydarzyło**: Pierwotnie rozważałem danie agentowi narzędzia `getMap`. Zamiast
tego mapę pobrano w `main.ts` i wbudowano do system prompt jako ASCII.

**Analogia**: Dobre briefowanie żołnierza przed misją zamiast wysyłania go bez mapy
i każenia prosić o nią przez radio w trakcie. Informacja w briefingu = zero czasu
i budżetu na pobranie.

**Przykład zastosowania**: Gdy agent ma eksplorować zbiór dokumentów — ładuj ich
spis treści do kontekstu z góry, a nie jako tool call w pętli.

---

### 2. Jeden tool generyczny vs. wiele specjalizowanych

**Co się wydarzyło**: Zaprojektowałem `domatowo_action` z parametrami `action` i `params`
zamiast osobnych narzędzi (create_unit, move_unit, inspect itp.). Agent radził sobie
dobrze — uczył się z błędów API (np. "Missing required object field").

**Analogia**: Scyzoryk szwajcarski z instrukcją jak używać każdego ostrza vs. teczka
z 8 osobnymi narzędziami. Gdy narzędzi jest <10 i są podobnej natury — jeden wrapper
z dobrym opisem jest czystszy.

**Przykład zastosowania**: API z wieloma endpointami tego samego systemu (CRUD) —
jeden tool z parametrem `method` zamiast czterech osobnych.

---

### 3. Budżet jako constraint wymusza planowanie

**Co się wydarzyło**: System prompt zawierał konkretne koszty (scout: 7 pkt/pole,
transporter: 1 pkt/pole, 300 pkt budżetu). Agent spontanicznie wybrał strategię
transportera zamiast pieszego marszu — dokładnie jak przewidywała analiza.

**Analogia**: Podróżnik z limitowaną kartą kredytową inaczej planuje trasę niż ten,
który płaci gotówką bez limitu. Constraint wymusza optymalne decyzje.

**Przykład zastosowania**: Agenty z ograniczeniami (API rate limit, czas, tokeny) —
zawsze przekazuj konkretne liczby do kontekstu, nie ogólne "oszczędzaj zasoby".

## Uruchomienie

```bash
bun run lessons/ts/S04/E03/main.ts
```
