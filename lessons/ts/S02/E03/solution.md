# S02E03 — Failure (kompresja logow)

## Czego dotyczy zadanie

Skondensowanie duzego pliku logow systemowych elektrowni (2137 linii) do max 1500 tokenow, zachowujac zdarzenia istotne dla analizy awarii. Technicy weryfikuja logi i daja feedback, ktore podzespoly sa brakujace.

## Czego uczy zadanie

- **Przetwarzanie duzych plikow** — selektywna ekstrakcja danych z tysiecy linii
- **Token counting** — zliczanie tokenow przed wyslaniem, uwzglednienie roznic miedzy tokenizerem lokalnym a hubem
- **Kompresja tekstu** — deduplikacja, skracanie fraz, priorytetyzacja wg waznosci
- **Iteracyjne dopracowywanie** — feedback loop z API (choc w tym przypadku wystarczyla 1 iteracja)

## Jak dziala rozwiazanie

### Architektura modulow

```
main.ts              ← orkiestracja
fetch-logs.ts        ← pobranie failure.log z huba
parse-logs.ts        ← regex parsing → LogEntry[]
filter-logs.ts       ← filtr WARN/CRIT/ERRO + deduplikacja z (xN) licznikami
compress-logs.ts     ← skracanie fraz + usuwanie WARN aż do limitu tokenow
format-logs.ts       ← LogEntry[] → string
count-tokens.ts      ← js-tiktoken (gpt-4o encoding)
send-and-iterate.ts  ← wyslanie odpowiedzi + parsowanie feedbacku
types.ts             ← typy danych
```

### Przeplyw danych

```
2137 linii (raw)
  → parseLogs()       → 2137 LogEntry[] (regex z timestamp HH:MM:SS → HH:MM)
  → filterLogs()      → 890 (WARN=494, CRIT=114, ERRO=282)
  → deduplicateLogs() → 55 unikalnych wiadomosci z (xN) licznikami
  → compressLogs()    → 38 entries (skrocone frazy, usuniete WARN z najnizszym priorytetem)
  → formatLogs()      → 1344 tokenow (lokalne) → hub akceptuje
```

### Kluczowe mechanizmy

1. **Deduplikacja** — wiele logow powtarza sie (np. ECCS8 runaway temp x9). Zachowujemy 1 wpis z licznikiem `(xN)`.
2. **Priorytetyzacja** — CRIT > ERRO > WARN. Gdy przekraczamy limit, usuwamy WARN od konca.
3. **Deterministyczne skracanie** — zamiana dlugich fraz na krotkie (np. "Protection interlock initiated reactor trip" → "prot interlock trip").
4. **Margines bezpieczenstwa** — cel 1350 tokenow (nie 1500), bo hub uzywa innego tokenizera (~3% rozbieznosc).

## Dlaczego takie podejscie

- **Zero LLM** — kompresja deterministyczna wystarczyla. LLM byloby niepotrzebnym kosztem i zrodlem niedeterminizmu.
- **Deduplikacja kluczowa** — 890 wpisow → 55 unikalnych to 94% redukcja. Sam filtr WARN/CRIT/ERRO nie wystarczy (29k tokenow).
- **Priorytetowe usuwanie WARN** — CRIT i ERRO sa wazniejsze dla analizy awarii. WARN mozna wyrzucic jesli brakuje miejsca.

## Odpowiedzi API

```json
// Sukces (1 iteracja):
{ "code": 0, "message": "{FLG:SQUASHIT}" }

// Blad przekroczenia limitu:
{ "code": -940, "message": "Unfortunately this does not fit in the context window. Stronger compression is needed. Token usage: 1503/1500 (100.2%)." }
```

## Wnioski z lekcji

### 1. LLM jako budowniczy narzedzi, nie jako pracownik na tasmie

Pierwsza proba: wyslac 890 linii do LLM z prosba o kompresje. Wynik: wolne, drogie, niedeterministyczne, nie miesci sie w kontekscie. Drugie podejscie: napisac (z pomoca LLM) regex + dedup + priorytetyzacje. Wynik: natychmiastowe, darmowe, powtarzalne.

**Analogia:** Nie zatrudniasz architekta do recznie murowaniem scian. Zatrudniasz go, zeby zaprojektowal fabryke, ktora mury stawia automatycznie. LLM powinien projektowac narzedzia (kod, reguly, pipeline), a nie byc traktowany jako "magiczny grep na sterydy".

