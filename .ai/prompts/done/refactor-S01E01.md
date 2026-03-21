# Refactor S01E01 — Raw OpenAI → ModelProvider (generateStructured)

**Prereq:** refactor-00-global (needs correct DEFAULT_MODEL)
**Violation:** #6 (raw `new OpenAI()` instead of ModelProvider)

---

## Cel

Zamienić bezpośrednie użycie `new OpenAI()` w `classifyJobs.ts` na `createOpenAIProvider()` + `generateStructured()` z `@ai-devs/ai-core`.

---

## Zmiana: classifyJobs.ts

**Plik:** `lessons/ts/S01/E01/classifyJobs.ts`

### Import — obecny:
```typescript
import OpenAI from "openai";
import type { PersonRecord, JobTag } from "./types.ts";
```

### Import — nowy:
```typescript
import { createOpenAIProvider } from "@ai-devs/ai-core";
import type { PersonRecord, JobTag } from "./types.ts";
```

### Ciało funkcji — obecne (fragment):
```typescript
export async function classifyJobs(
  persons: PersonRecord[]
): Promise<Map<number, JobTag[]>> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const userContent = persons
    .map((p, i) => `${i}. ${p.job}`)
    .join("\n");

  const completion = await client.beta.chat.completions.parse({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "job_tags",
        strict: true,
        schema: JOB_TAGS_SCHEMA,
      },
    },
  });

  const parsed = completion.choices[0].message.parsed as {
    results: { id: number; tags: JobTag[] }[];
  };

  return new Map(parsed.results.map((r) => [r.id, r.tags]));
}
```

### Ciało funkcji — nowe:
```typescript
export async function classifyJobs(
  persons: PersonRecord[]
): Promise<Map<number, JobTag[]>> {
  const provider = createOpenAIProvider();

  const userContent = persons
    .map((p, i) => `${i}. ${p.job}`)
    .join("\n");

  const result = await provider.generateStructured<{
    results: { id: number; tags: JobTag[] }[];
  }>({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    schema: JOB_TAGS_SCHEMA,
    schemaName: "job_tags",
    model: "gpt-5-mini",
  });

  return new Map(result.data.results.map((r) => [r.id, r.tags]));
}
```

**Kluczowe zmiany:**
- `new OpenAI()` → `createOpenAIProvider()` — centralna abstrakcja, API key z env automatycznie
- `client.beta.chat.completions.parse()` → `provider.generateStructured()` — spójna API
- Typ wyniku: `result.data.results` zamiast `completion.choices[0].message.parsed`
- Schema i stałe (JOB_TAGS_SCHEMA, SYSTEM_PROMPT) — **bez zmian**

---

## Weryfikacja

```bash
# Zero direct openai imports
grep -n 'from "openai"' lessons/ts/S01/E01/classifyJobs.ts   # → zero results

# Uses @ai-devs/ai-core
grep -n "@ai-devs/ai-core" lessons/ts/S01/E01/classifyJobs.ts  # → found

# Uruchomienie
bun run lessons/ts/S01/E01/main.ts
```
