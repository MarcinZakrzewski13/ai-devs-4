export type WindpowerResponse = {
  code: number;
  message: string;
  [key: string]: unknown;
};

export type WeatherEntry = {
  date: string;
  hour: string;
  windMs: number;
  [key: string]: unknown;
};

export type TurbineCheckResult = {
  [key: string]: unknown;
};

export type PowerPlantCheckResult = {
  requiredPowerKw?: number;
  [key: string]: unknown;
};

export type HourConfig = {
  datetime: string;
  pitchAngle: number;
  turbineMode: "production" | "idle";
  windMs: number;
};

export type ScheduleAnalysis = {
  reasoning: string;
  configs: Array<{
    datetime: string;
    pitchAngle: number;
    turbineMode: "production" | "idle";
    windMs: number;
  }>;
};

export type CollectedData = {
  weather: unknown;
  turbinecheck: unknown;
  powerplantcheck: unknown;
};
