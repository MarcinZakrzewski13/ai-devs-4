import chalk from "chalk";

const API_KEY = process.env.API_KEY_AI_DEVS4!;
const CURRENT_URL = `https://hub.ag3nts.org/data/${API_KEY}/electricity.png`;
const TARGET_URL = "https://hub.ag3nts.org/i/solved_electricity.png";

export async function fetchCurrentBoard(reset = false): Promise<Buffer> {
  const url = reset ? `${CURRENT_URL}?reset=1` : CURRENT_URL;
  console.log(chalk.cyan(`[fetchBoard] ${reset ? "Resetting &" : ""} Fetching current board...`));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch current board: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  console.log(chalk.gray(`  [fetchBoard] Current board: ${buf.length} bytes`));
  return buf;
}

export async function fetchTargetBoard(): Promise<Buffer> {
  console.log(chalk.cyan("[fetchBoard] Fetching target board..."));

  const res = await fetch(TARGET_URL);
  if (!res.ok) throw new Error(`Failed to fetch target board: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  console.log(chalk.gray(`  [fetchBoard] Target board: ${buf.length} bytes`));
  return buf;
}
