# Refactor S01E02 — Cross-episode fs + deprecated toolset

**Prereq:** refactor-00-global (needs `@ai-devs/geo-utils`)
**Violations:** #4 (fs.readFileSync instead of loadFinalAnswer), #5 (import from deprecated toolset/haversine)

---

## Cel

1. `loadSuspects.ts` — zamienić `fs.readFileSync` na `loadFinalAnswer()` z `@ai-devs/ai-devs-hub`
2. `findNearPlant.ts` — zamienić import z `toolset/haversine` na `@ai-devs/geo-utils`
3. `main.ts` — dostosować do async `loadSuspects()`

---

## Zmiana 1: loadSuspects.ts → loadFinalAnswer()

**Plik:** `lessons/ts/S01/E02/loadSuspects.ts`

**Obecny kod:**
```typescript
import fs from "fs";
import path from "path";
import chalk from "chalk";
import type { Suspect } from "./types.ts";

type S01E01AnswerFile = {
  episodeId: string;
  task: string;
  answer: Array<{ name: string; surname: string; born: number }>;
};

/** Path to S01E01 final answer (root answers/final/). */
const S01E01_PATH = path.resolve(
  import.meta.dir,
  "../../../../answers/final/S01E01-people.json"
);

/**
 * Loads suspects from S01E01 final answer.
 * Uses name, surname, born (birth year) for findhim.
 */
export function loadSuspects(): Suspect[] {
  const raw = JSON.parse(
    fs.readFileSync(S01E01_PATH, "utf-8")
  ) as S01E01AnswerFile;

  const suspects = raw.answer.map((p) => ({
    name: p.name,
    surname: p.surname,
    born: p.born,
  }));

  console.log(chalk.blue(`[loadSuspects] Loaded ${suspects.length} suspects from S01E01`));
  return suspects;
}
```

**Nowy kod:**
```typescript
import chalk from "chalk";
import { loadFinalAnswer } from "@ai-devs/ai-devs-hub";
import type { Suspect } from "./types.ts";

/**
 * Loads suspects from S01E01 final answer via loadFinalAnswer().
 * Uses name, surname, born (birth year) for findhim.
 */
export async function loadSuspects(): Promise<Suspect[]> {
  const result = await loadFinalAnswer("S01E01", "people");
  if (!result) {
    throw new Error("S01E01 final answer not found — run S01E01 first");
  }

  const answer = result.answer as Array<{ name: string; surname: string; born: number }>;
  const suspects = answer.map((p) => ({
    name: p.name,
    surname: p.surname,
    born: p.born,
  }));

  console.log(chalk.blue(`[loadSuspects] Loaded ${suspects.length} suspects from S01E01`));
  return suspects;
}
```

**Kluczowe zmiany:**
- Usunięto `fs`, `path` — niepotrzebne
- Usunięto lokalny typ `S01E01AnswerFile` — `loadFinalAnswer()` zwraca `FinalAnswerFile` z polem `answer: unknown`
- Funkcja stała się `async` — wymaga `await` w `main.ts`

---

## Zmiana 2: findNearPlant.ts → @ai-devs/geo-utils

**Plik:** `lessons/ts/S01/E02/findNearPlant.ts`

**Obecny import (linia 2):**
```typescript
import { haversineDistanceKm } from "../../toolset/haversine.ts";
```

**Nowy import:**
```typescript
import { haversineDistanceKm } from "@ai-devs/geo-utils";
```

Reszta pliku bez zmian.

---

## Zmiana 3: main.ts — await loadSuspects()

**Plik:** `lessons/ts/S01/E02/main.ts`

**Obecna linia (~13):**
```typescript
const suspects = loadSuspects();
```

**Nowa linia:**
```typescript
const suspects = await loadSuspects();
```

---

## Weryfikacja

```bash
# Zero fs.readFileSync
grep -rn "readFileSync" lessons/ts/S01/E02/           # → zero results

# Zero toolset imports
grep -rn "toolset/" lessons/ts/S01/E02/               # → zero results

# Poprawne importy
grep -n "@ai-devs/" lessons/ts/S01/E02/*.ts            # → loadFinalAnswer, haversineDistanceKm

# Uruchomienie
bun run lessons/ts/S01/E02/main.ts
```
