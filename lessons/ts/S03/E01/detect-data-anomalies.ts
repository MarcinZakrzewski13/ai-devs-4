import type { SensorReading, SensorField } from "./types.ts";
import { SENSOR_FIELD_MAP, VALID_RANGES, ALL_SENSOR_FIELDS } from "./types.ts";

type DetectionResult = {
  dataAnomalyIds: Set<string>;
  validDataFiles: SensorReading[];
};

export function detectDataAnomalies(readings: SensorReading[]): DetectionResult {
  const dataAnomalyIds = new Set<string>();
  const validDataFiles: SensorReading[] = [];

  for (const reading of readings) {
    const activeTypes = reading.sensor_type.split("/");
    const activeFields = new Set<SensorField>(
      activeTypes.map((t) => SENSOR_FIELD_MAP[t])
    );

    let hasAnomaly = false;

    // Check active fields are within valid range
    for (const field of activeFields) {
      const val = reading[field];
      const { min, max } = VALID_RANGES[field];
      if (val < min || val > max) {
        hasAnomaly = true;
        break;
      }
    }

    // Check inactive fields are zero
    if (!hasAnomaly) {
      for (const field of ALL_SENSOR_FIELDS) {
        if (!activeFields.has(field) && reading[field] !== 0) {
          hasAnomaly = true;
          break;
        }
      }
    }

    if (hasAnomaly) {
      dataAnomalyIds.add(reading.fileId);
    } else {
      validDataFiles.push(reading);
    }
  }

  return { dataAnomalyIds, validDataFiles };
}
