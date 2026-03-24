# S03E02 — Firmware

## Czego dotyczy

Debugowanie i uruchomienie firmware Emergency Core Cooling System (ECCS) na ograniczonej maszynie wirtualnej dostepnej wylacznie przez Shell API (`/api/shell`). VM ma niestandardowy shell (ograniczona lista komend), restrykcje bezpieczenstwa (ban za czytanie plikow z .gitignore) i celowo zepsuta konfiguracje.

## Cele dydaktyczne

- **Petla agentowa z Function Calling** — agent sam decyduje co robic dalej na podstawie wynikow komend
- **Eksploracja nieznanych srodowisk** — zaczynaj od `help`, nie zakladaj ze znasz komendy
- **Odpornosc na bledy** — bany, lock file, bledna konfiguracja — kazdy problem to informacja
- **Respektowanie ograniczen** — .gitignore to "nie dotykaj", nie "sprawdz co tam jest"

## Jak dziala rozwiazanie

Petla agentowa z modelem `anthropic/claude-sonnet-4-6` i 3 narzedziami:

1. **shell_exec** — wykonuje komende na VM
2. **submit_answer** — wysyla kod ECCS do Centrali
3. **finish** — konczy agenta

Agent autonomicznie:
1. Poznaje komendy (`help`) — dostepne: `ls`, `cat`, `cd`, `pwd`, `rm`, `editline`, `reboot`, `date`, `grep`
2. Prubuje uruchomic binary → brak hasla
3. Szuka hasla → `grep -r "pass"` → `/home/operator/notes/pass.txt` → `admin1`
4. Prubuje ponownie → lock file blokuje
5. Usuwa lock file → `rm cooler-is-blocked.lock`
6. Prubuje ponownie → SAFETY_CHECK nie ustawiony
7. Naprawia `settings.ini` przez `editline`:
   - Linia 2: `#SAFETY_CHECK=pass` → `SAFETY_CHECK=pass`
   - Linia 6: `enabled=true` → `enabled=false` (test_mode off)
   - Linia 9: `enabled=false` → `enabled=true` (cooling on)
8. Uruchamia firmware → kod ECCS → submit → flaga

## Dlaczego takie podejscie

- **Agent loop** zamiast skryptu — nie znamy z gory struktury VM ani sekwencji krokow
- **Claude Sonnet 4.6** — task hints sugeruja model z dobrym rozumowaniem; slabsze modele moga utkac w petli
- **Retry z backoff** w shell-api.ts — VM banuje za naruszenia (.gitignore), trzeba czekac i kontynuowac
- **Max 30 iteracji** — VM debugging moze wymagac wielu krokow (typowo 20-27)

## Dane referencyjne

| Metryka | Wartosc |
|---|---|
| Iteracje agenta | 27 (w tym ~8 czekania na ban) |
| Model | anthropic/claude-sonnet-4-6 |
| Koszt | ~$0.20 |
| Flaga | `{FLG:CANTTOUCHTHIS}` |

## Uruchomienie

```bash
bun run lessons/ts/S03/E02/main.ts
```

## Wnioski z lekcji

### 1. "Zacznij od help" — odkrywanie przed dzialaniem

**Co sie wydarzylo:** VM ma niestandardowy shell — nie ma `nano`, `vi`, `echo >`. Zamiast tego jest `editline` do edycji pojedynczych linii. Bez `help` agent straci iteracje na prubowanie nieistniejacych komend.

**Analogia:** Przyjezdzasz do nowego miasta bez mapy. Zamiast bladzic, pytasz w informacji turystycznej co jest dostepne i jak sie poruszac.

**Zastosowanie:** Przy kazdym nieznanym API, systemie, czy narzedziu — najpierw discovery (help, docs, schema), potem dzialanie. Dotyczy tez nowych repozytoriow kodu: README → architektura → dopiero wtedy zmiany.

### 2. "Ban to informacja, nie porazka"

**Co sie wydarzylo:** Agent dostal 20-sekundowy ban za prube czytania `.env` (plik w .gitignore). Zamiast sie poddac, czekal i kontynuowal szukanie hasla w innym miejscu.

**Analogia:** W escape roomie dotykasz przedmiotu i slyszysz "bzzz — nie tutaj". To nie koniec gry — to wskazowka ze haslo jest gdzie indziej.

**Zastosowanie:** Bledy API (403, 429, ban) to czesc protokolu komunikacji. Buduj systemy odporne: retry z backoff, czytaj tresci bledow (czesto zawieraja wskazowki), nie traktuj bledu jako awarii.

### 3. Konfiguracja jako seria niezaleznych problemow

**Co sie wydarzylo:** Firmware mial 3 niezalezne problemy w settings.ini: zakomentowany SAFETY_CHECK, wlaczony test_mode, wylaczony cooling. Kazdy blad generuje inny komunikat — agent naprawia je jeden po drugim.

**Analogia:** Samochod nie odpala. Mechanik nie wymienia od razu silnika — sprawdza kolejno: akumulator, swiecze, paliwo. Kazdy test daje diagnostyke.

**Zastosowanie:** Debugowanie krok po kroku zamiast "napraw wszystko naraz". Kazdy blad to nowy punkt danych. W petli agentowej: uruchom → przeczytaj blad → napraw jedna rzecz → powtorz.
