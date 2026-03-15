// Modele użyte w zadaniu:
//   - gpt-5-mini  → batch tagging opisów zawodów (Structured Output)

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import chalk from "chalk";
import { sendAnswer } from "./toolset/ai-devs.ts";

// --- Types ---

type PersonRecord = {
  name: string;
  surname: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  birthCountry: string;
  job: string;
};

type TaggingResult = {
  results: { index: number; tags: string[] }[];
};

type PersonAnswer = {
  name: string;
  surname: string;
  gender: string;
  born: number;
  city: string;
  tags: string[];
};

// --- 1. Load and parse CSV ---

const CSV_PATH = path.join(import.meta.dir, "resources", "people.csv");
const csvText = fs.readFileSync(CSV_PATH, "utf-8");
const lines = csvText.trim().split("\n");
const headers = lines[0].split(",") as (keyof PersonRecord)[];

const allPersons: PersonRecord[] = lines.slice(1).map((line) => {
  // Handle quoted fields with commas inside
  const fields: string[] = [];
  let inQuotes = false;
  let current = "";
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);

  return Object.fromEntries(
    headers.map((h, i) => [h, fields[i] ?? ""])
  ) as PersonRecord;
});

console.log(chalk.blue(`Loaded ${allPersons.length} records from CSV.`));

// --- 2. Filter records ---
// Criteria: gender=M, birthPlace=Grudziądz, born between 1986 and 2006

const filtered = allPersons.filter((p) => {
  if (p.gender !== "M") return false;
  if (p.birthPlace !== "Grudziądz") return false;
  const year = parseInt(p.birthDate.slice(0, 4), 10);
  return year >= 1986 && year <= 2006;
});

console.log(
  chalk.blue(`\nFiltered to ${filtered.length} records (M, Grudziądz, 1986–2006):`)
);
filtered.forEach((p, i) =>
  console.log(chalk.gray(`  ${i + 1}. ${p.name} ${p.surname} (${p.birthDate}) — ${p.job.slice(0, 60)}...`))
);

// --- 3. Batch-tagging via OpenAI Structured Output ---
//
// Structured Output to mechanizm, który gwarantuje, że model zwróci
// odpowiedź dokładnie zgodną z podanym JSON Schema — bez wyjątków.
//
// Dlaczego to ważne?
//   - Tradycyjne parsowanie `response.choices[0].message.content` jest
//     kruche: model może dodać komentarz, zmienić nazwy kluczy lub pominąć
//     pole — i JSON.parse() się wysypie albo dane będą nieprawidłowe.
//   - Structured Output eliminuje te błędy: API odrzuci odpowiedź niezgodną
//     ze schematem PRZED zwróceniem jej do klienta.
//
// Kluczowe elementy wywołania:
//   • `response_format.type = "json_schema"` — włącza tryb Structured Output
//   • `response_format.json_schema.schema` — definicja dozwolonej struktury
//   • `strict: true` — model MUSI trzymać się schematu ściśle (żadne
//     dodatkowe klucze nie są dozwolone, wszystkie `required` muszą być obecne)
//
// Odczyt wyniku:
//   Zamiast ręcznie parsować `message.content` przez JSON.parse(), używamy
//   `message.parsed` — SDK automatycznie deserializuje i waliduje dane.

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const jobDescriptions = filtered
  .map((p, i) => `${i + 1}. ${p.job}`)
  .join("\n");

console.log(chalk.cyan("\n→ Sending batch tagging request to OpenAI..."));

const completion = await client.beta.chat.completions.parse({
  model: "gpt-5-mini",
  messages: [
    {
      role: "system",
      content: `Jesteś klasyfikatorem zawodów. Przypisz tagi do opisów stanowisk pracy.
Dostępne tagi (każdy opis może mieć wiele tagów):
- IT: programowanie, systemy, sieci, bazy danych
- transport: kierowcy, logistyka, spedycja, przewóz, pojazdy
- edukacja: nauczyciele, szkolenia, akademia
- medycyna: lekarze, pielęgniarki, farmacja, zdrowie
- praca z ludźmi: obsługa klienta, HR, zarządzanie zespołem
- praca z pojazdami: mechanicy, operatorzy maszyn, kierowcy
- praca fizyczna: budowlanka, magazyn, produkcja, roboty manualne`,
    },
    {
      role: "user",
      content: jobDescriptions,
    },
  ],
  // response_format z json_schema aktywuje Structured Output.
  // Każde pole z required[] musi pojawić się w odpowiedzi;
  // additionalProperties: false blokuje nieznane klucze.
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "job_tags",
      // strict: true — model nie może odejść od schematu ani o krok
      strict: true,
      schema: {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                index: { type: "integer" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["index", "tags"],
              additionalProperties: false,
            },
          },
        },
        required: ["results"],
        additionalProperties: false,
      },
    },
  },
});

// Używamy .parsed zamiast JSON.parse(message.content) — SDK robi to za nas
// i TypeScript zna już typ zwróconego obiektu.
const tagging = completion.choices[0].message.parsed as unknown as TaggingResult;

console.log(chalk.gray("\nTagging results:"));
tagging.results.forEach((r) => {
  const person = filtered[r.index - 1];
  console.log(
    chalk.gray(`  ${r.index}. ${person.name} ${person.surname} → [${r.tags.join(", ")}]`)
  );
});

// --- 4. Keep only persons tagged with "transport" ---

const transportPersons = tagging.results
  .filter((r) => r.tags.includes("transport"))
  .map((r) => {
    const p = filtered[r.index - 1];
    return { person: p, tags: r.tags };
  });

console.log(
  chalk.yellow(`\nPersons with "transport" tag: ${transportPersons.length}`)
);

// --- 5. Build answer payload ---

const answer: PersonAnswer[] = transportPersons.map(({ person, tags }) => ({
  name: person.name,
  surname: person.surname,
  gender: person.gender,
  born: parseInt(person.birthDate.slice(0, 4), 10),
  city: person.birthPlace,
  tags,
}));

console.log(chalk.yellow("\nFinal answer payload:"));
console.log(JSON.stringify(answer, null, 2));

// --- 6. Send answer ---

await sendAnswer("people", answer);
// [flaga zapisana w answers/]