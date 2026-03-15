// Modele użyte w zadaniu:
//   - brak (API deterministyczne, bez LLM)

import chalk from "chalk";
import { config } from "dotenv";
import { callRailwayApi } from "./apiClient.ts";
import { saveRailwayFlag } from "./verifyAnswer.ts";

config();

// --- Phase 1: Discovery ---
console.log(chalk.blue("\n[main] Phase 1: Discovery — calling help"));
const helpResponse = await callRailwayApi({ action: "help" });

console.log(chalk.yellow("\n[main] Full help response:"));
console.log(JSON.stringify(helpResponse, null, 2));

// --- Phase 2: Execution — activate route X-01 ---
const ROUTE = "X-01";

// Step 1: Check current status
console.log(chalk.blue(`\n[main] Step 1: Get status of route ${ROUTE}`));
await callRailwayApi({ action: "getstatus", route: ROUTE });

// Step 2: Enter reconfigure mode
console.log(chalk.blue(`\n[main] Step 2: Enter reconfigure mode for ${ROUTE}`));
await callRailwayApi({ action: "reconfigure", route: ROUTE });

// Step 3: Set status to RTOPEN (activate)
console.log(chalk.blue(`\n[main] Step 3: Set ${ROUTE} status to RTOPEN`));
await callRailwayApi({ action: "setstatus", route: ROUTE, value: "RTOPEN" });

// Step 4: Save (exit reconfigure mode)
console.log(chalk.blue(`\n[main] Step 4: Save route ${ROUTE}`));
const saveResponse = await callRailwayApi({ action: "save", route: ROUTE });

// Check for flag in final response
const flagMatch = JSON.stringify(saveResponse).match(/\{FLG:[^}]+\}/);
if (flagMatch) {
  console.log(chalk.green(`\n[main] Flag captured: ${flagMatch[0]}`));
  await saveRailwayFlag(
    { sequence: ["getstatus", "reconfigure", "setstatus:RTOPEN", "save"], route: ROUTE },
    saveResponse
  );
}
