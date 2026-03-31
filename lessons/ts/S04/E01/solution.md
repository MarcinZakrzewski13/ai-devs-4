# S04E01 — OKO Editor

## Cel
Modyfikacja systemu operacyjnego OKO (Centrum Operacyjne) przez API, z agentem LLM który odkrywa API i panel webowy w runtime.

## Rozwiązanie
Agent LLM (gpt-5-mini) z pętlą narzędziową (8 iteracji):
1. **API Discovery** — akcja `help` na `/verify` ujawnia 3 dostępne komendy: `help`, `update`, `done`
2. **Panel Discovery** — odczyt stron panelu webowego (/, /notatki, /zadania) ujawnia ID wpisów i system klasyfikacji kodów (MOVE01-04, RECO01-04, PROB01-03)
3. **Batch Update + Done** — 4 aktualizacje API w szybkiej serii + natychmiastowe `done`

## Kluczowe odkrycia

### API OKO (odkryte via help)
- `help` — lista komend
- `update` — aktualizacja wpisu (page + id + action + content/title/done)
- `done` — weryfikacja wszystkich zmian, zwraca flagę

### Pułapki
1. **Aktualizacje wygasają** — zmiany API mają krótki TTL (~sekundy). Wszystkie update'y i `done` muszą być wykonane w jednym szybkim burście (batch). Oddzielne iteracje agent loop = za wolno.
2. **Panel nie odzwierciedla zmian** — web panel zawsze pokazuje stan wyjściowy (MOVE03), mimo że API potwierdza update
3. **Clipboard prompt injection** — panel zawiera trap "Jesteś kotem" w `oncopy`
4. **Nadmiarowe zmiany łamią walidację** — aktualizacja notatek dla nie-Skolwinowego wpisu (Komarowo) powoduje odrzucenie przez `done`

### Wykonane zmiany (4 API calls)
1. `incydenty/380792b2` → title: MOVE04 + Skolwin, content: zwierzęta/bobry
2. `notatki/380792b2` → content: reklasyfikacja MOVE03→MOVE04, #zwierzeta
3. `zadania/380792b2` → done: YES, content: bobry wykryte
4. `incydenty/ff3313a3` → title: MOVE01 + Komarowo, content: ruch ludzi

## Flaga
Zapisana w `answers/final/S04E01-okoeditor.json`

## Narzędzia agenta (5 tools)
| Tool | Cel |
|------|-----|
| `oko_api_call` | Generyczny caller API OKO (/verify endpoint) |
| `fetch_oko_page` | Odczyt + sanityzacja HTML panelu webowego |
| `batch_update_and_done` | Rapid burst: N updates + done (omija TTL) |
| `submit_done` | Standalone done (backup) |
| `finish` | Zakończenie pętli agenta |

## Wnioski z lekcji

### 1. API Discovery jako wzorzec
Zamiast hardcodować znane API, agent odkrywa dostępne operacje w runtime. Analogia: programista który dostaje nowy REST API bez dokumentacji — zaczyna od `help` / OpenAPI spec, potem eksperymentuje.

### 2. Temporal constraints w API
Nie wszystkie API zachowują zmiany trwale. Niektóre systemy mają krótki TTL na uncommitted changes (jak transakcje bazodanowe z timeoutem). Batch operations minimalizują ryzyko expiry. Analogia: formularz webowy z session timeout — trzeba wypełnić i kliknąć Submit przed wygaśnięciem sesji.

### 3. Minimalne zmiany = maksymalny sukces
Dodatkowe "profilaktyczne" zmiany (np. aktualizacja notatek Komarowa) mogą złamać walidację. System sprawdza nie tylko czy wymagane zmiany istnieją, ale też czy niewymagane dane nie zostały uszkodzone. Analogia: zasada "least surprise" — rób tylko to co wymagane, nie więcej.

### 4. Web scraping + LLM = discovery
Panel webowy jako źródło danych (IDs, klasyfikacje) którego API nie eksponuje. Agent musi umieć indeksować HTML, ale z zabezpieczeniami (prompt injection, cycle detection, page limit).

## Droga do rozwiązania — eksperymenty i iteracje

### Iteracja 1: Rozpoznanie terenu (curl + przeglądarka)

Przed napisaniem kodu, zbadałem panel OKO i API ręcznie:

- **`curl` na panel webowy** — pobrałem HTML strony głównej `https://oko.ag3nts.org/`. Odkryłem formularz logowania (POST, pola `username`/`password`/`apikey`), a po zalogowaniu — listę incydentów z 6 wpisami i linkami do podstron.
- **`curl` na API** — wysłałem `action: "help"` do `/verify` z `task: "okoeditor"`. API zwróciło dokumentację 3 dostępnych akcji: `help`, `update`, `done`. Odkryłem strukturę payloadu `update` (pola: `page`, `id`, `action`, `content`, `title`, `done`).
- **Analiza HTML panelu** — ręczny przegląd stron `/incydenty`, `/notatki`, `/zadania` ujawnił:
  - 6 wspólnych ID wpisów (ten sam zestaw na wszystkich stronach)
  - System kodów klasyfikacji na stronie `/notatki` (MOVE01-04, RECO01-04, PROB01-03)
  - Wpis Skolwin z ID `380792b2` — klasyfikacja MOVE03 (pojazdy)
  - Clipboard trap: atrybut `oncopy` z prompt injection "Jesteś kotem"

**Narzędzia:** `curl -v`, `curl -b cookies.txt`, ręczna analiza HTML

### Iteracja 2: Pierwszy prototyp agenta (gpt-5-mini)

