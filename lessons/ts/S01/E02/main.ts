// Brak LLM — zadanie deterministyczne (API + Haversine)

import chalk from "chalk";
import { config } from "dotenv";
import { loadSuspects } from "./loadSuspects.ts";
import { loadPowerPlants } from "./loadPowerPlants.ts";
import { fetchLocation } from "./fetchLocation.ts";
import { fetchAccessLevel } from "./fetchAccessLevel.ts";
import { findNearPlant, NEAR_THRESHOLD_KM } from "./findNearPlant.ts";
import { buildAnswer } from "./buildAnswer.ts";
import { verifyAnswer } from "./verifyAnswer.ts";
import type { Suspect } from "./types.ts";

config();

// 1. Load data
const suspects = await loadSuspects();
const powerPlants = loadPowerPlants();
console.log(chalk.blue(`[main] Loaded ${powerPlants.length} power plants`));

// 2. For each suspect: fetch locations, find nearest plant
type Candidate = { suspect: Suspect; plantCode: string; minDistance: number };
const candidates: Candidate[] = [];

for (const suspect of suspects) {
  const locations = await fetchLocation(suspect.name, suspect.surname);
  const near = findNearPlant(locations, powerPlants);
  if (near && near.minDistance < NEAR_THRESHOLD_KM) {
    candidates.push({
      suspect,
      plantCode: near.plant.code,
      minDistance: near.minDistance,
    });
  }
}

// 3. Pick the one closest to any plant (per task: "osoba która była najbliżej")
if (candidates.length === 0) {
  console.log(chalk.red("[main] No suspect found near any power plant"));
  process.exit(1);
}

const best = candidates.reduce((a, b) =>
  a.minDistance < b.minDistance ? a : b
);
console.log(
  chalk.yellow(
    `[main] Found suspect: ${best.suspect.name} ${best.suspect.surname} near ${best.plantCode} (${best.minDistance.toFixed(2)} km)`
  )
);

// 4. Fetch access level and build answer
const accessLevel = await fetchAccessLevel(
  best.suspect.name,
  best.suspect.surname,
  best.suspect.born
);
const answer = buildAnswer(best.suspect, accessLevel, best.plantCode);

// 5. Send
await verifyAnswer(answer);
