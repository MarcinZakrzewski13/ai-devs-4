# S01E02 — Findhim (lokalizacja podejrzanego przy elektrowni)

## Czego dotyczy zadanie

Zadanie polega na znalezieniu, który z podejrzanych (wynik S01E01) przebywał w pobliżu elektrowni jądrowej. Wymaga pobrania lokalizacji GPS każdej osoby z API, porównania z koordynatami elektrowni za pomocą formuły Haversine, a następnie pobrania poziomu dostępu najlepszego kandydata.

## Czego uczy to zadanie

1. **Cross-episode dependencies** — dane z S01E01 (lista podejrzanych) są wejściem do S01E02. Wzorzec `loadFinalAnswer()` / `saveFinalAnswer()` pozwala na budowanie łańcucha zadań.

2. **Integracja z wieloma endpointami API** — zadanie wymaga koordynacji trzech endpointów: `/api/location`, `/api/accesslevel`, `/verify`. Każdy ma inny format żądania i odpowiedzi.

3. **Obliczenia geoprzestrzenne** — formuła Haversine do obliczania odległości na powierzchni kuli. Praktyczne zastosowanie matematyki w kontekście danych lokalizacyjnych.

4. **Zadanie bez LLM** — mimo że kurs dotyczy AI, nie każdy problem wymaga modelu językowego. Tu wystarczy deterministyczna logika: API calls + matematyka + porównanie.

5. **Wzbogacanie danych statycznych** — plik JSON z elektrowniami nie zawiera koordynat, trzeba je dodać ręcznie (hardcoded). Realna sytuacja: dane z różnych źródeł mają różne formaty i kompletność.

## Jak działa rozwiązanie

### Architektura modułów

```
lessons/ts/S01/E02/
├── main.ts              # orkiestracja: load → locate → match → verify
├── types.ts             # Suspect, PowerPlant, FindhimAnswer
├── loadSuspects.ts      # ładowanie danych z S01E01 (loadFinalAnswer)
├── loadPowerPlants.ts   # JSON + hardcoded koordynaty miast
├── fetchLocation.ts     # POST /api/location → koordynaty GPS osoby
├── fetchAccessLevel.ts  # POST /api/accesslevel → poziom dostępu
├── findNearPlant.ts     # Haversine — kto jest < 5 km od elektrowni
├── buildAnswer.ts       # budowa FindhimAnswer
└── verifyAnswer.ts      # wysyłka + zapis flagi
```

### Przepływ danych

```
loadFinalAnswer("S01E01") → Suspect[]
loadPowerPlants() → PowerPlant[] (z koordynatami)
  ↓
Dla każdego podejrzanego:
  fetchLocation(name, surname) → LocationPoint[]
  findNearPlant(locations, plants) → { plant, distance } | null
  ↓
Wybierz kandydata z minimalną odległością (< 5 km)
  ↓
fetchAccessLevel(name, surname, born) → number
  ↓
buildAnswer() → FindhimAnswer
  ↓
verifyAnswer() → POST /verify → {FLG:...}
```

### Kluczowy moduł: `findNearPlant.ts`

- Próg odległości: 5 km (`NEAR_THRESHOLD_KM`)
- Haversine z `@ai-devs/geo-utils` — oblicza dystans po powierzchni kuli
- Iteruje po wszystkich lokalizacjach osoby × wszystkich elektrowniach
- Zwraca najbliższą parę (osoba–elektrownia) lub `null`

## Dlaczego takie podejście

| Decyzja | Uzasadnienie |
|---|---|
| Bez LLM | Zadanie czysto deterministyczne — API + matematyka. LLM byłby nadmiarowy. |
| `@ai-devs/geo-utils` | Reużywalny pakiet Haversine zamiast inline formuły |
| Próg 5 km | Rozsądna odległość "w pobliżu" elektrowni — wystarczająco precyzyjna |
| Hardcoded koordynaty | Dane z API nie zawierają lat/lon — konieczne wzbogacenie. 7 miast — nie warto budować geocoding API. |
| `loadFinalAnswer()` | Wzorzec cross-episode: nie duplikujemy logiki z E01, ładujemy gotowy wynik |

## Uruchomienie

```bash
bun run lessons/ts/S01/E02/main.ts
```

Wymaga wcześniejszego ukończenia S01E01 (plik `answers/final/S01E01-people.json`).
