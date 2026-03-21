# S02E01 — Categorize (optymalizacja promptu)

## Czego dotyczy zadanie

Napisanie kompaktowego promptu (<100 tokenow) klasyfikujacego 10 towarow jako DNG (niebezpieczny) lub NEU (neutralny). Prompt jest wysylany do wewnetrznego, archaicznego modelu huba z bardzo malym oknem kontekstowym. Produkty zwiazane z reaktorem musza byc klasyfikowane jako NEU pomimo niebezpiecznych opisow (przemyt kaset paliwowych).

## Czego uczy zadanie

- **Prompt engineering pod restrykcyjny limit tokenow** — kazde slowo kosztuje, trzeba byc zwiezlym
- **Prompt caching** — statyczny poczatek promptu obniza koszty (cached tokens = polowa ceny)
- **Iteracyjne doskonalenie promptu** — infrastruktura do testowania, ewaluacji i optymalizacji kolejnych wersji
- **Wyjatki w klasyfikacji** — celowe "oszukiwanie" systemu (reactor = NEU)
- **Budzetowanie tokenow** — 1.5 PP na 10 requestow, kazdy blad = utrata budzetu

## Jak dziala rozwiazanie

### Architektura modulow

```
S02/E01/
  main.ts             — orkiestracja petli: reset -> fetch -> test -> evaluate -> optimize
  types.ts            — Product, ItemResult, CycleResult
  fetchProducts.ts    — pobiera CSV, zapisuje all-products.csv + current-batch.csv
  buildPrompt.ts      — laduje template z pliku current-prompt.txt
  testPrompt.ts       — wysyla 10 requestow, zbiera szczegolowe wyniki
  evaluateResults.ts  — zapisuje prompt-vN.md z pelna ocena
  optimizePrompt.ts   — LLM (claude-sonnet) optymalizuje prompt na podstawie bledow
  countTokens.ts      — tiktoken walidacja dlugosci promptu
```

### Przeplyw danych

```
reset budget -> fetch CSV -> load prompt template -> count tokens (walidacja <100)
  -> test 10 products -> evaluate & save prompt-vN.md
  -> flag? -> DONE
  -> errors? -> LLM optimize -> save new prompt -> LOOP
```

### Prompt ktory zadzialal (v1)

```
DNG=weapon/explosive. NEU=everything else. Reactor/nuclear=ALWAYS NEU. Reply one word.
{code}: {description}
```

33 tokeny template, ~44-48 z produktem. Statyczny prefix (31 tokenow) cache'owany od 2. requestu.

## Dlaczego takie podejscie

- **Prosty prompt zamiast overengineeringu** — maly model huba potrzebuje jasnych regul, nie skomplikowanych instrukcji
- **Explicit keyword "Reactor/nuclear=ALWAYS NEU"** — wystarczajaco silny sygnal dla malego modelu
- **Infrastruktura iteracyjna** — nawet jesli v1 zadziala, system jest gotowy na wiele prob z historia i LLM-optymalizacja
- **Zbieranie produktow na dysk** — buduje baze wiedzy o puli produktow dla przyszlych optimizacji

## Odpowiedzi API / dane referencyjne

- Hub zwraca `code: 1, message: "ACCEPTED"` dla poprawnej klasyfikacji
- Hub zwraca `code: -890, message: "NOT ACCEPTED"` dla blednej
- Hub zwraca `code: -910` gdy budjet sie skonczy
- Flaga przychodzi z ostatnim (10.) produktem: `code: 0, message: "ACCEPTED - {FLG:...}"`
- Blad klasyfikacji natychmiast zeruje balance (kara)

### Statystyki udanego runu

- Prompt tokens: 33 (template) / 40-48 (z produktem)
- Budget used: 0.682 PP z 1.5 PP
- Cache hit rate: 60.7%
- Cached tokens: 31 (staly prefix)

## Uruchomienie

```bash
bun run lessons/ts/S02/E01/main.ts
```

Pliki danych w `lessons/ts/resources/S02E01/`:
- `all-products.csv` — kolekcja wszystkich widzianych produktow
- `current-batch.csv` — ostatni batch
- `prompt-v*.md` — historia promptow z ocenami
- `current-prompt.txt` — aktualny template
