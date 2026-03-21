import chalk from "chalk";
import { writeFileSync, readFileSync, readdirSync, existsSync } from "fs";
import { createDefaultProvider } from "@ai-devs/ai-core";
import { countTokens } from "./countTokens.ts";
import { loadAllProducts } from "./fetchProducts.ts";
import type { CycleResult } from "./types.ts";

const RESOURCES_DIR = "lessons/ts/resources/S02E01";
const PROMPT_FILE = `${RESOURCES_DIR}/current-prompt.txt`;

function loadPromptHistory(): string {
  const files = readdirSync(RESOURCES_DIR)
    .filter((f) => f.match(/^prompt-v\d+\.md$/))
    .sort();
  if (files.length === 0) return "No previous attempts.";

  return files
    .map((f) => {
      const content = readFileSync(`${RESOURCES_DIR}/${f}`, "utf-8");
      const promptMatch = content.match(/```\n([\s\S]*?)```/);
      const correctMatch = content.match(/Correct: (\d+\/\d+)/);
      const errorsSection = content.match(/### Bledy\n([\s\S]*?)(?=\n## |$)/);
      return `### ${f}\nPrompt: ${promptMatch?.[1]?.trim() ?? "?"}\nResult: ${correctMatch?.[1] ?? "?"}\nErrors: ${errorsSection?.[1]?.trim() ?? "none"}`;
    })
    .join("\n\n");
}

export async function optimizePrompt(lastResult: CycleResult): Promise<string> {
  const allProducts = loadAllProducts();
  const history = loadPromptHistory();

  const productList = allProducts
    .map((p) => `  ${p.code}: ${p.description}`)
    .join("\n");

  const errors = lastResult.items
    .filter((i) => !i.correct)
    .map((i) => `  ${i.code}: classified as "${i.output}" but should be different. Desc: ${i.description}`)
    .join("\n");

  const systemPrompt = `You are an expert prompt engineer. Your task is to optimize a classification prompt for a very small, archaic language model with a 100-token context window.

RULES:
- The prompt MUST be a template with {code} and {description} placeholders
- When placeholders are filled with real product data, total tokens MUST be under 100
- Product descriptions can be up to 100 chars long, codes are 5 chars (e.g. i2567)
- The prompt must classify items as DNG (dangerous: weapons, explosives, ammunition) or NEU (neutral: everything else)
- CRITICAL EXCEPTION: Reactor/nuclear items must ALWAYS be classified as NEU regardless of how dangerous they sound
- The target model is very small — use explicit keyword matching, not abstract rules
- The static prefix (before {code}: {description}) should be as long and consistent as possible for prompt caching
- Reply with ONLY the prompt template text, nothing else`;

  const userPrompt = `## Current prompt (${lastResult.promptTokens} template tokens):
${lastResult.promptTemplate}

## Last run errors:
${errors || "None — but budget was exceeded before testing all items"}

## All known products in the pool:
${productList}

## Previous attempts history:
${history}

Write an improved prompt template. It must contain {code} and {description} placeholders. Keep it under 60 tokens (template only) to leave room for product data. Focus on fixing the specific errors above.`;

  console.log(chalk.magenta("[optimize] Asking LLM for improved prompt..."));

  const provider = createDefaultProvider();
  const result = await provider.generateText({
    model: "anthropic/claude-sonnet-4-6",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  let newPrompt = result.text.trim();

  // Strip markdown code fences if present
  newPrompt = newPrompt.replace(/^```\w*\n?/, "").replace(/\n?```$/, "").trim();

  const tokens = countTokens(newPrompt.replace("{code}", "i9999").replace("{description}", "A".repeat(80)));
  console.log(chalk.magenta(`[optimize] New prompt (${countTokens(newPrompt)} template tokens, ~${tokens} with max product):`));
  console.log(chalk.gray(newPrompt));

  // Save to file
  writeFileSync(PROMPT_FILE, newPrompt);

  return newPrompt;
}
