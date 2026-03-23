# S03E01 — Anomaly Detection in Sensor Data

## Czego dotyczy zadanie

Analiza 9999 plików JSON z odczytami sensorów elektrowni jądrowej. Każdy plik zawiera typ sensora, odczyty liczbowe (temperatura, ciśnienie, poziom wody, napięcie, wilgotność) oraz notatkę operatora. Cel: znaleźć pliki z anomaliami i wysłać ich ID do Centrali.

## Czego uczy zadanie

- **Hybrydowe przetwarzanie** — podział pracy: deterministyczny kod dla danych liczbowych, LLM tylko tam gdzie niezbędny (interpretacja języka naturalnego)
- **Optymalizacja kosztów LLM** — deduplikacja danych przed wysłaniem (1993 unikalnych notatek zamiast 9953 plików), minimalizacja output tokens (model zwraca tylko indeksy)
- **Ewaluacja i walidacja danych** — budowanie reguł walidacyjnych na podstawie specyfikacji zakresów
- **Limitacje keyword matching** — negacje w języku naturalnym ("nothing suggests a fault") wymagają LLM

## Jak działa rozwiązanie

### Architektura modułów

```
parse-sensors.ts         → glob *.json, parse do SensorReading[]
detect-data-anomalies.ts → deterministyczne: zakresy + nieaktywne sensory → 46 anomalii
classify-notes.ts        → LLM (gpt-5-nano): deduplikowane notatki → 6 anomalii
build-answer.ts          → unia zbiorów → 52 ID
verify-answer.ts         → saveTmpAnswer + sendAnswer + saveFinalAnswer
main.ts                  → orkiestracja
```

### Przepływ danych

```
9999 JSON → parse → detect-data-anomalies (46 plików)
                   → valid files (9953) → deduplikacja notatek (1993 unikalnych)
                                        → LLM batch classification (4 batche × 500)
                                        → 6 plików z fałszywymi raportami błędów
→ union: 46 + 6 = 52 anomalii → Centrala
```

### Typy anomalii i metoda detekcji

| Typ | Opis | Metoda | Ilość |
|-----|------|--------|-------|
| 1 | Dane poza zakresem | Deterministyczna | ~30 |
| 4 | Nieaktywny sensor ≠ 0 | Deterministyczna | ~16 |
| 3 | Operator mówi błąd, dane OK | LLM | 6 |
| 2 | Operator mówi OK, dane złe | Podzbiór typu 1 | — |

## Dlaczego takie podejście

1. **Deterministyka najpierw** — 3 z 4 typów anomalii wykrywalne kodem. Wysyłanie 10k plików do LLM kosztowałoby ~$5-10 i byłoby niepotrzebne.

2. **LLM tylko dla notatek** — jedyny typ wymagający rozumienia języka naturalnego. Keyword matching generuje false positives z powodu negacji (np. "nothing suggests a fault" zawiera "fault" ale mówi OK).

3. **Deduplikacja** — wśród 9953 plików z poprawnymi danymi jest 1993 unikalnych notatek. Wysyłamy 1993 notatek zamiast 9953 plików → ~5x mniejszy input.

4. **gpt-5-nano** — prosta klasyfikacja binarna (notatka mówi OK vs ERROR). Nie wymaga rozumowania, wystarczy pattern matching na poziomie semantycznym.

5. **Minimalizacja output** — model zwraca `{ error_indices: [idx1, idx2] }` zamiast klasyfikacji każdej notatki. Przy 1993 notatkach i ~6 anomaliach, output to ~20 tokenów vs ~4000.

## Odpowiedzi API / dane referencyjne

**52 pliki z anomaliami** — 46 deterministycznych + 6 z LLM.

**Przykłady anomalii danych:**
- `0307`: humidity_percent=105.3 (zakres 40-80)
- `0567`: voltage_supply_v=224.4 (zakres 229-231)
- `1632`: temperature_K=742 ale sensor_type nie zawiera "temperature"

**Przykłady anomalii notatek (dane OK, operator mówi źle):**
- `5000`: temperature_K=773 (OK), nota: "This state looks unstable..."
- `8369`: pressure/voltage w normie, nota: "I can see a clear irregularity..."

## Wnioski z lekcji

### 1. LLM jako sędzia, nie jako robotnik

**Co się wydarzyło:** 9999 plików do analizy. Naiwne podejście = wysłanie wszystkiego do LLM za ~$5-10. Hybrydowe podejście = deterministyczny kod odsiał 99.5% pracy, LLM ocenił tylko 1993 unikalnych notatek za ~$0.04.

**Analogia:** Nie zatrudniasz biegłego sądowego do sprawdzenia, czy faktura ma poprawny NIP (regex). Biegły ocenia, czy podpis jest autentyczny — to wymaga wiedzy eksperckiej.

**Przykład zastosowania:** System moderacji treści: regex łapie obraźliwe słowa (90% spamu), LLM ocenia tylko edge cases (sarkazm, kontekst). 10x tańszy od "LLM na wszystko".

### 2. Deduplikacja przed LLM to nie optymalizacja — to obowiązek

**Co się wydarzyło:** 9953 plików z poprawnymi danymi, ale tylko 1993 unikalnych notatek. Wysyłanie duplikatów = płacenie za te same tokeny wielokrotnie. Deduplikacja zmniejszyła input 5x.

**Analogia:** Tłumacz konferencyjny nie tłumaczy tego samego zdania 13 razy tylko dlatego, że 13 osób je powiedziało. Tłumaczy raz, wynik mapuje na wszystkich.

**Przykład zastosowania:** Kategoryzacja 100k opisów produktów — prawdopodobnie 5k unikalnych opisów. Deduplikuj → klasyfikuj → mapuj z powrotem. Zamiast $50 za 100k wywołań, $2.50 za 5k.

### 3. Negacje w języku naturalnym łamią keyword matching

**Co się wydarzyło:** "nothing suggests a fault" zawiera słowo "fault" ale mówi, że wszystko jest OK. Proste wyszukiwanie keywords generowało 530 false positives. LLM poprawnie rozpoznał 6 prawdziwych alertów.

**Analogia:** Pytasz kogoś "Czy jest problem?" i słyszysz "Nie ma żadnego problemu". Jeśli Twój system reaguje na słowo "problem" — zaalarmujesz się niepotrzebnie.

**Przykład zastosowania:** Analiza sentymentu recenzji: "This is not bad at all" = pozytywna, mimo obecności "not" i "bad". Do takich analiz zawsze potrzebny model rozumiejący kontekst, nie regex.

## Uruchomienie

```bash
bun run lessons/ts/S03/E01/main.ts
```
