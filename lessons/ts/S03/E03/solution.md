# S03E03 — Reactor (nawigacja robota)

## Czego dotyczy zadanie

Doprowadzenie robota transportujacego modul chlodzenia przez plansze 7x5 z ruchomymi blokami reaktora. Robot porusza sie po dolnym wierszu (row 5) od kolumny 1 do kolumny 7.

## Czego uczy zadanie

- **Reagowanie na zmieniajacy sie stan otoczenia** — agent (robot) musi podejmowac decyzje na podstawie aktualnego stanu planszy zwracanego przez API
- **Predykcja stanu** — bloki poruszaja sie z kazda komenda, wiec decyzja musi uwzgledniac przyszla pozycje blokow, nie obecna
- **Discovery API** — format odpowiedzi nieznany z gory, trzeba go odkryc wysylajac `start`
- **Deterministyczna petla decyzyjna** — caly problem rozwiazalny bez LLM, prostym algorytmem

## Jak dziala rozwiazanie

5 modulow, zero LLM:

```
main.ts            — petla gry: start -> decide -> send -> parse -> repeat
types.ts           — Command, ApiBlock, ReactorState, ReactorResponse
reactor-api.ts     — sendCommand() POST /verify z retry na 429/503
parse-state.ts     — parsowanie JSON response -> ReactorState
decide-command.ts  — algorytm decyzyjny z predykcja blokow
```

**Przeplyw:**
```
start -> parseState -> while (!goalReached) { decideCommand -> sendCommand -> parseState }
```

**Algorytm decyzyjny:**
1. Predykcja pozycji blokow po nastepnym ruchu
2. Jesli kolumna na prawo bezpieczna (brak bloku w row 5) -> `right`
3. Jesli nie, ale obecna pozycja bezpieczna -> `wait`
4. Jesli obie niebezpieczne -> `left`

**Predykcja ruchu blokow:**
- Block `direction=down`: top_row += 1; jesli bottom_row osiagnie 5 -> odwraca na `up`
- Block `direction=up`: top_row -= 1; jesli top_row osiagnie 1 -> odwraca na `down`
- Kierunek w API = kierunek NASTEPNEGO ruchu (po ewentualnym odwroceniu)

## Dlaczego takie podejscie

- **Zero LLM** — problem jest w pelni deterministyczny, algorytm 1-step lookahead wystarczyl
- **Discovery phase** — wyslanie `start` + kilka `wait` ujawnilo dokladny format API i mechanike ruchu blokow
- **Prosty algorytm** — zamiast pelnego pathfindingu, wystarczyla prosta heurystyka (right > wait > left) z predykcja jednego kroku naprzod

## Odpowiedzi API / dane referencyjne

**Start response:**
```json
{
  "code": 100,
  "message": "Reactor board initialized.",
  "board": [[".",".",".",...],...],
  "player": {"col": 1, "row": 5},
  "goal": {"col": 7, "row": 5},
  "blocks": [{"col": 2, "top_row": 3, "bottom_row": 4, "direction": "down"}, ...],
  "reached_goal": false
}
```

**Sukces:**
```json
{"code": 0, "message": "{FLG:INSTALLED}"}
```

Rozwiazanie w 8 krokach: start, wait, right, right, wait, right x4.

## Wnioski z lekcji

### Predykcja stanu > reakcja na stan

**Co sie wydarzylo:** Naiwne sprawdzanie "czy teraz jest bezpiecznie na prawo" nie wystarczyloby — bloki poruszaja sie z kazda komenda, wiec w momencie ruchu plansza juz wyglada inaczej. Kluczowa byla predykcja pozycji blokow NASTEPNEGO kroku.

**Analogia:** Przechodzenie przez ruchliwe skrzyzowanie — nie patrzysz gdzie samochody SA, tylko gdzie BEDA gdy wejdziesz na pasy.

**Przyklad zastosowania:** Agent handlujacy na gieldzie nie powinien reagowac na obecna cene, ale na przewidywany trend. Agent planujacy spotkania powinien uwzgledniac czas dojazdu, nie tylko obecna lokalizacje.

### Discovery before implementation

**Co sie wydarzylo:** Format API byl nieznany. Zamiast zgadywac, wyslalismy `start` + 6x `wait` i zaobserwowalismy dokladna mechanike ruchu blokow (kiedy odwracaja kierunek, jak kodowany jest stan). To pozwolilo napisac parser i predykcje za pierwszym podejsciem.

**Analogia:** Lekarz nie przepisuje leku bez zbadania pacjenta — nawet jesli objawy wydaja sie oczywiste.

**Przyklad zastosowania:** Przed budowa integracji z nowym API, zawsze warto wyslac kilka probnych requestow i zapisac odpowiedzi do analizy, zamiast polegac na dokumentacji (ktora moze byc niepelna lub nieaktualna).

### Prostota algorytmu vs overengineering

**Co sie wydarzylo:** Rozwazone byly multi-step lookahead, A* pathfinding, a nawet uzycie LLM do podejmowania decyzji. W praktyce wystarczyla 3-liniowa heurystyka: right > wait > left z 1-step prediction. Rozwiazanie w 8 krokach.

**Analogia:** Nie potrzebujesz GPS do przejscia przez korytarz — wystarczy patrzec gdzie idziesz.

**Przyklad zastosowania:** Zanim siegniesz po zlozony algorytm lub LLM, sprawdz czy prosta heurystyka nie rozwiazuje problemu. Wielu agentow mozna uproscic do deterministycznych regul z fallbackami.

## Extra flag

**Podpowiedz:** "Thorin i Gandalf, czyli... gdzie idze?" → "Hobbit, czyli tam i z powrotem"

**Mechanika:** Robot musi wykonac 5x `right` + 5x `left` (z `wait` dla bezpieczenstwa gdy blok zagraza). Po ukonczeniu sekwencji flaga pojawia sie na `reactor_preview.html`.

**Kluczowe:** nie uzywac `left` w fazie forward ani `right` w fazie backward — tylko `wait` jako bufor bezpieczenstwa. Kierunek ruchu musi byc konsekwentny.

## Uruchomienie

```bash
bun run lessons/ts/S03/E03/main.ts
```
