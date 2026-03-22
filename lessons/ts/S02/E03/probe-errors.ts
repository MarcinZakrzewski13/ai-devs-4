// Probe różnych błędnych odpowiedzi w poszukiwaniu ukrytej flagi
// "Tokeny złych odpowiedzi to znaki - nadaj FLAG"

import "dotenv/config";
import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";

const TASK = "failure";

type Probe = { name: string; answer: unknown };

const probes: Probe[] = [
  { name: "empty_logs", answer: { logs: "" } },
  { name: "no_logs_field", answer: { } },
  { name: "logs_null", answer: { logs: null } },
  { name: "logs_number", answer: { logs: 123 } },
  { name: "logs_array", answer: { logs: ["line1", "line2"] } },
  { name: "string_answer", answer: "just a string" },
  { name: "too_long", answer: { logs: "X".repeat(50000) } },
  { name: "single_line", answer: { logs: "[2026-03-21 06:00] [INFO] test" } },
  { name: "wrong_format", answer: { logs: "no timestamp here" } },
  { name: "gibberish", answer: { logs: "asdfghjkl" } },
  { name: "only_info", answer: { logs: "[2026-03-21 06:00] [INFO] Everything is fine" } },
  { name: "missing_subsystem", answer: { logs: "[2026-03-21 06:00] [CRIT] Something happened" } },
];

async function main() {
  console.log(chalk.cyan("Probing error responses...\n"));

  for (const probe of probes) {
    try {
      console.log(chalk.yellow(`--- ${probe.name} ---`));
      const res = await sendAnswer(TASK, probe.answer);
      console.log(chalk.gray(`  code: ${res.code}`));
      console.log(chalk.gray(`  message: ${res.message}`));
      if ((res as any).hint) console.log(chalk.magenta(`  hint: ${(res as any).hint}`));
      if ((res as any).debug) console.log(chalk.magenta(`  debug: ${JSON.stringify((res as any).debug)}`));
      // Log full response to see all fields
      const extra = Object.keys(res).filter(k => !["code", "message"].includes(k));
      if (extra.length > 0) {
        console.log(chalk.magenta(`  extra fields: ${extra.join(", ")}`));
        for (const k of extra) {
          console.log(chalk.magenta(`    ${k}: ${JSON.stringify((res as any)[k])}`));
        }
      }
      console.log();
    } catch (err: any) {
      console.log(chalk.red(`  error: ${err.message}\n`));
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(console.error);
