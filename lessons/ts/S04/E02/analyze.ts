import chalk from "chalk";
import type { ScheduleAnalysis, CollectedData } from "./types";

// From documentation endpoint — wind speed → yield % (midpoints of ranges)
const YIELD_TABLE: Array<[number, number]> = [
  [0, 0],
  [4, 0.125],   // 10-15% → 12.5%
  [6, 0.35],    // 30-40% → 35%
  [8, 0.65],    // 60-70% → 65%
  [10, 0.95],   // 90-100% → 95%
  [12, 1.0],    // 100%
  [14, 1.0],    // 100% (cutoff boundary)
];

const windYieldPercent = (windMs: number): number => {
  if (windMs < 4) return 0;
  if (windMs >= 14) return 1.0;
  for (let i = 1; i < YIELD_TABLE.length; i++) {
    const [w1, y1] = YIELD_TABLE[i - 1];
    const [w2, y2] = YIELD_TABLE[i];
    if (windMs >= w1 && windMs <= w2) {
      const t = (windMs - w1) / (w2 - w1);
      return y1 + t * (y2 - y1);
    }
  }
  return 1.0;
};

const RATED_POWER_KW = 14;
const CUTOFF_WIND_MS = 14;
const MIN_OPERATIONAL_WIND_MS = 4;

export const analyzeSchedule = (data: CollectedData): ScheduleAnalysis => {
  const weather = data.weather as any;
  const power = data.powerplantcheck as any;
  const forecast = weather.forecast as Array<{ timestamp: string; windMs: number }>;

  const deficitStr = String(power.powerDeficitKw ?? power.requiredPowerKw ?? "5");
  const deficitParts = deficitStr.split("-").map(Number);
  const requiredKw = Math.max(...deficitParts);
  console.log(chalk.gray(`  [analyze] Required power: ${requiredKw} kW`));

  const configs: ScheduleAnalysis["configs"] = [];
  let foundProduction = false;
  let bestProduction: { ts: string; windMs: number; power: number } | null = null;

  for (const entry of forecast) {
    const windMs = entry.windMs;
    const ts = entry.timestamp;

    if (windMs > CUTOFF_WIND_MS) {
      // Storm — protect turbine
      configs.push({ datetime: ts, pitchAngle: 90, turbineMode: "idle", windMs });
      console.log(chalk.gray(`  [analyze] STORM: ${ts} wind=${windMs}m/s → idle/90°`));
    } else if (windMs >= MIN_OPERATIONAL_WIND_MS) {
      const effectivePower = RATED_POWER_KW * windYieldPercent(windMs);
      console.log(chalk.gray(`  [analyze] ${ts}: wind=${windMs}m/s, yield=${(windYieldPercent(windMs) * 100).toFixed(1)}%, effective=${effectivePower.toFixed(1)}kW`));
      if (effectivePower >= requiredKw && (!bestProduction || effectivePower > bestProduction.power)) {
        bestProduction = { ts, windMs, power: effectivePower };
      }
    }
  }

  if (bestProduction) {
    configs.push({
      datetime: bestProduction.ts,
      pitchAngle: 0,
      turbineMode: "production",
      windMs: bestProduction.windMs,
    });
    foundProduction = true;
    console.log(chalk.green(`  [analyze] PRODUCTION: ${bestProduction.ts} wind=${bestProduction.windMs}m/s → ${bestProduction.power.toFixed(1)}kW`));
  }

  configs.sort((a, b) => a.datetime.localeCompare(b.datetime));

  const stormTimestamps = configs.filter((c) => c.turbineMode === "idle").map((c) => c.datetime);
  const reasoning = `Required: ${requiredKw}kW. Storms at: ${stormTimestamps.join(", ")}. ` +
    `Production: ${foundProduction ? bestProduction!.ts : "NOT FOUND"}. Total configs: ${configs.length}`;

  return { reasoning, configs };
};
