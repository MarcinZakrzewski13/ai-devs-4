import chalk from "chalk";
import { mkdirSync, writeFileSync } from "fs";

const HUB_URL = "https://hub.ag3nts.org/data";
const TMP_DIR = "lessons/ts/resources/S02E03/tmp";

export async function fetchLogs(): Promise<string> {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) throw new Error("API_KEY_AI_DEVS4 not set");

  const url = `${HUB_URL}/${apikey}/failure.log`;
  console.log(chalk.blue(`Fetching logs from ${url}...`));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const text = await res.text();

  mkdirSync(TMP_DIR, { recursive: true });
  writeFileSync(`${TMP_DIR}/failure.log`, text);
  console.log(chalk.green(`Saved raw logs to ${TMP_DIR}/failure.log`));

  const lines = text.split("\n").filter(Boolean);
  console.log(chalk.gray(`Total lines: ${lines.length}`));

  return text;
}
