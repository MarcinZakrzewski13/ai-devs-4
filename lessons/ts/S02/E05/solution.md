# S02E05 — Drone (planowanie misji drona)

## Czego dotyczy zadanie

Zaprogramowanie przejętego drona bojowego (DRN-BMB7) do zbombardowania tamy zamiast elektrowni. Wymagało: analizy mapy terenu (Vision), przeczytania dokumentacji API drona (HTML z pułapkami), zbudowania sekwencji instrukcji i wysłania do API.

## Czego uczy zadanie

- **Vision** — precyzyjne zliczanie wierszy/kolumn siatki na mapie, identyfikacja sektora z tamą
- **Parsowanie dokumentacji z pułapkami** — overloaded `set()` z różnymi typami parametrów
- **Reaktywne podejście** — iteracja na błędach API (choć w tym przypadku udało się za pierwszym razem)
- **Dwuetapowe**: analiza mapy (vision) → deterministyczne generowanie instrukcji (tekst)

## Jak działa rozwiązanie

```
main.ts → analyzeMap() → DamSector { column: 2, row: 4 }
        → buildInstructions(sector) → string[12]
        → submitMission(instructions) → flag
```

**Moduły:**
- `analyze-map.ts` — Vision (`gpt-5.4`): fetch mapy PNG, analiza siatki, identyfikacja sektora tamy. Wynik cachowany w `resources/S02E05/tmp/map-analysis.json`
- `build-instructions.ts` — czysta funkcja, zero LLM. Buduje tablicę 12 instrukcji w ustalonej kolejności
- `submit-mission.ts` — wysyłka do `/verify`, detekcja flagi, zapis finalnej odpowiedzi

**Sekwencja instrukcji:**
1. `hardReset` — czysty stan
2. `calibrateCompass`, `calibrateGPS`, `selfCheck` — kalibracja
3. `setDestinationObject(PWR6132PL)` — oficjalny cel (elektrownia)
4. `set(2,4)` — faktyczny sektor lądowania (tama)
5. `set(engineON)`, `set(100%)`, `set(50m)` — konfiguracja lotu
6. `set(destroy)`, `set(return)` — cele misji
7. `flyToLocation` — start

## Dlaczego takie podejście

- **Deterministyczne instrukcje zamiast agenta** — dokumentacja jest znana, nie trzeba jej "odkrywać" przez agenta. Czysta funkcja jest tańsza i przewidywalna
- **gpt-5.4 do Vision** — zliczanie wierszy/kolumn siatki wymaga precyzji; tańsze modele mogą się mylić
- **Cachowanie wyniku vision** — unikamy powtórnych drogich wywołań przy re-runach
- **hardReset na początku** — czysty stan eliminuje problemy z nawarstwionymi konfiguracjami

## Odpowiedzi API / dane referencyjne

Mapa: siatka 3 kolumny × 4 wiersze. Tama w sektorze (2,4) — dolny środek mapy, intensywnie niebieski kolor wody.

Overloaded `set()` — API rozpoznaje typ parametru po formacie:
- `set(x,y)` → koordynaty sektora
- `set(engineON/OFF)` → sterowanie silnikiem
- `set(N%)` → moc silnika
- `set(Nm)` → wysokość lotu
- `set(destroy/return/video/image)` → cel misji

## Wnioski z lekcji

### Vision + deterministyka = optymalne combo
- **Co się wydarzyło:** Vision (`gpt-5.4`) użyty raz do analizy mapy, reszta rozwiązania jest w 100% deterministyczna. Flaga za pierwszą próbą.
- **Analogia:** Jak konsultant, który przychodzi raz na wizję lokalną, a potem inżynier buduje na podstawie jego raportu — nie trzeba konsultanta na każdym etapie.
- **Przykład zastosowania:** Każde zadanie "przeanalizuj obraz → podejmij decyzję → wykonaj akcję" — LLM do analizy, kod do wykonania. Nie wrzucaj LLM w pętlę gdy deterministyka wystarczy.

### Cachowanie drogich operacji to must-have
- **Co się wydarzyło:** Wynik analizy mapy zapisany w `tmp/map-analysis.json`. Przy każdym re-runie nie trzeba wywoływać `gpt-5.4` — oszczędność $0.05-0.10 na wywołanie.
- **Analogia:** Nie dzwonisz do architekta za każdym razem gdy chcesz sprawdzić wymiary pokoju — notujesz je przy pierwszej wizji.
- **Przykład zastosowania:** Każda kosztowna operacja AI (vision, duży prompt) powinna mieć cache na dysku. Szczególnie ważne przy debugowaniu i iteracjach.

### Dokumentacja z pułapkami = czytaj selektywnie
- **Co się wydarzyło:** Dokumentacja drona zawierała ~20 metod, z czego potrzebne było ~12. Overloaded `set()` mógł zmylić, ale format parametrów jednoznacznie determinuje zachowanie.
- **Analogia:** Nie musisz czytać całej instrukcji obsługi samochodu żeby pojechać do sklepu — wystarczy wiedzieć jak odpalić i gdzie jest kierownica.
- **Przykład zastosowania:** Przy pracy z dużymi API — skup się na tym co potrzebne do misji, ignoruj resztę. LLM nie musi parsować całej dokumentacji — wystarczy wybrać potrzebne metody.

## Uruchomienie

```bash
bun run lessons/ts/S02/E05/main.ts
```
