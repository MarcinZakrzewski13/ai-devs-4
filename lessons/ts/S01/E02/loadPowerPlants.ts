import fs from "fs";
import path from "path";
import type { PowerPlant } from "./types.ts";

/** City name → [lat, lon] — approximate coordinates for Haversine. */
const CITY_COORDS: Record<string, [number, number]> = {
  Zabrze: [50.3249, 18.7856],
  "Piotrków Trybunalski": [51.4053, 19.7032],
  Grudziądz: [53.4875, 18.7544],
  Tczew: [54.0917, 18.7778],
  Radom: [51.4027, 21.1471],
  Chelmno: [53.3486, 18.4251],
  Żarnowiec: [54.7833, 18.0833],
};

const LOCATIONS_PATH = path.join(import.meta.dir, "../../resources/findhim_locations.json");

type RawLocations = {
  power_plants: Record<
    string,
    { is_active: boolean; power: string; code: string }
  >;
};

/**
 * Loads power plants from findhim_locations.json with coordinates.
 * Enriches city names with lat/lon for Haversine distance.
 */
export function loadPowerPlants(): PowerPlant[] {
  const raw = JSON.parse(
    fs.readFileSync(LOCATIONS_PATH, "utf-8")
  ) as RawLocations;

  return Object.entries(raw.power_plants).map(([city, data]) => {
    const [lat, lon] = CITY_COORDS[city] ?? [0, 0];
    return {
      code: data.code,
      city,
      lat,
      lon,
    };
  });
}
