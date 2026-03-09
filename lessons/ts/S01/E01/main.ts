// Modele użyte w zadaniu:
//   - gpt-5-mini  → batch tagging opisów zawodów (Structured Output)

import chalk from "chalk";
import { loadPeople } from "./loadPeople.ts";
import { filterCandidates } from "./filterCandidates.ts";
import { classifyJobs } from "./classifyJobs.ts";
import { buildAnswer } from "./buildAnswer.ts";
import { verifyAnswer } from "./verifyAnswer.ts";

// 1. Load
const allPersons = loadPeople();
console.log(chalk.blue(`Loaded ${allPersons.length} records from CSV.`));

// 2. Filter
const candidates = filterCandidates(allPersons);
console.log(chalk.blue(`\nFiltered to ${candidates.length} candidates (M, Grudziądz, age 20–40):`));
candidates.forEach((p, i) =>
  console.log(chalk.gray(`  ${i}. ${p.name} ${p.surname} (${p.birthDate})`))
);

// 3. Classify
console.log(chalk.cyan("\n→ Classifying jobs via OpenAI Structured Output..."));
const tagsByIndex = await classifyJobs(candidates);

console.log(chalk.gray("\nTagging results:"));
candidates.forEach((p, i) => {
  const tags = tagsByIndex.get(i) ?? [];
  console.log(chalk.gray(`  ${i}. ${p.name} ${p.surname} → [${tags.join(", ")}]`));
});

// 4. Build answer (filters to transport only)
const answer = buildAnswer(candidates, tagsByIndex);
console.log(chalk.yellow(`\nPersons with "transport" tag: ${answer.length}`));
console.log(chalk.yellow("\nFinal answer payload:"));
console.log(JSON.stringify(answer, null, 2));

// 5. Send
await verifyAnswer(answer);
