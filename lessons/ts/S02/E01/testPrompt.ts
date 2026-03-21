import chalk from "chalk";
import { sendAnswer } from "@ai-devs/ai-devs-hub";
import type { Product, ItemResult, CycleResult } from "./types.ts";
import { buildPrompt, loadPromptTemplate } from "./buildPrompt.ts";
import { countTokens } from "./countTokens.ts";

const TASK = "categorize";

export async function resetBudget(): Promise<void> {
  console.log(chalk.yellow("[reset] Resetting budget..."));
  const res = await sendAnswer(TASK, { prompt: "reset" });
  console.log(chalk.gray(`[reset] ${res.message} (balance: ${(res as any).balance ?? "?"})`));
}

export async function testAllProducts(products: Product[], attempt: number): Promise<CycleResult> {
  const template = loadPromptTemplate();
  const templateTokens = countTokens(template);
  const items: ItemResult[] = [];
  let budgetExceeded = false;
  let flag: string | undefined;
  let lastCacheHitRate = 0;

  console.log(chalk.cyan(`[test] Prompt template (${templateTokens} tokens):`));
  console.log(chalk.gray(template));

  for (const product of products) {
    const prompt = buildPrompt(template, product);
    const promptTokens = countTokens(prompt);
    console.log(chalk.cyan(`\n[test] ${product.code} (${promptTokens} tok) → sending...`));

    const res = await sendAnswer(TASK, { prompt });
    const msg = res.message ?? "";
    const debug = (res as any).debug;

    if (res.code === -910 || msg.toLowerCase().includes("insufficient funds")) {
      budgetExceeded = true;
      console.log(chalk.red(`[test] ${product.code}: BUDGET EXCEEDED`));
      items.push({
        code: product.code,
        description: product.description,
        output: "BUDGET_EXCEEDED",
        correct: false,
        tokens: 0,
        cachedTokens: 0,
        inputCost: 0,
        balanceAfter: 0,
      });
      break;
    }

    const output = debug?.output ?? msg;
    const correct = msg === "ACCEPTED" || debug?.result === "correct classification";

    if (debug?.global_cache_hit_rate) lastCacheHitRate = debug.global_cache_hit_rate;

    const item: ItemResult = {
      code: product.code,
      description: product.description,
      output,
      correct,
      tokens: debug?.tokens ?? 0,
      cachedTokens: debug?.cached_tokens ?? 0,
      inputCost: debug?.input_cost ?? 0,
      balanceAfter: debug?.balance ?? 0,
    };

    items.push(item);

    const status = correct ? chalk.green("OK") : chalk.red("WRONG");
    console.log(`[test] ${product.code}: ${output} ${status} (bal: ${item.balanceAfter})`);

    if (msg.includes("{FLG:")) {
      flag = msg.match(/\{FLG:[^}]+\}/)?.[0];
      console.log(chalk.bgGreen.black(`\n FLAG: ${flag} `));
    }

    // Stop early on wrong classification — budget is likely gone
    if (!correct && !budgetExceeded) {
      console.log(chalk.red("[test] Wrong classification — stopping early to save budget"));
      break;
    }
  }

  return {
    attempt,
    promptTemplate: template,
    promptTokens: templateTokens,
    items,
    totalTested: items.length,
    totalCorrect: items.filter((i) => i.correct).length,
    budgetExceeded,
    cacheHitRate: lastCacheHitRate,
    flag,
  };
}
