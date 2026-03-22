# S02E02 — Electricity (puzzle rotacji kabli)

## Czego dotyczy zadanie

Puzzle na planszy 3x3 — obrot segmentow kabli o 90 stopni w prawo, aby polaczyc 3 elektrownie (PWR6132PL, PWR1593PL, PWR7264PL) ze zrodlem zasilania awaryjnego w zamkniety obwod. Jeden obrot = jeden request API.

## Czego uczy zadanie

- **Analiza obrazu bez LLM** — zamiast Vision, deterministyczna detekcja kabli przez analize pikseli (czarne paski na jasnym tle)
- **Automatyczne wykrywanie siatki** — detekcja linii grida przez skanowanie gestosci czarnych pikseli w kolumnach/wierszach
- **Spatial reasoning** — obliczanie obrotow na podstawie porownania stanow (rotation = T->R->B->L->T)
- **Walidacja obwodu** — sprawdzenie czy kazde polaczenie miedzy sasiednimi komorkami jest obustronne
- **Iteracyjne debugowanie** — przejscie od Vision (niedokladny) przez pixelowa detekcje (dokladna) do rozwiazania

## Jak dziala rozwiazanie

### Architektura modulow

```
main.ts            — orkiestracja: reset, detect, compute, execute
types.ts           — CellEdge, BoardState, RotationPlan
target-state.ts    — hardcoded target state (z pixelowej analizy solved_electricity.png)
fetch-board.ts     — pobieranie PNG (current/reset) z huba
detect-cables.ts   — detekcja linii grida + kabli przez analize pikseli
compute-rotations.ts — czysta funkcja: porownanie stanow, obliczenie obrotow (0-3 per komorka)
execute-rotations.ts — sekwencyjne POST /verify z { rotate: "AxB" }
```

### Przeplyw danych

```
Reset board → Fetch current PNG
  → detectGrid(): skan pikseli → 4 linie pionowe + 4 poziome
  → detectCables(): skan krawedzi 9 komorek → BoardState
  → computeRotations(current, TARGET_STATE) → RotationPlan
  → executeRotations(plan) → sekwencyjne API calls → flaga
```

### Detekcja kabli (kluczowy mechanizm)

1. **Detekcja siatki**: skan kolumn pikseli — te z >50% czarnych pikseli to linie grida. Z 4 linii pionowych obliczamy rozmiar komorki (~95px) i pozycje poziomych linii.
2. **Detekcja polaczen**: dla kazdej komorki skanujemy srodkowe 50% kazdej krawedzi (omijamy narozniki i linie grida). Jesli >30% pikseli jest czarnych → kabel laczy sie z ta krawedzia.
3. **Reprezentacja**: posortowany string liter krawedzi, np. "BLR" = T-junction (Bottom+Left+Right).

### Target state

Statyczny — przeanalizowany pixelowo z `solved_electricity.png` i zakodowany w `target-state.ts`:

```
BR  | BLR | LR
BT  | BRT | BLR
LRT | LT  | RT
```

Polaczenia zewnetrzne: zrodlo na 3x1 LEFT, elektrownie na 1x3/2x3/3x3 RIGHT.

## Dlaczego takie podejscie

- **Vision models zawiodly** — testowane google/gemini-3-flash-preview na pelnym obrazie i kadrowanych komorkach. Wyniki niespojne, rozne przy kazdym uruchomieniu. Bledy w liczbie polaczen (np. T-junction zamiast straight) uniemozliwialy poprawne obliczenie obrotow.
- **Pixelowa detekcja jest deterministyczna** — kable to grube czarne paski (~30px) na jasnym tle. Skanowanie krawedzi komorek jest szybkie, tanie (zero API calls) i w 100% powtarzalne.
- **Hardcoded target** — obraz docelowy jest statyczny (nigdy sie nie zmienia). Jednorazowa analiza i zakodowanie eliminuje polowe pracy.
- **Walidacja przez connection count** — obroty zachowuja liczbe polaczen kabla. Porownanie counts miedzy current a target to silny test poprawnosci detekcji.

## Zadanie dodatkowe: "Mapa na metapoziomie"

Flaga ukryta w metadanych pliku PNG pobieranego z API (`electricity.png`).

### Jak znaleziono

1. **Parsowanie chunkow PNG** — plik PNG sklada sie z chunkow (IHDR, IDAT, tEXt, IEND...). Chunk `tEXt` przechowuje dowolne metadane tekstowe (klucz-wartosc).
2. **Chunk tEXt** w `electricity.png` zawieral: `Comment FLAG:( N2IsNDYsNGMsNDcsM2EsNGQsNDUsNTQsNDEsNGMsNDUsNTYsNDUsNGMsN2Q= )`
3. **Dekodowanie Base64** → `7b,46,4c,47,3a,4d,45,54,41,4c,45,56,45,4c,7d` (wartosci hex rozdzielone przecinkami)
4. **Hex → ASCII** → kazda wartosc hex to kod znaku: `7b`=`{`, `46`=`F`, `4c`=`L`, `47`=`G`, `3a`=`:`, ... → `{FLG:METALEVEL}`

### Czego uczy

- **Steganografia w metadanych** — pliki PNG moga zawierac dowolne chunki tekstowe (`tEXt`, `iTXt`, `zTXt`) niewidoczne w podgladzie obrazu
- **Wielowarstwowe kodowanie** — flaga zakodowana podwojnie: Base64 → hex CSV → ASCII
- **Podejrzliwość wobec danych** — kazdy plik pobrany z API moze zawierac ukryte informacje poza widoczna trescia
- Narzedzia: `exiftool`, `strings`, lub reczne parsowanie chunkow PNG w kodzie

## Odpowiedzi API / dane referencyjne

- Reset: `GET /data/{key}/electricity.png?reset=1`
- Obrot: `POST /verify` z `{ task: "electricity", answer: { rotate: "AxB" } }` → `{ code: 1, message: "Done" }`
- Flaga glowna: ostatni obrot (jesli board poprawny) → `{ code: 0, message: "{FLG:ROTATEIT}" }`
- Flaga dodatkowa: w metadanych `tEXt` pliku `electricity.png` (zadanie "Mapa na metapoziomie")
- Typowy przebieg: 5-7 obrotow, 0 wywolan LLM

## Koszt rozwiazania

| Operacja | Ilosc | Koszt |
|----------|-------|-------|
| Pixelowa analiza | 2 (target raz, current raz) | $0.00 |
| API rotation calls | 5-7 | $0.00 (hub API) |
| **Lacznie** | | **$0.00** |

Zero kosztow LLM — calkowicie deterministyczne rozwiazanie.

## Uruchomienie

```bash
bun run lessons/ts/S02/E02/main.ts
```
