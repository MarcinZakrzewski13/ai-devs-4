# S04E02 — Windpower (harmonogram turbiny wiatrowej)

## Status: Rozwiazane

## Cel

Zaprogramowanie harmonogramu pracy turbiny wiatrowej w ramach 40-sekundowego okna serwisowego. Analiza prognozy pogody, ochrona przed wichurami, wyznaczenie optymalnego okna produkcji energii.

## Podejscie

Deterministyczny pipeline z asynchronicznym API (queue + poll). Zero LLM — analiza pogody jest czysto obliczeniowa.

### Pipeline (7 faz, ~36s):

1. **Start** — otwarcie okna serwisowego (40s limit)
2. **Queue** — weather (najwolniejszy, kolejkowany pierwszy), turbinecheck, powerplantcheck
3. **Poll** — zbieranie 3 wynikow z getResult (~24s na weather)
4. **Analyze** — deterministyczna analiza: burze (>14 m/s → idle/90°) + produkcja (najlepszy wiatr >= 4 m/s)
5. **Unlock codes** — generowanie kodow MD5 dla kazdego punktu konfiguracji (async)
6. **Config** — bulk submit wszystkich konfiguracji + turbinecheck
7. **Done** — walidacja i flaga

### Kluczowe decyzje:

- **Interpolacja liniowa yield** — dokumentacja podaje zakresy (np. 6 m/s → 30-40%), interpolacja miedzy punktami daje precyzyjne wartosci. Bez interpolacji 5.9 m/s daje 12% (blad), z interpolacja 33.9% (poprawnie).
- **Tylko godziny z prognozy** — system waliduje konfiguracje wzgledem forecast. Dodawanie "posrednich" godzin (np. 19:00 miedzy 18:00 a 20:00) generuje bledne unlock codes.
- **Weather queued first** — najwolniejszy raport, kolejkowanie jako pierwszy minimalizuje czas oczekiwania.
- **Pitch angles: 0°, 45°, 90°** — jedyne dozwolone wartosci. 0° = max produkcja, 90° = zero oporu (ochrona przed burza).

## Dane z API

- **Turbina**: rated power 14 kW, cutoff 14 m/s, min operational 4 m/s
- **Elektrownia**: deficit 3-4 kW, mode StandBy
- **Prognoza**: 84 wpisy co 2h, 3 burze (25, 22, 28 m/s), max normalny wiatr 5.9 m/s

## Koszt

| Model | Wywolania | Koszt |
|-------|-----------|-------|
| (brak LLM) | 0 | $0.00 |

## Wnioski z lekcji

1. **Asynchroniczne API = kolejkowanie + polling** — analogia do message queue (SQS/RabbitMQ). Wyniki sa jednorazowe (getResult usuwa z kolejki), wiec trzeba je zbierac natychmiast. Kluczowe: kolejkuj najwolniejsze zadanie PIERWSZE.

2. **Interpolacja > step function** — dokumentacja podawala dyskretne punkty (4, 6, 8, 10, 12 m/s), ale rzeczywiste dane mialy wartosci posrednie (5.9 m/s). Step function (zaokraglanie w dol) dawala 12% zamiast 34% — roznica miedzy "production NOT FOUND" a flaga. Analogia: przy integracji z zewnetrznymi specyfikacjami, interpoluj miedzy znanymi punktami zamiast quantyzowac.

3. **Nie konfiguruj tego, czego system nie oczekuje** — dodawanie "posrednich" godzin (19:00) miedzy punktami prognozy (18:00, 20:00) generowalo nieprawidlowe unlock codes. System waliduje konfiguracje tylko dla znanych punktow czasowych. Analogia: w API integracji, wysylaj tylko dane odpowiadajace schematowi — "helpful extras" moga zlamac walidacje.

4. **Time-boxed tasks wymuszaja paralelizm** — 40s limit eliminuje podejscie liniowe. Analogia do real-time systemow: identyfikuj critical path (weather ~24s), kolejkuj go pierwszy, reszta rownolegle.