**Przyklad z zycia:** Gdyby ktos mial 10 000 faktur do skategoryzowania, naiwne podejscie to wyslac kazda do GPT. Lepsze: poprosic GPT o napisanie zestawu regul (regex, slownik, decision tree), a potem przetworzyc faktury deterministycznie. LLM pisze kod raz, kod przetwarza dane milion razy.

### 2. Deduplikacja to najwyzsza dzwignia kompresji

Filtr WARN/CRIT/ERRO dal 890 linii (29k tokenow). Deduplikacja — 55 linii (2k tokenow). To 94% redukcji jednym krokiem, bez utraty informacji (liczniki xN zachowuja kontekst czestotliwosci).

**Analogia:** Marie Kondo — najwieksze oszczednosci miejsca nie biora sie z lepszego ukladania, ale z wyrzucenia duplikatow. Zanim zaczniesz kompresowac tekst, usun powtorzenia.

**Zastosowanie ogolne:** W kazdym pipeline przetwarzania duzych danych: najpierw distinct/group by, potem transformacja. Kolejnosc operacji ma ogromne znaczenie dla wydajnosci — to samo co "pushdown predicates" w bazach danych.

### 3. Tokenizery nie sa uniwersalne — zawsze zostaw margines

Lokalne zliczanie (gpt-4o, o200k_base) pokazalo 1465 tokenow. Hub powiedzial 1503. Roznica ~3%. Gdybysmy celowali w 1500, odrzucenie. Cel 1350 dal komfortowy margines.

**Analogia:** Jak z walutami — nigdy nie zakladaj kursu 1:1. Kantor zawsze ma spread. Rozne tokenizery to rozne "kantory" — ten sam tekst moze miec inna "wartosc" w roznych systemach.

**Regula:** Przy twardych limitach tokenowych celuj w 90% limitu. Lepiej wyslac krotszy tekst niz dostac odrzucenie i placic za retry.

### 4. Degradacja priorytetowa zamiast rownomiernego obcinania

Gdy 55 wpisow nie miescilo sie w limicie, nie skracalismy kazdego rowno. Zamiast tego usuwalismy calymi wpisami, zaczynajac od WARN (najmniej krytyczne). CRIT i ERRO zostaly nienaruszone.

**Analogia:** Triaz na izbie przyjec — lekarz nie poswiecal kazdemu pacjentowi po 2 minuty. Najpierw ci w stanie krytycznym, potem reszta jesli starczy czasu. Dane tez maja priorytety — nie traktuj ich demokratycznie.

**Zastosowanie ogolne:** W kazdym systemie z ograniczonym budzetem (tokenow, czasu, pamieci): zdefiniuj priorytety i degraduj od dolu. Lepiej miec 100% informacji CRIT + 0% WARN niz 60% obu.

### 5. Feedback loop z API to mechanizm samonaprowadzajacy

Zadanie sugerowalo iteracyjne podejscie: wyslij, przeczytaj feedback, popraw, powtorz. Hub zwracalby precyzyjnie brakujace podzespoly. Choc w naszym przypadku jedna iteracja wystarczyla, infrastruktura byla gotowa.

**Analogia:** Naprowadzany pocisk vs balistyczny. Pocisk balistyczny liczy trajektorie raz i leci. Naprowadzany koryguje kurs na biezaco. Iteracyjne API to jak czujnik naprowadzania — kazda odpowiedz koryguje nastepna probe.

**Zastosowanie ogolne:** Przy integracji z API, ktore daje informacyjne bledy (nie tylko "error 400"), warto zbudowac petle korekcyjna. Jeden dobrze zaprojektowany feedback loop zastepuje godziny debugowania.

## Extra flag: "Tokeny zlych odpowiedzi to znaki - nadaj FLAG"

### Flaga: `{FLG:VIBECODER}`

### Jak doszlismy do rozwiazania — krok po kroku

**Krok 1: Rozpoznanie terenu — probkowanie bledow.**
Zaczelismy od wyslania roznych typow blednych danych do huba, aby zmapowac wszystkie mozliwe kody bledow:

