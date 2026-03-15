// Modele użyte w zadaniu:
//   - brak (API deterministyczne, bez LLM)

import chalk from "chalk";
import { config } from "dotenv";
import { callRailwayApi } from "./apiClient.ts";
import { saveRailwayFlag } from "./verifyAnswer.ts";

config();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POLITE_DELAY = 100; // 0.1s between steps

// --- Activate route X-01 (minimal steps, 0.1s polite delay) ---
const ROUTE = "X-01";

// Step 1: Enter reconfigure mode
console.log(chalk.blue(`\n[main] Step 1: Enter reconfigure mode for ${ROUTE}`));
await callRailwayApi({ action: "reconfigure", route: ROUTE });
await sleep(POLITE_DELAY);

// Step 2: Set status to RTOPEN (activate)
console.log(chalk.blue(`\n[main] Step 2: Set ${ROUTE} status to RTOPEN`));
await callRailwayApi({ action: "setstatus", route: ROUTE, value: "RTOPEN" });
await sleep(POLITE_DELAY);

// Step 3: Save (exit reconfigure mode)
console.log(chalk.blue(`\n[main] Step 3: Save route ${ROUTE}`));
const saveResponse = await callRailwayApi({ action: "save", route: ROUTE });

// Check for flag in final response
const flagMatch = JSON.stringify(saveResponse).match(/\{FLG:[^}]+\}/);
if (flagMatch) {
  console.log(chalk.green(`\n[main] Flag captured: ${flagMatch[0]}`));
  await saveRailwayFlag(
    { sequence: ["reconfigure", "setstatus:RTOPEN", "save"], route: ROUTE },
    saveResponse
  );
}
