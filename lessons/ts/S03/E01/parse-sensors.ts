import { readdir } from "node:fs/promises";
import type { SensorReading } from "./types.ts";

const SENSORS_DIR = new URL("../../resources/S03E01/sensors", import.meta.url).pathname;

export async function parseSensors(): Promise<SensorReading[]> {
  const files = (await readdir(SENSORS_DIR)).filter((f) => f.endsWith(".json")).sort();
  const readings: SensorReading[] = [];

  for (const file of files) {
    const data = await Bun.file(`${SENSORS_DIR}/${file}`).json();
    readings.push({
      fileId: file.replace(".json", ""),
      ...data,
    });
  }

  return readings;
}
