import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import type { CityEntry } from "./types.ts";

const CITIES_URL = "https://hub.ag3nts.org/dane/food4cities.json";
const CACHE_PATH = "lessons/ts/resources/S04E05/tmp/food4cities.json";

export const loadCities = async (): Promise<CityEntry[]> => {
  if (existsSync(CACHE_PATH)) {
    const raw = await readFile(CACHE_PATH, "utf-8");
    return JSON.parse(raw) as CityEntry[];
  }

  const res = await fetch(CITIES_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: failed to fetch food4cities.json`);

  const raw = await res.json() as Record<string, Record<string, number>>;
  const data: CityEntry[] = Object.entries(raw).map(([city, items]) => ({ city, items }));
  await writeFile(CACHE_PATH, JSON.stringify(data, null, 2), "utf-8");
  return data;
};
