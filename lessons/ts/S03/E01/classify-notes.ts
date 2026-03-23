import { createDefaultProvider } from "@ai-devs/ai-core";
import type { SensorReading } from "./types.ts";

const BATCH_SIZE = 500;

const NOTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    error_indices: {
      type: "array",
      description: "Indices of notes where the operator reports a problem, error, anomaly, or concern about sensor readings.",
      items: { type: "integer" },
    },
  },
  required: ["error_indices"],
} as const;

const SYSTEM_PROMPT = `You analyze operator notes from nuclear plant sensors.
Each note is numbered. Determine if the operator reports a problem/error/anomaly/concern,
or if the note indicates everything is OK/normal/stable.

Return ONLY the indices of notes where the operator claims there IS a problem.

Be very careful with negations:
- "nothing suggests a fault" = OK (no problem)
- "no concerning drift" = OK
- "no sign of abnormal activity" = OK
- "This state looks unstable" = PROBLEM
- "I can see a clear irregularity" = PROBLEM`;

export async function classifyNotes(
  validDataFiles: SensorReading[]
): Promise<Set<string>> {
  // Deduplicate notes
  const noteToFileIds = new Map<string, string[]>();
  for (const reading of validDataFiles) {
    const ids = noteToFileIds.get(reading.operator_notes) ?? [];
    ids.push(reading.fileId);
    noteToFileIds.set(reading.operator_notes, ids);
  }

  const uniqueNotes = [...noteToFileIds.keys()];
  const provider = createDefaultProvider();
  const errorFileIds = new Set<string>();

  // Process in batches
  for (let i = 0; i < uniqueNotes.length; i += BATCH_SIZE) {
    const batch = uniqueNotes.slice(i, i + BATCH_SIZE);
    const userContent = batch.map((note, idx) => `${i + idx}. ${note}`).join("\n");

    const result = await provider.generateStructured<{
      error_indices: number[];
    }>({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      schema: NOTE_SCHEMA,
      schemaName: "note_classification",
      model: "gpt-5-nano",
    });

    for (const idx of result.data.error_indices) {
      const note = uniqueNotes[idx];
      if (note) {
        const fileIds = noteToFileIds.get(note) ?? [];
        for (const fid of fileIds) {
          errorFileIds.add(fid);
        }
      }
    }
  }

  return errorFileIds;
}
