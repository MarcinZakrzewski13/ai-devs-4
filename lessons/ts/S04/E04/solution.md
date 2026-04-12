# S04E04 — filesystem (notatki Natana)

## Czego dotyczy zadanie

Natan Rams spisał na kartkach i w dzienniku informacje o ośmiu miastach — ich potrzebach handlowych, osobach odpowiedzialnych za handel oraz transakcjach między miastami. Zadanie polega na zrekonstruowaniu tych informacji jako wirtualny filesystem udostępniany przez hub (`https://hub.ag3nts.org/verify` + `filesystem_preview.html`): trzy katalogi `/miasta`, `/osoby`, `/towary` z odpowiednimi plikami, a następnie zatwierdzenie struktury akcją `done`.

Wejście:
- `ogłoszenia.txt` — wzmianki o zapotrzebowaniu miast (towary + ilości)
- `rozmowy.txt` — dziennik rozmów telefonicznych Natana z handlarzami w każdym mieście
- `transakcje.txt` — zapis `miasto_A -> towar -> miasto_B` (A jest sprzedawcą)

Wyjście (wszystkie nazwy lowercase, ASCII, pattern `^[a-z0-9_]+$`):
- `/miasta/{nazwa}` — surowy JSON `{ "towar": ilosc, ... }` z potrzebami
- `/osoby/{imie_nazwisko}` — pełne imię + markdown link `[miasto](/miasta/miasto)`
- `/towary/{nazwa}` — markdown lista linków do miast-sprzedawców

## Czego uczy zadanie

- **Ekstrakcja strukturalnych danych z tekstu naturalnego przez LLM** — Structured Output jako kontrakt między modelem a resztą pipeline'u. Model robi jedno: rozumie polską fleksję i scala wzmianki, reszta jest deterministyczna.
- **Disciplina API discovery** — wywołanie `help` przed kodowaniem ujawniło krytyczne ograniczenia (pattern nazw, max długości, `global_unique_names`, "markdown links must point to existing files"), których bez tego trzeba byłoby się uczyć przez trial-and-error.
- **Porządek zależności w batch mode** — reguła "linki muszą wskazywać istniejące pliki" wymusiła, by `/miasta/*` było tworzone przed `/osoby/*` i `/towary/*`. Projekt operacji wynikał z tej zależności, nie z losowej kolejności.
- **Walidator jako oracle** — gdy ekstrakcja LLM była dwuznaczna (kto jest handlarzem w Brudzewie: Kisiel czy Rafał?), `done` zwrócił precyzyjną listę brakujących osób z pełnymi nazwiskami. API stało się źródłem prawdy, które LLM nie mógł wywnioskować samodzielnie.
- **Separacja LLM od buildOps** — build był w 100% deterministyczną funkcją na wyniku LLM, więc iteracje (JSON jako markdown code block → surowy JSON, fix nazw osób) zmieniały tylko cache extracted.json lub `buildOps.ts`, bez ponownego wołania modelu.

## Jak działa rozwiązanie

```
lessons/ts/S04/E04/
├── main.ts             # orkiestracja: load → extract → build → send batch → done
├── types.ts            # ExtractedData, FsOp, ApiResponse
├── loadNotes.ts        # read 3 plików z resources/S04E04/natan_notes/
├── extractData.ts      # LLM: gpt-5-mini + Structured Output + cache
├── buildOps.ts         # ExtractedData → BatchOp[] (czysta funkcja)
├── callFilesystem.ts   # sendBatch + sendDone z @ai-devs/ai-devs-hub
└── analysis-tools/
    └── call-help.ts    # discovery: POST action=help → tmp/api-help.json
```

Pipeline:

```
notes (3 pliki, ~4 KB)
  → extractData() [gpt-5-mini, Structured Output]
      ↓ cache: resources/S04E04/tmp/extracted.json
  → { miasta[], osoby[], towary[] }
  → buildOps() [pure]
  → [reset, createDirectory×3, createFile×8 miast, createFile×8 osób, createFile×13 towarów]
  → sendBatch() → 33 ops, API zwraca code=100 "Batch actions executed."
  → sendDone() → code=0, flaga
```

### Co robi LLM (jedyne miejsce decyzyjne)

Model dostaje scalony tekst trzech plików (z sekcjami `=== ogloszenia ===`, `=== rozmowy ===`, `=== transakcje ===`) i wypełnia schemat:

```ts
{
  miasta: { nazwa, potrzeby: { towar, ilosc }[] }[]
  osoby:  { imie, nazwisko, miasto }[]
  towary: { nazwa, sprzedawcy: string[] }[]
}
```

