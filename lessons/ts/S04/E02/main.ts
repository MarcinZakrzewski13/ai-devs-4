// Modele uzyte w zadaniu: brak (100% deterministyczne)
// Analiza pogody i harmonogram turbiny — interpolacja liniowa z dokumentacji, zero LLM

import chalk from "chalk";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import { callWindpower, pollResults, collectData } from "./api";
import { analyzeSchedule } from "./analyze";

const EPISODE_ID = "S04E02";
const TASK_NAME = "windpower";
const TMP_DIR = join(import.meta.dir, "../../resources/S04E02/tmp");

const saveTmp = async (name: string, data: unknown) => {
  await mkdir(TMP_DIR, { recursive: true });
  await writeFile(
    join(TMP_DIR, `${name}-${Date.now()}.json`),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
};

const checkDeadline = (deadline: number, label: string) => {
  const remaining = deadline - Date.now();
  console.log(chalk.gray(`[${label}] ${(remaining / 1000).toFixed(1)}s remaining`));
  if (remaining < 2000) {
    throw new Error(`TIMEOUT at ${label}, only ${remaining}ms left`);
  }
};

const main = async () => {
  console.log(chalk.cyan("[main] === S04E02 Windpower Pipeline ===\n"));

  // ─── PHASE 0: Start service window ───
  console.log(chalk.cyan("[phase0] Starting service window..."));
  const startRes = await callWindpower({ action: "start" });
  const startTime = Date.now();
  const deadline = startTime + 39_000; // 1s safety margin
  console.log(chalk.green(`[phase0] Service window opened: ${startRes.message}`));

  // ─── PHASE 1: Queue weather FIRST (slowest), then others ───
  console.log(chalk.cyan("\n[phase1] Queuing data requests..."));

  // Weather first — it's the slowest to process on server side
  const weatherQ = await callWindpower({ action: "get", param: "weather" });
  console.log(chalk.gray(`  weather queued: code=${weatherQ.code}`));

  // Queue turbine and power immediately after
  const [turbineQ, powerQ] = await Promise.all([
    callWindpower({ action: "get", param: "turbinecheck" }),
    callWindpower({ action: "get", param: "powerplantcheck" }),
  ]);
  console.log(chalk.gray(`  turbine queued: code=${turbineQ.code}`));
  console.log(chalk.gray(`  power queued: code=${powerQ.code}`));

  // ─── PHASE 2: Poll for all 3 results ───
  checkDeadline(deadline, "phase2-poll");
  console.log(chalk.cyan("\n[phase2] Polling for data results (weather is slow, be patient)..."));

  const rawResults = await pollResults(3, 28_000, deadline);
  const data = collectData(rawResults);

  console.log(chalk.green(`[phase2] Collected: weather=${!!data.weather}, turbine=${!!data.turbinecheck}, power=${!!data.powerplantcheck}`));

  if (!data.weather) {
    throw new Error("Weather data not received in time");
  }

  // Log key data for debugging
  const weatherData = data.weather as any;
  const powerData = data.powerplantcheck as any;
  const turbineData = data.turbinecheck as any;
  console.log(chalk.gray(`  Forecast entries: ${weatherData.forecast?.length}`));
  console.log(chalk.gray(`  Power plant: ${JSON.stringify(powerData).slice(0, 200)}`));
  console.log(chalk.gray(`  Turbine: ${JSON.stringify(turbineData).slice(0, 200)}`));

  // ─── PHASE 3: LLM analysis ───
  checkDeadline(deadline, "phase3-analyze");
  console.log(chalk.cyan("\n[phase3] Analyzing schedule with LLM..."));

  const analysis = await analyzeSchedule(data);

  console.log(chalk.green(`[phase3] Reasoning: ${analysis.reasoning.slice(0, 300)}`));
  console.log(chalk.green(`[phase3] Config points: ${analysis.configs.length}`));
  for (const c of analysis.configs) {
    console.log(chalk.gray(`  ${c.datetime} → pitch=${c.pitchAngle}° mode=${c.turbineMode} wind=${c.windMs}m/s`));
  }

  const configs = analysis.configs;

  // ─── PHASE 4: Generate unlock codes (parallel) ───
  checkDeadline(deadline, "phase4-codes");
  console.log(chalk.cyan("\n[phase4] Generating unlock codes..."));

  await Promise.all(
    configs.map((c) => {
      const [date, hour] = c.datetime.split(" ");
      return callWindpower({
        action: "unlockCodeGenerator",
        startDate: date,
        startHour: hour,
        windMs: c.windMs,
        pitchAngle: c.pitchAngle,
      });
    })
  );
  console.log(chalk.gray(`  Queued ${configs.length} unlock code requests`));

  const codeResults = await pollResults(configs.length, 15_000, deadline);
  console.log(chalk.green(`[phase4] Received ${codeResults.length} unlock codes`));

  const codeMap = new Map<string, string>();
  for (const r of codeResults) {
    const params = (r as any).signedParams;
    const code = (r as any).unlockCode;
    if (params && code) {
      const key = `${params.startDate} ${params.startHour}`;
      codeMap.set(key, code);
      console.log(chalk.gray(`  ${key} → ${code.slice(0, 16)}...`));
    }
  }

  // ─── PHASE 5: Submit bulk config ───
  checkDeadline(deadline, "phase5-config");
  console.log(chalk.cyan("\n[phase5] Submitting bulk configuration..."));

  const bulkConfigs: Record<string, { pitchAngle: number; turbineMode: string; unlockCode: string }> = {};
  for (const c of configs) {
    const [date, hour] = c.datetime.split(" ");
    const key = `${date} ${hour}`;
    bulkConfigs[c.datetime] = {
      pitchAngle: c.pitchAngle,
      turbineMode: c.turbineMode,
      unlockCode: codeMap.get(key) ?? "missing",
    };
  }

  const configRes = await callWindpower({ action: "config", configs: bulkConfigs });
  console.log(chalk.green(`[phase5] Config: ${JSON.stringify(configRes).slice(0, 300)}`));

  // ─── PHASE 6: Turbine check (required before done) ───
  checkDeadline(deadline, "phase6-turbinecheck");
  console.log(chalk.cyan("\n[phase6] Running turbine check..."));

  await callWindpower({ action: "get", param: "turbinecheck" });
  const turbineResults = await pollResults(1, 10_000, deadline);
  console.log(chalk.green(`[phase6] Turbine check: ${JSON.stringify(turbineResults).slice(0, 200)}`));

  // ─── PHASE 7: Done ───
  checkDeadline(deadline, "phase7-done");
  console.log(chalk.cyan("\n[phase7] Calling done..."));

  const doneRes = await callWindpower({ action: "done" });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(chalk.cyan(`\n[main] Total elapsed: ${elapsed}s`));
  console.log(chalk.cyan(`[main] Done response: ${JSON.stringify(doneRes)}`));

  if (doneRes.code === 0 || doneRes.message?.includes("{FLG:")) {
    const flag = (doneRes as any).flag ?? doneRes.message?.match(/\{FLG:[^}]+\}/)?.[0];
    console.log(chalk.bgGreen.black(`\n FLAG: ${flag ?? doneRes.message} \n`));
    await saveFinalAnswer(EPISODE_ID, TASK_NAME, { configs: bulkConfigs }, doneRes as any);
  } else {
    console.log(chalk.red(`[main] No flag received: ${doneRes.message}`));
    await saveTmpAnswer(EPISODE_ID, TASK_NAME, {
      configs: bulkConfigs,
      analysis,
      doneResponse: doneRes,
    });
  }
};

main().catch((err) => {
  console.error(chalk.red("[main] Fatal error:"), err);
  process.exit(1);
});
