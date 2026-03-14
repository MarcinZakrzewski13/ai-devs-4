# Plan rozwiązania S01E02 (findhim)

## Kontekst

Zadanie jest kontynuacją S01E01. Należy znaleźć spośród podejrzanych (wynik S01E01) osobę, która przebywała blisko elektrowni atomowej, pobrać jej `accessLevel` i wysłać raport na `/verify`.

---

## Struktura projektu (aktualna)

```
ai-devs-4/
├── answers/                      # Wyniki zadań (root)
│   ├── tmp/
│   └── final/
│       └── S01E01-people.json     # Źródło danych dla E02
├── lessons/
│   ├── answers/                  # Alternatywna lokalizacja (wg architecture.md)
│   │   └── final/.gitkeep
│   └── ts/
│       ├── S01/
│       │   ├── E01/
│       │   └── E02/
│       ├── toolset/
│       │   ├── ai-devs.ts
│       │   └── save-answer.ts
│       └── resources/
│           ├── people.csv
│           └── findhim_locations.json
```

**Uwaga:** Plik `S01E01-people.json` znajduje się w `answers/final/` (root). Moduł `save-answer.ts` zapisuje do `lessons/answers/` (path `../../` od toolset). Przy ładowaniu danych w E02 należy użyć ścieżki do faktycznej lokalizacji pliku.

---

## Moduły (wg ADR-001)

| Moduł | Odpowiedzialność |
|-------|------------------|
| `main.ts` | Orkiestracja — import kroków, pętla po osobach |
| `types.ts` | Typy: `PowerPlant`, `FindhimAnswer`, `Suspect` |
| `loadSuspects.ts` | Import z pliku final S01E01, zwraca `Suspect[]` |
| `loadPowerPlants.ts` | Odczyt `findhim_locations.json` + mapa miasto→współrzędne |
| `haversine.ts` | `haversineDistanceKm(lat1, lon1, lat2, lon2)` |
| `fetchLocation.ts` | POST `/api/location` → `{ lat, lon }[]` |
| `fetchAccessLevel.ts` | POST `/api/accesslevel` → `number` |
| `findNearPlant.ts` | Dla lokalizacji + elektrownie → `{ plant, minDistance } \| null` |
| `buildAnswer.ts` | `(suspect, accessLevel, powerPlant) → FindhimAnswer` |
| `verifyAnswer.ts` | `saveTmpAnswer` → `sendAnswer` → `saveFinalAnswer` |

---

## Ścieżki importu

**Źródło podejrzanych (S01E01):**

- Z `lessons/ts/S01/E02/` do `answers/final/` (root): `../../../../answers/final/S01E01-people.json`
- Z `lessons/ts/S01/E02/` do `lessons/answers/final/`: `../../../answers/final/S01E01-people.json`

Użyć ścieżki zgodnej z faktyczną lokalizacją pliku (obecnie root `answers/`).

**Elektrownie:**

- `../../resources/findhim_locations.json` (od E02 do `lessons/ts/resources/`)

---

## Przepływ danych

```
loadSuspects()     → Suspect[]     (name, surname, born z S01E01)
loadPowerPlants()  → PowerPlant[]  (code, city, lat, lon)

for each suspect:
  1. locations = fetchLocation(suspect.name, suspect.surname)
  2. near = findNearPlant(locations, powerPlants)
  3. if near && minDistance < PRÓG (np. 5 km):
       accessLevel = fetchAccessLevel(suspect.name, suspect.surname, suspect.born)
       answer = buildAnswer(suspect, accessLevel, near.plant.code)
       verifyAnswer(answer)
       break
```

---

## Szczegóły implementacyjne

### 1. `types.ts`

```typescript
type Suspect = { name: string; surname: string; born: number };
type PowerPlant = { code: string; city: string; lat: number; lon: number };
type FindhimAnswer = { name: string; surname: string; accessLevel: number; powerPlant: string };
```

### 2. `loadSuspects.ts`

- Import JSON z `answers/final/S01E01-people.json`
- Mapowanie `data.answer` na `Suspect[]` (pole `born` już jest liczbą)

### 3. `loadPowerPlants.ts`

- Odczyt `findhim_locations.json` z `lessons/ts/resources/`
- JSON ma tylko `city` + `code` — brak współrzędnych
- Dodać mapę miasto → (lat, lon) dla: Zabrze, Piotrków Trybunalski, Grudziądz, Tczew, Radom, Chelmno, Żarnowiec

### 4. `haversine.ts`

- Wzór Haversine dla odległości w km
- Opcjonalnie w `toolset/` jako reużywalna funkcja

### 5. API Hub

- `POST https://hub.ag3nts.org/api/location` — body: `{ apikey, name, surname }`
- `POST https://hub.ag3nts.org/api/accesslevel` — body: `{ apikey, name, surname, birthYear }`
- `birthYear` = liczba (pole `born` z S01E01)

### 6. `verifyAnswer.ts`

Zgodnie z `.ai/rules/general.md`:

```typescript
await saveTmpAnswer("S01E02", "findhim", answer);
const response = await sendAnswer("findhim", answer);
if (response.code === 0 || response.message?.includes("{FLG:")) {
  await saveFinalAnswer("S01E02", "findhim", answer, response);
}
```

### 7. Persystencja

- `save-answer.ts` zapisuje do `lessons/answers/` (path w toolset)
- Jeśli pliki final mają być w root `answers/`, może być potrzebna zmiana w `save-answer.ts` lub symlink

---

## Kolejność implementacji

1. `types.ts`
2. `haversine.ts` (toolset lub E02)
3. `loadPowerPlants.ts` (z mapą współrzędnych miast)
4. `loadSuspects.ts`
5. `fetchLocation.ts`, `fetchAccessLevel.ts`
6. `findNearPlant.ts`
7. `buildAnswer.ts`
8. `verifyAnswer.ts`
9. `main.ts`

---

## Checklist przed wysłaniem

- [ ] `birthYear` jako liczba całkowita
- [ ] Próg odległości (np. 5 km) — do ewentualnego dopasowania
- [ ] Współrzędne elektrowni poprawne
- [ ] Brak LLM → brak komentarza o modelach (zadanie deterministyczne)
- [ ] Trace logi (chalk) dla kroków
