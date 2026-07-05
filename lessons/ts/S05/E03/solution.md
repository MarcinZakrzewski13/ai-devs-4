# S05E03 — shellaccess

## Czego dotyczy zadanie

Zdalny serwer udostępnia powłokę przez API. W katalogu `/data/` leżą "logi z archiwum czasu". Trzeba ustalić **datę, miasto i współrzędne** miejsca, gdzie znaleziono ciało Rafała, i zwrócić datę **dzień PRZED** znalezieniem. Komendy wysyła się jako `answer.cmd` do `https://hub.ag3nts.org/verify`; hub odsyła stdout, a przy poprawnym `echo` JSON sam waliduje dane i zwraca flagę.

## Czego uczy zadanie

- **Eksploracja nieznanego systemu przez agenta LLM** — identyczny wzorzec co S03E02 (firmware): jedno narzędzie `shell_exec`, model sam decyduje *co* wykonać.
- **Analiza nieustrukturyzowanych logów** — `grep`, `head -c`, `jq` na plikach relacyjnych.
- **JOIN po plikach** — `time_logs.csv` → `locations.json` → `gps.json` łączone kluczami obcymi (`location`/`location_id`, `place`/`entry_id`).
- **Adaptacja do niedokumentowanych ograniczeń środowiska** — read-only FS, limit 4096 B na output, hub przechwytujący *każdy* output w kształcie JSON.
- **Arytmetyka dat** — dzień przed zdarzeniem.

## Jak działa rozwiązanie

Aplikacja agentowa (nie ręczna eksploracja), moduły wg ADR-001:

```
types.ts          — ShellResult, RafalAnswer, AgentResult
shell-client.ts   — execCmd(cmd): POST /verify {task:"shellaccess",answer:{cmd}}
                    + retry na 429/503/520/non-JSON, ekstrakcja {FLG:} z outputu
tools.ts          — shell_exec (jedyne narzędzie domenowe) + finish
system-prompt.ts  — misja: /data → data/miasto/wsp. → dzień PRZED → echo JSON
agent-loop.ts     — pętla tool-call (claude-sonnet-4-6, max 20 iter), detekcja flagi
main.ts           — orkiestracja + startup banner
```

Przepływ: `main` → `runShellAgent` → pętla `callTools` ↔ `shell_exec`. Gdy output zawiera `{FLG:...}`, agent woła `finish` z flagą i obiektem odpowiedzi; loop robi `saveFinalAnswer`.

**Zero hardcode wartości Rafała** — model sam odkrywa nazwy plików, wnioskuje relacje między kluczami, znajduje wpis, liczy datę-1 i składa `echo`.

## Dlaczego takie podejście

Cel kursu: LLM jako centralny decydent, nawet gdy problem da się rozwiązać ręcznie. Poprzednia wersja (5 ręcznych grepów) rozwiązywała zagadkę, ale niczego nie automatyzowała. Agent z shellem generalizuje: ten sam kod poradzi sobie z inną strukturą plików czy innymi nazwami. `claude-sonnet-4-6` (jak S03E02/S04E05) — dobre rozumowanie agentowe i adaptacja do zaskakujących błędów.

## Pułapki napotkane przez agenta (i jak je ominął sam)

1. **Hub waliduje każdy JSON na stdout.** `jq '.[] | select(...)'` zwracał pełne obiekty JSON → hub interpretował je jako *odpowiedź* i odrzucał (`JSON must contain exactly these fields: date, city, latitude, longitude`). Agent przeszedł na `jq -r '... | .name'` / `"\(.latitude) \(.longitude)"` — surowy tekst zamiast JSON.
2. **Read-only filesystem.** Próba `> /tmp/loc.txt` → `can't create ... Read-only file system`. Agent porzucił buforowanie plikowe.
3. **Limit 4096 B.** `grep -i "rafa"` (wiele trafień) → `Output is too large`. Agent zawęził przez `| head` i dodatkowe filtry.

Żadna z tych obsług nie jest w kodzie — to model reagował na komunikaty błędów w runtime.

## Dane referencyjne

- Kluczowy wpis: `2024-11-13;W jaskini znaleziono ciało mężczyzny...;219;954634`
- `location_id 219` → **Grudziądz** (`jq -r '.[] | select(.location_id==219) | .name'`)
- `entry_id 954634` → lat `53.432303`, lon `18.968774`
- Odpowiedź (dzień przed): `{"date":"2024-11-12","city":"Grudziądz","longitude":18.968774,"latitude":53.432303}`

## Wnioski z lekcji

### Terminal jako narzędzie agenta, nie jako skrypt do napisania

- **Co się wydarzyło:** zamiast pisać w TS kod pobierający i JOIN-ujący 3 pliki, dałem agentowi jedno narzędzie `shell_exec` i cały serwer stał się jego środowiskiem. Sam odkrył pliki, klucze i relacje.
- **Analogia:** nie budujesz robota do konkretnego mebla — dajesz stolarzowi warsztat i projekt. Warsztat obsłuży też następne zlecenie.
- **Zastosowanie:** każde zadanie "przekop dane na serwerze X" → jeden shell tool + prompt z celem, zamiast N dedykowanych parserów per format pliku.

### Błąd środowiska to input dla LLM, nie awaria programu

- **Co się wydarzyło:** trzy niespodzianki (JSON-intercept, read-only FS, limit 4096 B) nie wywróciły runu — agent czytał komunikat błędu i zmieniał strategię (`jq` → `jq -r`, plik → field extraction, goły grep → `grep|head`).
- **Analogia:** dobry detektyw traktuje zamknięte drzwi jako wskazówkę, nie jako koniec śledztwa.
- **Zastosowanie:** nie hardcode'uj obejść znanych ograniczeń — opisz cel i pozwól modelowi reagować; deterministyczny skrypt pękłby na pierwszym nieprzewidzianym błędzie.

### Kanał wyjścia bywa jednocześnie kanałem walidacji

- **Co się wydarzyło:** ten sam stdout, który służy do czytania plików, jest też miejscem "submitu" — hub skanuje output pod kątem poprawnego JSON. Dlatego `jq` produkujący JSON kolidował z mechanizmem oceny.
- **Analogia:** mówienie do słuchawki, która nagrywa każde słowo jako oficjalne zeznanie — trzeba uważać, co się "wypowiada".
- **Zastosowanie:** gdy narzędzie miesza dane robocze z danymi kontrolnymi, rozdziel formaty (surowy tekst do inspekcji, ścisły JSON tylko do finalnej odpowiedzi).

## Uruchomienie

```bash
bun run lessons/ts/S05/E03/main.ts
```
