import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import {
  decodeBase64Text,
  previewBytes,
  toDataUrl,
} from "./decodeBinary.ts";
import { analyzeText } from "./analyzeText.ts";
import { trackCost } from "./costGuard.ts";
import { FACT_SCHEMA, TEXT_ANALYSIS_SYSTEM_PROMPT } from "./extractFacts.ts";
import type { TextAnalysisResult } from "./types.ts";

const MODEL_VISION = "gpt-5-mini";
const MODEL_FALLBACK = "gpt-5-mini";

type CityEntry = { name: string; occupiedArea?: number; [k: string]: unknown };

const isCityList = (v: unknown): v is CityEntry[] =>
  Array.isArray(v) && v.length > 0 && typeof (v[0] as any)?.name === "string";

export const analyzeJson = async (
  b64: string,
  source: string
): Promise<TextAnalysisResult> => {
  try {
    const text = decodeBase64Text(b64);
    const parsed: unknown = JSON.parse(text);

    // Deterministic: city list with occupiedArea → extract each city's area as fact
    if (isCityList(parsed)) {
      const facts: import("./types.ts").Fact[] = parsed
        .filter((c) => c.occupiedArea !== undefined)
        .map((c) => ({
          kind: "cityArea" as const,
          value: `${c.name}:${c.occupiedArea}`,
          confidence: 0.85,
          source: `city-list-json:${c.name}`,
        }));
      console.log(
        chalk.gray(
          `  [analyzeBinary] city list JSON → ${facts.length} area facts extracted deterministically`
        )
      );
      return { isNoise: false, facts };
    }

    const pretty = JSON.stringify(parsed, null, 2).slice(0, 4000);
    return analyzeText(pretty, source);
  } catch {
    console.log(chalk.yellow(`  [analyzeBinary] JSON parse failed for ${source}, using preview`));
    return analyzeText(previewBytes(b64), source);
  }
};

export const analyzeImageSmall = async (
  b64: string,
  mime: string,
  source: string
): Promise<TextAnalysisResult> => {
  console.log(chalk.gray(`  [vision] ${source} → ${MODEL_VISION}`));

  const provider = createDefaultProvider();
  const dataUrl = toDataUrl(b64, mime);

  const result = await provider.generateStructured<TextAnalysisResult>({
    messages: [
      { role: "system", content: TEXT_ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: dataUrl, detail: "auto" },
          },
          {
            type: "text",
            text: "Przeanalizuj obraz i wyciągnij fakty o mieście Syjon.",
          },
        ],
      },
    ],
    schema: FACT_SCHEMA,
    schemaName: "text_analysis",
    model: MODEL_VISION,
  });

  await trackCost(MODEL_VISION, result.usage, `vision:${source}`);

  if (!result.data.isNoise && result.data.facts.length > 0) {
    console.log(
      chalk.hex("#FF8C00")(
        `  🔍 vision:${source} → ${result.data.facts.length} facts`
      )
    );
  }

  return result.data;
};

export const analyzeOther = async (
  b64: string,
  source: string
): Promise<TextAnalysisResult> => {
  const preview = previewBytes(b64, 500);
  console.log(chalk.gray(`  [binary-other] ${source} preview: ${preview.slice(0, 100)}`));

  const provider = createDefaultProvider();

  const result = await provider.generateStructured<TextAnalysisResult>({
    messages: [
      { role: "system", content: TEXT_ANALYSIS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Przechwycony fragment binarny (podgląd 500B):\n${preview}\n\nCzy zawiera informacje o mieście Syjon?`,
      },
    ],
    schema: FACT_SCHEMA,
    schemaName: "text_analysis",
    model: MODEL_FALLBACK,
  });

  await trackCost(MODEL_FALLBACK, result.usage, `binary-other:${source}`);

  return result.data;
};