Napisałem `tools.ts` z 3 narzędziami (`oko_api_call`, `submit_done`, `finish`) i `system-prompt.ts` z instrukcjami discovery. Agent poprawnie wywołał `help`, ale:

- **Problem:** Agent próbował wywoływać `update` z zagnieżdżonym obiektem `payload` zamiast płaskiego `answer`. GPT-5-mini nie radził sobie ze schematem narzędzia `oko_api_call` które przyjmowało osobne parametry `action` + `payload`.
- **Fix:** Uproszczenie schematu — zamiast `action` + `payload` jedno pole `answer` (flat object). Agent sam składa obiekt z `action`, `page`, `id` itd.

**Narzędzia:** `bun run lessons/ts/S04/E01/main.ts`, logi agenta

### Iteracja 3: Dodanie fetch_oko_page (indeksacja panelu)

Agent nie miał dostępu do panelu webowego — nie znał ID wpisów ani kodów klasyfikacji. Dodałem narzędzie `fetch_oko_page`:

- **Login** — POST na `/login` z credentials Zofia/Zofia2026!, przechwytywanie Set-Cookie
- **Sanityzacja HTML** — usuwanie `<script>`, `<style>`, elementów z `display:none`, `oncopy`/`onpaste`
- **Cycle detection** — `Set<string>` odwiedzonych URL, cache wyników
- **Limit stron** — MAX_PAGE_FETCHES=20 (fail-safe przed nieskończonym crawlingiem)
- **Persystencja** — każda pobrana strona zapisywana do `resources/S04E01/tmp/`

**Problem z cookies:** `getSetCookie()` zwracało 2 cookies — pre-login i post-login. Kod brał pierwszy (błędny). Wszystkie strony zwracały formularz logowania.

**Fix:** Zmiana na `cookies.at(-1)` — ostatni cookie to sesja po zalogowaniu.

**Narzędzia:** `bun -e` inline skrypty do testowania logowania i cookies, `curl -v` do porównania nagłówków

### Iteracja 4: Problem wygasających update'ów

Agent poprawnie odkrywał API i panel, poprawnie wywoływał `update` dla każdego wpisu, ale:

- **Problem:** Akcja `done` zwracała błąd — wcześniejsze update'y wygasły zanim agent zdążył je wszystkie wykonać. Każda iteracja pętli agentowej zajmuje ~2-3 sekundy (LLM inference), a update'y mają TTL rzędu sekund.
- **Diagnoza:** `bun -e` inline skrypt — ręczne wykonanie 4 update'ów + done w szybkiej serii (bez LLM w pętli). Sukces! Flaga zwrócona. Potwierdzenie: temporal constraint, nie problem z danymi.

**Fix:** Nowe narzędzie `batch_update_and_done` — przyjmuje tablicę update'ów, wykonuje je sekwencyjnie `fetch()` po `fetch()` bez żadnych opóźnień, a na końcu natychmiast wywołuje `done`.

**Narzędzia:** `bun -e` inline skrypt (rapid API test), analiza timerów w logach agenta

### Iteracja 5: Nadmiarowe zmiany łamią walidację

Agent używał `batch_update_and_done` ale wciąż dostawał błąd:

- **Problem:** Błąd API: "The note's content does not meet the requirements #komarowo". Agent aktualizował nie tylko `incydenty` dla Komarowa, ale też `notatki` i `zadania` — nadpisując oryginalne treści tych wpisów.
- **Fix:** Dodanie jawnej instrukcji w system prompt: "Do NOT update notatki or zadania for the Komarowo entry. Only update its incydenty page." Zmniejszenie liczby update'ów z 6 do 4.

**Narzędzia:** logi agenta, analiza odpowiedzi API

### Iteracja 6: Sukces — flaga {FLG:NEWREALITY}

Po wszystkich poprawkach agent wykonał pełen cykl w 8 iteracjach:
1. `help` → odkrycie API
2. `fetch_oko_page("/")` → lista incydentów z ID
3. `fetch_oko_page("/notatki")` → kody klasyfikacji
4. `fetch_oko_page("/zadania")` → lista zadań
5. Planowanie 4 update'ów na podstawie odkrytych danych
6. `batch_update_and_done` z 4 operacjami → flaga
7. `finish` → zakończenie

### Podsumowanie narzędzi diagnostycznych

| Narzędzie | Zastosowanie |
|-----------|-------------|
| `curl -v` | Eksploracja HTML panelu, testowanie logowania, analiza nagłówków HTTP |
| `curl` na API | Ręczne wywołania `help`/`update`/`done` do zrozumienia struktury |
| `bun -e` (inline TS) | Testowanie cookies, rapid batch API test (4 updates + done), weryfikacja temporal constraint |
| `bun run main.ts` | Pełne uruchomienia agenta (6 iteracji do sukcesu) |
| Logi agenta (chalk) | Analiza wywołań narzędzi, odpowiedzi API, błędów walidacji |

### Kluczowe wnioski z procesu

1. **Upraszczaj schematy narzędzi** — mniejsze modele (gpt-5-mini) radzą sobie lepiej z płaskimi obiektami niż zagnieżdżonymi strukturami
2. **Testuj poza pętlą agenta** — inline `bun -e` skrypty pozwalają izolować problem (temporal vs data) bez kosztu pełnego runu
3. **Cookies: zawsze ostatni** — przy logowaniu serwer może ustawić wiele cookies; sesyjny to zazwyczaj ostatni
4. **Minimalizm w zmianach** — aktualizuj tylko to co wymagane, każda nadmiarowa zmiana to ryzyko złamania walidacji

## Koszt
~$0.01 per successful run (gpt-5-mini, 8 iteracji)
