// Discovery: wywołuje action=help dla task=filesystem
// i zapisuje odpowiedź do resources/S04E04/tmp/api-help.json.
// Cel: ustalić format ścieżek, linków MD, limity batch_mode.

import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";

const API_KEY = process.env.API_KEY_AI_DEVS4!;
const HUB_URL = "https://hub.ag3nts.org/verify";
const TASK = "filesystem";
const OUT_DIR = path.resolve("lessons/ts/resources/S04E04/tmp");
const OUT_FILE = path.join(OUT_DIR, "api-help.json");

async function main() {
  if (!API_KEY) throw new Error("API_KEY_AI_DEVS4 not set");
  console.log(chalk.cyan.bold("\n  FILESYSTEM API — help discovery\n"));

  const body = { apikey: API_KEY, task: TASK, answer: { action: "help" } };
  console.log(chalk.gray("  → POST " + HUB_URL));
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(chalk.gray(`  ← HTTP ${res.status}`));

  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {}

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(parsed, null, 2), "utf8");
  console.log(chalk.green("  ✓ saved → " + OUT_FILE));
  console.log("\n" + chalk.white(JSON.stringify(parsed, null, 2)) + "\n");
}

main().catch((err) => {
  console.error(chalk.red("✗ " + (err instanceof Error ? err.message : String(err))));
  process.exit(1);
});
