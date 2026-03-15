import chalk from "chalk";
import { haversineDistanceKm } from "@ai-devs/geo-utils";
import type { PowerPlant } from "./types.ts";
import type { LocationPoint } from "./fetchLocation.ts";

/** Distance threshold in km — "very close" to a power plant. */
export const NEAR_THRESHOLD_KM = 5;

export type NearPlantResult = {
  plant: PowerPlant;
  minDistance: number;
};

/**
 * Finds the closest power plant to any of the given locations.
 * Returns the nearest plant and distance; caller decides if within threshold.
 */
export function findNearPlant(
  locations: LocationPoint[],
  plants: PowerPlant[]
): NearPlantResult | null {
  if (locations.length === 0) return null;

  let best: NearPlantResult | null = null;

  for (const loc of locations) {
    for (const plant of plants) {
      const dist = haversineDistanceKm(loc.lat, loc.lon, plant.lat, plant.lon);
      if (!best || dist < best.minDistance) {
        best = { plant, minDistance: dist };
      }
    }
  }

  if (best) {
    console.log(
      chalk.gray(
        `  [findNearPlant] Closest: ${best.plant.city} (${best.plant.code}) — ${best.minDistance.toFixed(2)} km`
      )
    );
  }
  return best;
}