Zadania wymagające LLM (żadne z nich nie da się deterministycznie):
1. **Mianownik polskiej fleksji** — `45 chlebow` → `chleb`, `120 butelek wody` → `woda`, `workow ryzu` → `ryz`, `porcji wolowiny` → `wolowina`, `kg ziemniakow` → `ziemniaki`.
2. **Mianownik miast** — `w Domatowie` → `domatowo`, `do Pucka` → `puck`, `pod Mechowo` → `mechowo`, `z Opalina` → `opalino`.
3. **Normalizacja znaków** — jednoetapowa transliteracja ą→a, ł→l, ó→o itd., na wszystkich polach równocześnie.
4. **Scalanie wzmianek o osobie** — w rozmowach czasem pada samo imię w jednym zdaniu i samo nazwisko w innym (Kisiel/Rafał dla Brudzewa, Lena/Konkel dla Karlinkowa). Model ma heurystykę: to samo miasto + ten sam kontekst tematyczny = jedna osoba. Nie udało się to za pierwszym razem — walidator `done` ujawnił prawdę.

### Co robi buildOps (pure function)

1. Dodaje `reset` + `createDirectory` dla trzech katalogów.
2. Generuje plik dla każdego miasta jako surowy JSON `{"chleb":45,"woda":120,...}`.
3. Generuje plik dla każdej osoby: `{Imie Nazwisko}\n\n[miasto](/miasta/miasto)`.
4. Generuje plik dla każdego towaru: lista markdown linków do miast-sprzedawców, posortowana alfabetycznie.
5. Waliduje wszystkie nazwy regexem `^[a-z0-9_]+$` i długością ≤ 20.
6. **Nie** dodaje `done` do batcha (bo `done` nie jest w `allowed_actions` batch_mode — wysyłane osobno).

## Dlaczego takie podejście

- **gpt-5-mini zamiast gpt-5** — zadanie leksykalno-gramatyczne, bez skomplikowanego wnioskowania. Nano byłby zbyt słaby na polską fleksję i scalanie wzmianek, gpt-5 przepłacony.
- **Structured Output (strict JSON schema)** zamiast free-text parsing — gwarantuje, że nie wywalimy się na niespodziewanym kształcie odpowiedzi. Całe downstream operuje na jednym typie.
- **Cache `extracted.json`** — iteracje na `buildOps`/contents/order nie wywołują ponownie LLM. Drugi run = darmowy.
- **Osobne `sendBatch` i `sendDone`** — walidator z `help` pokazał, że `done` jest poza batchem, więc modelujemy to jawnie w typie `BatchOp = Exclude<FsOp, {action:"done"}>`. TypeScript pilnuje.
- **JSON bez markdown code block** — pierwsza próba użyła ```` ```json ```` bo tak rozumiałem "only markdown syntax". Walidator `done` zwrócił `code=-811 City file content must be a valid JSON object` — okazało się, że walidator parsuje zawartość `/miasta/*` bezpośrednio jako JSON, a "markdown syntax" dopuszcza plain text (bo plain text to poprawny markdown).
- **Scalanie LLM + patch na cache** — gdy `done` zwrócił `code=-805 missing [Rafał Kisiel, Lena Konkel]`, zamiast rewrite'a prompt + kolejne $ na LLM, poprawiłem dwa rekordy w `extracted.json` (źródło prawdy pochodzi z walidatora). Prompt został zaktualizowany osobno, żeby następny cold run był już poprawny.

## Odpowiedzi API — warte zapamiętania

```jsonc
// help: kluczowe pola
{
  "limits": {
    "max_file_name_length": 20,
    "max_directory_name_length": 30,
    "allowed_name_pattern": "^[a-z0-9_]+$",
    "global_unique_names": true
  },
  "batch_mode": {
    "allowed_actions": ["createFile", "createDirectory", "deleteFile", "deleteDirectory", "reset"]
    // UWAGA: brak "done"
  },
  "rules": [
    "only markdown syntax is accepted in file content",
    "markdown links must point to existing files"
  ]
}

// batch response — code 100 NIE jest błędem, to status "executed"
{ "code": 100, "message": "Batch actions executed.", "results": [ /* per-op */ ] }

// błąd walidatora city file
{ "code": -811, "message": "City file content must be a valid JSON object...", "city": "opalino" }

// błąd walidatora osób — ujawnia pełne nazwy
{ "code": -805, "missing": ["Rafał Kisiel", "Lena Konkel"] }

