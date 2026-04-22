import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import { trackCost } from "./costGuard.ts";
import { FACT_SCHEMA, TEXT_ANALYSIS_SYSTEM_PROMPT } from "./extractFacts.ts";
import type { TextAnalysisResult } from "./types.ts";

const MODEL = "gpt-5-nano";
const MAX_CHARS = 4000;

export const analyzeText = async (
  text: string,
  source: string
): Promise<TextAnalysisResult> => {
  const truncated =
    text.length > MAX_CHARS
      ? text.slice(0, MAX_CHARS) + "\n[...truncated]"
      : text;

  const provider = createDefaultProvider();

  const result = await provider.generateStructured<TextAnalysisResult>({
    messages: [
      { role: "system", content: TEXT_ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: truncated },
    ],
    schema: FACT_SCHEMA,
    schemaName: "text_analysis",
    model: MODEL,
  });

  await trackCost(MODEL, result.usage, `analyzeText:${source}`);

  if (result.data.isNoise) {
    console.log(chalk.gray(`  [router] ${source} → noise (filtered)`));
  } else if (result.data.facts.length > 0) {
    console.log(
      chalk.hex("#FF8C00")(
        `  🔍 ${source} → ${result.data.facts.length} facts: ${result.data.facts.map((f) => f.kind + "=" + f.value.slice(0, 30)).join(", ")}`
      )
    );
  } else {
    console.log(chalk.gray(`  [router] ${source} → no facts extracted`));
  }

  return result.data;
};
