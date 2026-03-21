import { writeFileSync, readdirSync } from "fs";
import type { CycleResult } from "./types.ts";

const RESOURCES_DIR = "lessons/ts/resources/S02E01";

function getNextVersion(): number {
  const files = readdirSync(RESOURCES_DIR).filter((f) => f.match(/^prompt-v\d+\.md$/));
  if (files.length === 0) return 1;
  const versions = files.map((f) => parseInt(f.match(/v(\d+)/)?.[1] ?? "0"));
  return Math.max(...versions) + 1;
}

export function evaluateAndSave(result: CycleResult, feedback?: string): string {
  const version = getNextVersion();
  const fileName = `prompt-v${version}.md`;
  const filePath = `${RESOURCES_DIR}/${fileName}`;

  const errors = result.items
    .filter((i) => !i.correct)
    .map((i) => `  - ${i.code}: output="${i.output}" (${i.description.slice(0, 60)}...)`)
    .join("\n");

  const allItems = result.items
    .map((i) => `| ${i.code} | ${i.description.slice(0, 50)}... | ${i.output} | ${i.correct ? "OK" : "WRONG"} | ${i.tokens} | ${i.cachedTokens} | ${i.inputCost} |`)
    .join("\n");

  const content = `# Prompt v${version}

## Prompt
\`\`\`
${result.promptTemplate}
\`\`\`

## Token count: ${result.promptTokens} (template only)

## Wyniki
- Attempt: ${result.attempt}
- Products tested: ${result.totalTested}/10
- Correct: ${result.totalCorrect}/${result.totalTested}
- Budget exceeded: ${result.budgetExceeded ? "YES" : "NO"}
- Cache hit rate: ${result.cacheHitRate.toFixed(1)}%
- Flag: ${result.flag ?? "none"}

### Szczegoly

| Code | Description | Output | Status | Tokens | Cached | Cost |
|------|-------------|--------|--------|--------|--------|------|
${allItems}

### Bledy
${errors || "Brak bledow"}

## Feedback od modelu optymalizujacego
${feedback ?? "(pending)"}
`;

  writeFileSync(filePath, content);
  return filePath;
}
