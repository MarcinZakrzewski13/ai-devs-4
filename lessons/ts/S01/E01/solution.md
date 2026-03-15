# S01E01 — People (klasyfikacja zawodów kandydatów)

## Czego dotyczy zadanie

Zadanie polega na przetworzeniu pliku CSV z danymi osobowymi, odfiltrowaniu kandydatów spełniających kryteria demograficzne, a następnie sklasyfikowaniu ich zawodów za pomocą LLM. Finalna odpowiedź zawiera osoby z tagiem "transport".

## Czego uczy to zadanie

1. **Structured Output** — wymuszanie schematu JSON na odpowiedzi modelu. Zamiast parsować wolny tekst, definiujemy schemat z `strict: true`, a model zwraca dokładnie tę strukturę. Eliminuje to hallucynacje w formatowaniu i daje gwarancję typów.

2. **Enum constraints w schemacie** — tagi zawodów ograniczone do 7 predefiniowanych wartości. Model nie może wymyślić własnych kategorii — to kluczowa technika przy klasyfikacji.

3. **Separacja logiki deterministycznej od LLM** — filtrowanie po płci, mieście, wieku to czyste funkcje (bez LLM). LLM używany tylko tam, gdzie potrzebna jest interpretacja języka naturalnego (opis zawodu → kategoria).

4. **Batch processing** — wszystkie opisy zawodów wysyłane w jednym wywołaniu API zamiast osobno dla każdego kandydata. Oszczędność kosztów i latencji.

5. **Pipeline danych** — wzorzec load → filter → classify → build → verify, gdzie każdy krok to osobny moduł z jedną odpowiedzialnością.

## Jak działa rozwiązanie

### Architektura modułów

```
lessons/ts/S01/E01/
├── main.ts              # orkiestracja pipeline'u
├── types.ts             # PersonRecord, JobTag, PersonAnswer
├── loadPeople.ts        # parsowanie CSV z resources/people.csv
├── filterCandidates.ts  # filtracja: M, Grudziądz, wiek 20-40
├── classifyJobs.ts      # klasyfikacja zawodów przez gpt-5-mini (Structured Output)
├── buildAnswer.ts       # filtracja po tagu "transport", transformacja formatu
└── verifyAnswer.ts      # wysyłka do Hub, zapis flagi
```

### Przepływ danych

```
people.csv
  → loadPeople() → PersonRecord[]
  → filterCandidates() → PersonRecord[] (M, Grudziądz, 20-40 lat)
  → classifyJobs() → Map<number, JobTag[]> (gpt-5-mini, Structured Output)
  → buildAnswer() → PersonAnswer[] (tylko z tagiem "transport")
  → verifyAnswer() → POST /verify → {FLG:...}
```

### Kluczowy moduł: `classifyJobs.ts`

- Model: `gpt-5-mini` via `createDefaultProvider()`
- Schema: array of `{ id, tags[] }` z enum constraint na tagach
- System prompt w języku polskim definiuje 7 kategorii zawodów
- Pole `id` zamiast indeksu tablicy — eliminuje off-by-one errors
- `strict: true` — gwarancja zgodności ze schematem na poziomie API

## Dlaczego takie podejście

| Decyzja | Uzasadnienie |
|---|---|
| `gpt-5-mini` | Klasyfikacja prostych opisów zawodów — wystarczy lekki model |
| Structured Output | Eliminacja parsowania, gwarancja typów, enum constraint na tagach |
| Batch w jednym callu | Jeden request zamiast N — tańsze i szybsze |
| Filtracja przed LLM | Deterministyczne kryteria (płeć, miasto, wiek) nie wymagają AI — oszczędność tokenów |
| Osobny `filterCandidates.ts` | Czysta funkcja, łatwa do testowania, zero zależności od LLM |

## Uruchomienie

```bash
bun run lessons/ts/S01/E01/main.ts
```
