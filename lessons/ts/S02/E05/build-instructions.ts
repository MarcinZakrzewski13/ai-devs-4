import type { DamSector } from "./types.ts";

export const buildInstructions = (sector: DamSector): string[] => [
  "hardReset",
  "calibrateCompass",
  "calibrateGPS",
  "selfCheck",
  "setDestinationObject(PWR6132PL)",
  `set(${sector.column},${sector.row})`,
  "set(engineON)",
  "set(100%)",
  "set(50m)",
  "set(destroy)",
  "set(return)",
  "flyToLocation",
];
