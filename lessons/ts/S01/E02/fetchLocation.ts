import chalk from "chalk";

const LOCATION_URL = "https://hub.ag3nts.org/api/location";

export type LocationPoint = { lat: number; lon: number };

/**
 * Fetches locations where a person was seen.
 * @returns Array of { lat, lon } coordinates
 */
export async function fetchLocation(
  name: string,
  surname: string
): Promise<LocationPoint[]> {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) {
    throw new Error("API_KEY_AI_DEVS4 is not set in .env");
  }

  const body = { apikey, name, surname };
  const res = await fetch(LOCATION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    console.log(chalk.yellow(`[fetchLocation] Unexpected response for ${name} ${surname}:`, data));
    return [];
  }

  const points: LocationPoint[] = data.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    const lat = Number(obj.lat ?? obj.latitude ?? 0);
    const lon = Number(obj.lon ?? obj.longitude ?? obj.lng ?? 0);
    return { lat, lon };
  });

  console.log(chalk.gray(`  [fetchLocation] ${name} ${surname} → ${points.length} locations`));
  return points;
}
