export type SensorField =
  | "temperature_K"
  | "pressure_bar"
  | "water_level_meters"
  | "voltage_supply_v"
  | "humidity_percent";

export type SensorReading = {
  fileId: string;
  sensor_type: string;
  timestamp: number;
  temperature_K: number;
  pressure_bar: number;
  water_level_meters: number;
  voltage_supply_v: number;
  humidity_percent: number;
  operator_notes: string;
};

export const SENSOR_FIELD_MAP: Record<string, SensorField> = {
  temperature: "temperature_K",
  pressure: "pressure_bar",
  water: "water_level_meters",
  voltage: "voltage_supply_v",
  humidity: "humidity_percent",
};

export const VALID_RANGES: Record<SensorField, { min: number; max: number }> = {
  temperature_K: { min: 553, max: 873 },
  pressure_bar: { min: 60, max: 160 },
  water_level_meters: { min: 5.0, max: 15.0 },
  voltage_supply_v: { min: 229.0, max: 231.0 },
  humidity_percent: { min: 40.0, max: 80.0 },
};

export const ALL_SENSOR_FIELDS = new Set<SensorField>(
  Object.values(SENSOR_FIELD_MAP)
);
