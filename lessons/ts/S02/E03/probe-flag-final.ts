// Extra flag: "Tokeny złych odpowiedzi to znaki - nadaj FLAG"
// tokenCount=70→F, 76→L, 65→A, 71→G (ASCII codes)
// Wysyłamy logi z precyzyjnym token count, hub zwraca literę

import "dotenv/config";
import chalk from "chalk";
import { countTokens } from "./count-tokens";

const TASK = "failure";

async function sendRaw(logs: string) {
  const apikey = process.env.API_KEY_AI_DEVS4;
  const raw = await fetch("https://hub.ag3nts.org/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey, task: TASK, answer: { logs } }),
  });
  return await raw.json() as any;
}

function buildLogsWithTokenCount(target: number): string {
  // Start with 10 lines of "a" (min 10 lines required)
  let base = Array(10).fill("a").join("\n");
  let tokens = countTokens(base); // = 19

  if (tokens > target) {
    throw new Error(`Base is already ${tokens} tokens, target is ${target}`);
  }

  // Add " word" repeatedly to increase token count
  while (tokens < target) {
    base += " word";
    tokens = countTokens(base);
  }

  // If we overshot, try removing characters
  while (tokens > target) {
    base = base.slice(0, -1);
    tokens = countTokens(base);
  }

  // Fine-tune by adding single chars
  while (tokens < target) {
    base += "x";
    tokens = countTokens(base);
  }

  return base;
}

async function main() {
  const targets = [
    { ascii: 70, char: "F" },
    { ascii: 76, char: "L" },
    { ascii: 65, char: "A" },
    { ascii: 71, char: "G" },
  ];

  const letters: string[] = [];

  for (const t of targets) {
    console.log(chalk.cyan(`\n=== Celowanie w tokenCount=${t.ascii} (${t.char}) ===`));

    const logs = buildLogsWithTokenCount(t.ascii);
    const localTokens = countTokens(logs);
    console.log(chalk.gray(`  Local tokens: ${localTokens}`));

    const res = await sendRaw(logs);
    console.log(chalk.gray(`  Hub tokenCount: ${res.tokenCount}`));
    console.log(chalk.gray(`  Code: ${res.code}`));

    if (res.letter) {
      console.log(chalk.green(`  LETTER: ${res.letter}`));
      letters.push(res.letter);
    } else if (res.noLetterSent !== undefined) {
      console.log(chalk.yellow(`  noLetterSent: "${res.noLetterSent}"`));
    }

    // If token count doesn't match, adjust
    if (res.tokenCount !== t.ascii) {
      console.log(chalk.yellow(`  Mismatch! Adjusting...`));
      // Try binary search approach
      let current = logs;
      let hubTokens = res.tokenCount;
      let attempts = 0;

      while (hubTokens !== t.ascii && attempts < 20) {
        if (hubTokens < t.ascii) {
          current += "x";
        } else {
          current = current.slice(0, -1);
        }
        const r = await sendRaw(current);
        hubTokens = r.tokenCount;
        attempts++;

        if (hubTokens === t.ascii) {
          console.log(chalk.green(`  Adjusted! letter: ${r.letter}`));
          if (r.letter) letters.push(r.letter);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(chalk.gray(`  Full response: ${JSON.stringify(res)}`));
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(chalk.bgGreen.black(`\n LETTERS COLLECTED: ${letters.join("")} `));
}

main().catch(console.error);
