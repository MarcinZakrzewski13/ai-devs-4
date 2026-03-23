// Modele uzyte w zadaniu:
//   - gpt-5-nano  → klasyfikacja notatek operatora (Structured Output, batch)

import chalk from "chalk";
import { parseSensors } from "./parse-sensors.ts";
import { detectDataAnomalies } from "./detect-data-anomalies.ts";
import { classifyNotes } from "./classify-notes.ts";
import { buildAnswer } from "./build-answer.ts";
import { verifyAnswer } from "./verify-answer.ts";

// 1. Parse all sensor files
console.log(chalk.blue("Parsing sensor files..."));
const readings = await parseSensors();
console.log(chalk.blue(`Loaded ${readings.length} sensor readings.`));

// 2. Deterministic anomaly detection (ranges + inactive sensors)
const { dataAnomalyIds, validDataFiles } = detectDataAnomalies(readings);
console.log(chalk.yellow(`Data anomalies (deterministic): ${dataAnomalyIds.size}`));
console.log(chalk.gray(`Valid data files for note analysis: ${validDataFiles.length}`));

// 3. LLM note classification (only for valid-data files)
console.log(chalk.cyan("→ Classifying operator notes via LLM (deduplicated)..."));
const noteAnomalyIds = await classifyNotes(validDataFiles);
console.log(chalk.yellow(`Note anomalies (LLM): ${noteAnomalyIds.size}`));

// 4. Combine and build answer
const answer = buildAnswer(dataAnomalyIds, noteAnomalyIds);
console.log(chalk.green(`\nTotal anomalies: ${answer.length}`));
console.log(chalk.gray(JSON.stringify(answer)));

// 5. Send to Centrala
await verifyAnswer(answer);
