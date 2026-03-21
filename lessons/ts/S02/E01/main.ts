// Modele użyte w zadaniu:
//   - claude-sonnet-4-6 → optymalizacja promptu (prompt engineer)
//   - (wewnętrzny model huba) → klasyfikacja produktów na podstawie naszego promptu

import chalk from "chalk";
import { config } from "dotenv";
import { saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import { fetchProducts } from "./fetchProducts.ts";
import { resetBudget, testAllProducts } from "./testPrompt.ts";
import { evaluateAndSave } from "./evaluateResults.ts";
import { optimizePrompt } from "./optimizePrompt.ts";
import { loadPromptTemplate } from "./buildPrompt.ts";
import { countTokens } from "./countTokens.ts";

config();

const EPISODE_ID = "S02E01";
const TASK = "categorize";
const MAX_ATTEMPTS = 10;
const MAX_PROMPT_TOKENS = 95; // leave margin for safety

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  console.log(chalk.bold.blue(`\n${"=".repeat(50)}`));
  console.log(chalk.bold.blue(`  Attempt ${attempt}/${MAX_ATTEMPTS}`));
  console.log(chalk.bold.blue(`${"=".repeat(50)}\n`));

  // 1. Reset budget
  await resetBudget();

  // 2. Fetch fresh CSV (saves to resources/S02E01/)
  const products = await fetchProducts();

  // 3. Check token count before wasting budget
  const template = loadPromptTemplate();
  const longestDesc = products.reduce((a, b) => (a.description.length > b.description.length ? a : b));
  const maxPrompt = template.replace("{code}", longestDesc.code).replace("{description}", longestDesc.description);
  const maxTokens = countTokens(maxPrompt);

  console.log(chalk.yellow(`[check] Max prompt tokens: ${maxTokens} (limit: ${MAX_PROMPT_TOKENS})`));

  if (maxTokens > MAX_PROMPT_TOKENS) {
    console.log(chalk.red(`[check] Prompt too long! Optimizing before testing...`));
    await optimizePrompt({
      attempt,
      promptTemplate: template,
      promptTokens: countTokens(template),
      items: [],
      totalTested: 0,
      totalCorrect: 0,
      budgetExceeded: false,
      cacheHitRate: 0,
    });
    continue;
  }

  // 4. Test prompt on all products
  const result = await testAllProducts(products, attempt);

  // 5. Evaluate and save prompt version
  const evalPath = evaluateAndSave(result);
  console.log(chalk.blue(`[eval] Saved: ${evalPath}`));

  // 6. Check for flag
  if (result.flag) {
    console.log(chalk.bgGreen.black(`\n FLAG: ${result.flag} \n`));
    await saveFinalAnswer(EPISODE_ID, TASK, { prompt: template }, {
      code: 0,
      message: result.flag,
    });
    break;
  }

  // 7. Check if all correct (flag comes on last item)
  if (result.totalCorrect === 10 && !result.flag) {
    console.log(chalk.green("[main] All 10 correct but no flag — might be in last response. Check logs."));
    break;
  }

  // 8. Optimize prompt for next attempt
  if (attempt < MAX_ATTEMPTS) {
    const newPrompt = await optimizePrompt(result);
    // Update eval file with feedback
    const evalContent = await Bun.file(evalPath).text();
    const updated = evalContent.replace(
      "## Feedback od modelu optymalizujacego\n(pending)",
      `## Feedback od modelu optymalizujacego\nNew prompt generated (${countTokens(newPrompt)} template tokens)`
    );
    await Bun.write(evalPath, updated);
  }
}