// sukces
{ "code": 0, "message": "{FLG:DEALWITHIT}" }
```

## Wnioski z lekcji

### 1. API discovery (`help`) przed pisaniem kodu

**Co się wydarzyło.** Zanim cokolwiek zakodowałem, wywołałem `action: "help"` i zapisałem wynik do `tmp/api-help.json`. Natychmiast poznałem: pattern nazw (`^[a-z0-9_]+$`), limity długości, to że `done` nie jest w batch_mode i że linki markdown muszą wskazywać istniejące pliki. Bez tego popełniłbym 3–4 błędy i spalił tokeny na iteracje.

**Analogia.** Przed remontem mieszkania czytasz plan lokalu — nie zaczynasz wiercić w ścianie, bo może za nią jest pion wody.

**Przykład zastosowania.** Każde zadanie z nietrywialnym zewnętrznym API zacznij od 5-liniowego skryptu `analysis-tools/call-help.ts` albo `curl` do `/docs`. Koszt: 0. Oszczędność: godziny i dolary.

### 2. Walidator jako oracle, gdy LLM ma niedobór kontekstu

**Co się wydarzyło.** LLM przy ekstrakcji osób z `rozmowy.txt` widział dla Brudzewa słowo "Kisiel" w jednym zdaniu i "Rafal" w innym — nie miał podstaw, by je scalić jako jedną osobę. Podobnie "Lena" i "Konkel" dla Karlinkowa. Wywołanie `done` zwróciło precyzyjnie `missing: ["Rafał Kisiel", "Lena Konkel"]` — walidator zna prawdę, której my nie znamy. Zamiast zgadywać, spatchowałem cache.

**Analogia.** Nie pytasz znajomego jak się wymawia słowo w obcym języku, skoro masz pod ręką słownik z nagraniami. Walidator to słownik.

**Przykład zastosowania.** Gdy model generuje dane do weryfikacji przez zewnętrzny walidator (schema, testy, CI), traktuj jego odpowiedzi jako źródło prawdy wyższego rzędu niż własna interpretacja tekstu. Błędy walidatora są bezpłatnymi podpowiedziami — szczególnie gdy zawierają szczegóły ("missing X", "expected Y").

### 3. Separacja LLM-call od kształtowania outputu

**Co się wydarzyło.** Przy trzech różnych błędach (`code=-811` JSON w markdown block, `code=-805` brakujące osoby, potem OK) żaden nie wymagał ponownego wywołania LLM — bo cały preprocessing siedział w `buildOps.ts` jako czysta funkcja na cached `extracted.json`. Iteracje były lokalne, tanie i szybkie.

**Analogia.** Fotograf robi raw, potem wywołuje w Lightroomie. Jeśli zmieniasz balans bieli, nie wołasz fotografa z powrotem na sesję.

**Przykład zastosowania.** Każdy pipeline LLM → post-processing dziel na dwa pliki: jeden robi wyłącznie wywołanie modelu i cache'uje wynik; drugi przetwarza wynik na finalną strukturę. Zmiany formatu nigdy nie powinny wymuszać ponownego tokenu.

### 4. Status code ≠ 0 nie zawsze oznacza błąd

**Co się wydarzyło.** Batch zwracał `code: 100` ("Batch actions executed.") — moje pierwsze podejście `if (code !== 0) throw` wywaliło się na happy path. Trzeba było rozróżnić wrapper-status (wykonane pomyślnie mimo code ≠ 0) od błędów w `results[]`.

**Analogia.** HTTP 207 Multi-Status w WebDAV — każda operacja ma własny status, a ogólna odpowiedź 207 tylko mówi "obsłużyliśmy, sprawdź szczegóły". Nie każdy non-200 to error.

**Przykład zastosowania.** Przy batch API zawsze czytaj dokumentację kodów statusu, sprawdzaj wewnętrzne rekordy w `results[]`, a nie tylko top-level `code`. Domyślne `if status !== 200` jest poprawne tylko w RESTowo-kanonicznych API.

## Uruchomienie

```bash
# (jednorazowo) Pobranie notatek
# — zip już rozpakowany w lessons/ts/resources/S04E04/natan_notes/

# (opcjonalnie) Discovery API
bun run lessons/ts/S04/E04/analysis-tools/call-help.ts

# Główny pipeline
bun run lessons/ts/S04/E04/main.ts
```

## Koszt (zmierzony)

| Operacja | Wywołań | Model | Koszt szac. |
|----------|---------|-------|------------|
| `help` discovery | 1 | — | $0 |
| Ekstrakcja (Structured Output) | 1 | `gpt-5-mini` | ~$0.002 |
| Batch (33 ops) | 1 | — | $0 |
| `done` | 1 | — | $0 |
| **Łącznie** | | | **~$0.002** |
