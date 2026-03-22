import chalk from "chalk";
import path from "path";
import { createDefaultProvider, type TextContentPart, type ImageContentPart } from "@ai-devs/ai-core";
import type { DamSector } from "./types.ts";

const MODEL = "gpt-5.4";
const API_KEY = process.env.API_KEY_AI_DEVS4!;
const MAP_URL = `https://hub.ag3nts.org/data/${API_KEY}/drone.png`;
const TMP_DIR = path.resolve(import.meta.dir, "../../resources/S02E05/tmp");
const CACHE_PATH = path.join(TMP_DIR, "map-analysis.json");

const DAM_SECTOR_SCHEMA = {
  type: "object" as const,
  properties: {
    column: {
      type: "number" as const,
      description: "Column number of the dam sector (1-indexed from left)",
    },
    row: {
      type: "number" as const,
      description: "Row number of the dam sector (1-indexed from top)",
    },
    totalColumns: {
      type: "number" as const,
      description: "Total number of columns in the grid",
    },
    totalRows: {
      type: "number" as const,
      description: "Total number of rows in the grid",
    },
    reasoning: {
      type: "string" as const,
      description: "Brief explanation of how you identified the dam sector",
    },
  },
  required: ["column", "row", "totalColumns", "totalRows", "reasoning"] as const,
  additionalProperties: false,
};

type MapAnalysis = {
  column: number;
  row: number;
  totalColumns: number;
  totalRows: number;
  reasoning: string;
};

export const analyzeMap = async (): Promise<DamSector> => {
  // Check cache first
  const cacheFile = Bun.file(CACHE_PATH);
  if (await cacheFile.exists()) {
    const cached = await cacheFile.json() as MapAnalysis;
    console.log(chalk.gray(`[analyzeMap] Using cached result: column=${cached.column}, row=${cached.row}`));
    return { column: cached.column, row: cached.row };
  }

  console.log(chalk.cyan(`[analyzeMap] Fetching map from ${MAP_URL}...`));
  const mapRes = await fetch(MAP_URL);
  const mapBuffer = await mapRes.arrayBuffer();
  const base64 = Buffer.from(mapBuffer).toString("base64");

  console.log(chalk.cyan(`[analyzeMap] Analyzing map with ${MODEL} (vision)...`));
  const provider = createDefaultProvider();

  const result = await provider.generateStructured<MapAnalysis>({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This is a map of a power plant area divided into a grid of sectors.
The map has grid lines creating rows and columns. Count them carefully.

Your task:
1. Count the EXACT number of columns and rows in the grid
2. Find the sector containing the DAM (tama) — it has intensely blue/cyan water color, deliberately made more visible
3. Report the column and row of that sector (1-indexed, starting from top-left corner: column 1 = leftmost, row 1 = topmost)

Be very precise when counting grid lines. Count from left to right for columns, top to bottom for rows.`,
          } satisfies TextContentPart,
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64}`,
              detail: "high",
            },
          } satisfies ImageContentPart,
        ],
      },
    ],
    schema: DAM_SECTOR_SCHEMA,
    schemaName: "map_analysis",
    model: MODEL,
  });

  const analysis = result.data;
  console.log(chalk.green(`[analyzeMap] Grid: ${analysis.totalColumns}x${analysis.totalRows}`));
  console.log(chalk.green(`[analyzeMap] Dam sector: column=${analysis.column}, row=${analysis.row}`));
  console.log(chalk.gray(`[analyzeMap] Reasoning: ${analysis.reasoning}`));

  // Cache result
  await Bun.write(CACHE_PATH, JSON.stringify(analysis, null, 2));
  console.log(chalk.gray(`[analyzeMap] Cached to ${CACHE_PATH}`));

  return { column: analysis.column, row: analysis.row };
};
