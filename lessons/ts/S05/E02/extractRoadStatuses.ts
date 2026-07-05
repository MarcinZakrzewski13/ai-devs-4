import chalk from "chalk";
import { createOpenAIProvider } from "@ai-devs/ai-core";
import { trackCost } from "./costGuard.ts";
import type { RoadId, RoadStatus } from "./types.ts";

const MODEL = "gpt-5-mini";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    RD224: { type: "string", enum: ["PASSABLE", "BLOCKED", "UNKNOWN"] },
    RD472: { type: "string", enum: ["PASSABLE", "BLOCKED", "UNKNOWN"] },
    RD820: { type: "string", enum: ["PASSABLE", "BLOCKED", "UNKNOWN"] },
    notes: { type: "string" },
  },
  required: ["RD224", "RD472", "RD820", "notes"],
} as const;

type Raw = {
  RD224: RoadStatus;
  RD472: RoadStatus;
  RD820: RoadStatus;
  notes: string;
};

const SYSTEM = `Analizujesz wypowiedź operatora systemu monitorowania dróg (język polski).
Wyciągnij status trzech dróg: RD224, RD472, RD820.

Zasady:
- PASSABLE: droga przejezdna / czysta / można jechać / bez problemu.
- BLOCKED: droga zablokowana / nieprzejezdna / uszkodzona / skażona / zamknięta.
- UNKNOWN: operator nie wspomniał o danej drodze lub nie da się jednoznacznie ustalić.

W notes streszcz w 1 zdaniu co operator powiedział o drogach.`;

export const extractRoadStatuses = async (
  transcript: string
): Promise<Record<RoadId, RoadStatus> & { notes: string }> => {
  const provider = createOpenAIProvider();
  const res = await provider.generateStructured<Raw>({
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Wypowiedź operatora:\n${transcript}` },
    ],
    schema: SCHEMA,
    schemaName: "roadStatuses",
    model: MODEL,
  });
  await trackCost(MODEL, res.usage, "extractRoadStatuses");
  console.log(
    chalk.magenta(
      `  [extract] RD224=${res.data.RD224} RD472=${res.data.RD472} RD820=${res.data.RD820}`
    )
  );
  return res.data;
};
