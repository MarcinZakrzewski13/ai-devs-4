// Szukamy minimalnej wielkości logów, żeby nie dostać -960 "too short"

import "dotenv/config";
import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";

const TASK = "failure";

async function main() {
  const apikey = process.env.API_KEY_AI_DEVS4;

  // Budujemy logi o rosnącej ilości linii
  const baseLine = "[2026-03-21 06:00] [WARN] ECCS8 test event";

  for (let lines = 1; lines <= 20; lines++) {
    const logs = Array(lines).fill(baseLine).join("\n");

    const raw = await fetch("https://hub.ag3nts.org/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey, task: TASK, answer: { logs } }),
    });
    const body = await raw.json() as any;

    console.log(`  ${lines} lines → code: ${body.code}, msg: ${body.message?.slice(0, 80)}`);

    if (body.code !== -960) {
      console.log(chalk.green(`  ^^^ NIE -960! Pełna odpowiedź:`));
      console.log(chalk.green(`  ${JSON.stringify(body)}`));
      break;
    }

    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch(console.error);