| Kod | Wyzwalacz | Wiadomosc |
|-----|-----------|-----------|
| `-990` | brak pola `logs` | Missing required field "logs" |
| `-980` | `logs` nie jest stringiem (null, number, array) | Field "logs" must be plain text |
| `-970` | pusty string `""` | Field "logs" cannot be empty |
| `-960` | za krotki tekst / bzdury / <10 linii | These logs seem too short to analyze |
| `-940` | tekst >1500 tokenow | Does not fit in context window |

Na tym etapie nie znalezlismy nic ukrytego — standardowe walidacje.

**Krok 2: Slepa uliczka — kody bledow jako ASCII.**
Probowalismy interpretowac kody bledow (-970 → 70 → ASCII 'F'). Pasowalo do 'F', ale inne kody (-980, -960) nie tworzyly FLAG. Slepa uliczka.

**Krok 3: Slepa uliczka — token IDs z tokenizera.**
Probowalismy znalezc tekst, ktorego token IDs (z o200k_base) ulozylyby sie w FLAG. Odkrylismy ze "FLAG" tokenizuje sie jako jeden token [85712], a pojedyncze litery F=37, L=43, A=32, G=38. Dekodowanie [70,76,65,71] dalo "gmbh" — tez slepa uliczka.

**Krok 4: Wskazowka od uzytkownika — "wszystko jest tokenem".**
Kluczowa informacja: chodzi dosłownie o tokeny LLM. Tekst wysylany do Centrali jest tokenizowany. Trzeba sprawic, by z tokenow wyszedl tekst "FLAG". Hint: sprawdzaj debug i odpowiedzi API po wyslaniu danych.

**Krok 5: Przelom — odkrycie progu 10 linii.**
Zamiast szukac w kodach bledow, sprawdzilismy minimalna wielkosc danych, ktora nie zwraca -960 ("too short"). Okazalo sie, ze 10 linii to minimum. Przy 10 liniach hub zwrocil NOWY kod bledu:

```json
{
  "code": -949,
  "message": "Thanks for sending the logs. Unfortunately, our technicians still do not know what happened to STMTURB12.",
  "tokenCount": 209,
  "lineCount": 10,
  "noLetterSent": ""
}
```

Kluczowe odkrycie: pole `noLetterSent: ""` — hub mowi nam, ze NIE wyslano zadnej litery! Plus pole `tokenCount` — hub mierzy dokladna liczbe tokenow.

**Krok 6: Polaczenie kropek — tokenCount = ASCII = litera.**
Wskazowka "tokeny zlych odpowiedzi to znaki" + pole `noLetterSent` + pole `tokenCount` → jezeli tokenCount = kod ASCII litery, to hub powinien "odebrac" te litere.

Proba: wyslano logi o dokladnie 70 tokenach (ASCII 'F' = 70):

```json
{
  "code": -949,
  "tokenCount": 70,
  "letter": "F"   // <-- pole zmienilo nazwe z "noLetterSent" na "letter"!
}
```

**Krok 7: Nadanie calego slowa FLAG.**
Wysylamy kolejno logi o token count = ASCII kazdej litery:
- 70 tokenow → `"letter": "F"`
- 76 tokenow → `"letter": "L"`
- 65 tokenow → `"letter": "A"`
- 71 tokenow → `"letter": "G"` + odpowiedz:

```json
{ "code": 100, "message": "Secret: {FLG:VIBECODER}" }
```

### Dlaczego to dziala

Hub tokenizuje kazda przychodzaca wiadomosc. Przy blednych logach (code -949) zwraca `tokenCount`. Jezeli ten count odpowiada kodowi ASCII litery z ciagu "FLAG", hub rejestruje nadanie tej litery. Po nadaniu wszystkich 4 liter (F→L→A→G w kolejnosci) — flaga.

Slowo "nadaj" to termin z radiotelegrafii — dosłownie "transmituj znak". Kazdy request to "nadanie" jednego znaku, gdzie nosnikiem informacji jest liczba tokenow.

### Skrypt

```bash
bun run lessons/ts/S02/E03/probe-flag-final.ts
```

## Uruchomienie

```bash
# Glowne zadanie (kompresja logow):
bun run lessons/ts/S02/E03/main.ts

# Extra flag (nadanie FLAG tokenami):
bun run lessons/ts/S02/E03/probe-flag-final.ts
```

Koszt: $0.00 (brak wywolan LLM).
