// Fast transmit: start → listen until end → transmit with known answer.
// Skips LLM analysis — uses manually verified answer from exploration.
// Run: bun run lessons/ts/S05/E01/analysis-tools/fast-transmit.ts

import "dotenv/config";
import chalk from "chalk";
import { sendAnswer, saveFinalAnswer, saveTmpAnswer } from "@ai-devs/ai-devs-hub";

const TASK = "radiomonitoring";
const MAX = 60;

const KNOWN_ANSWER = {
  cityName: "Skarszewy",
  cityArea: "10.73",
  warehousesCount: 11,
  phoneNumber: "644122092",
};

async function main() {
  console.log(chalk.cyan.bold("\n  S05E01 — FAST TRANSMIT\n"));
  console.log(chalk.white("  Known answer:"), chalk.gray(JSON.stringify(KNOWN_ANSWER)));
  console.log();

  console.log(chalk.gray("  Starting session..."));
  await sendAnswer(TASK, { action: "start" });
  console.log(chalk.green("  ✓ session started\n"));

  for (let seq = 1; seq <= MAX; seq++) {
    console.log(chalk.gray(`  ┄ listen ${seq}/${MAX}...`));
    const raw: any = await sendAnswer(TASK, { action: "listen" });

    if (raw.code !== 100) {
      console.log(chalk.cyan(`  ✓ End signal (code=${raw.code}): ${raw.message}`));
      break;
    }

    const msg = (raw.message ?? "").toLowerCase();
    const endWords = ["no more", "end of", "finished", "all data", "enough", "done", "wystarczy", "koniec", "dostatecznie"];
    if (endWords.some((w) => msg.includes(w))) {
      console.log(chalk.cyan(`  ✓ End message: ${raw.message}`));
      break;
    }
  }

  console.log(chalk.cyan.bold("\n  TRANSMITTING...\n"));
  console.log(chalk.white(JSON.stringify(KNOWN_ANSWER, null, 2)));

  await saveTmpAnswer("S05E01", TASK, KNOWN_ANSWER);

  const response: any = await sendAnswer(TASK, {
    action: "transmit",
    ...KNOWN_ANSWER,
  });

  const flagMatch = JSON.stringify(response).match(/\{FLG:[^}]+\}/);
  if (flagMatch) {
    console.log(
      "\n" + chalk.bgYellow.black.bold(`  🏁 FLAGA: ${flagMatch[0]}  `) + "\n"
    );
    await saveFinalAnswer("S05E01", TASK, KNOWN_ANSWER, response);
    console.log(chalk.green("  ✓ Final answer saved"));
  } else {
    console.log(
      chalk.bgRed.white.bold(`  ✗ FAILED [${response.code}]: ${response.message}`)
    );
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(chalk.red("\n✗ " + (err instanceof Error ? err.stack ?? err.message : String(err))));
  process.exit(1);
});
