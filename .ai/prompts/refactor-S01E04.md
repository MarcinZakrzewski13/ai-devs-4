# Refactor S01E04 — Raw OpenAI + Vision → ModelProvider (generateStructured multimodal)

**Prereq:** refactor-00-global (needs multimodal Message type)
**Violation:** #7 (raw `new OpenAI()` + Vision without ModelProvider)

---

## Cel

Zamienić bezpośrednie użycie `new OpenAI()` w `extractRouteCode.ts` na `createOpenAIProvider()` + `generateStructured()` z `@ai-devs/ai-core`, z multimodal content (Vision).

---

## Zmiana: extractRouteCode.ts

**Plik:** `lessons/ts/S01/E04/extractRouteCode.ts`

### Import — obecny:
```typescript
import chalk from "chalk";
import OpenAI from "openai";
import path from "path";
```

### Import — nowy:
```typescript
import chalk from "chalk";
import path from "path";
import { createOpenAIProvider } from "@ai-devs/ai-core";
import type { ImageContentPart, TextContentPart } from "@ai-devs/ai-core";
```

### Ciało funkcji — obecne (kluczowy fragment):
```typescript
export async function extractRouteCode(): Promise<string> {
  const imageBuffer = await Bun.file(IMAGE_PATH).arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in .env");
  }

  console.log(chalk.cyan(`[extractRouteCode] Analizując obraz tras wyłączonych (${MODEL})...`));

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Na tym obrazie znajduje się lista tras wyłączonych...`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64}`,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "route_code",
        strict: true,
        schema: ROUTE_CODE_SCHEMA,
      },
    },
    max_completion_tokens: 500,
  });

  const raw = res.choices[0].message.content?.trim() ?? "{}";
  const parsed = JSON.parse(raw) as RouteCodeResult;
  const routeCode = parsed.routeCode ?? "";

  console.log(chalk.gray(`  [extractRouteCode] Odczytany kod trasy: ${routeCode}`));
  return routeCode;
}
```

### Ciało funkcji — nowe:
```typescript
export async function extractRouteCode(): Promise<string> {
  const imageBuffer = await Bun.file(IMAGE_PATH).arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");

  const provider = createOpenAIProvider();

  console.log(chalk.cyan(`[extractRouteCode] Analizując obraz tras wyłączonych (${MODEL})...`));

  const result = await provider.generateStructured<RouteCodeResult>({
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Na tym obrazie znajduje się lista tras wyłączonych z użytku w Systemie Przesyłek Konduktorskich (SPK).
Znajdź kod trasy dla połączenia Gdańsk – Żarnowiec (lub Żarnowiec – Gdańsk).
Zwróć go w polu routeCode.`,
          } satisfies TextContentPart,
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64}`,
            },
          } satisfies ImageContentPart,
        ],
      },
    ],
    schema: ROUTE_CODE_SCHEMA,
    schemaName: "route_code",
    model: MODEL,
  });

  const routeCode = result.data.routeCode ?? "";
  console.log(chalk.gray(`  [extractRouteCode] Odczytany kod trasy: ${routeCode}`));
  return routeCode;
}
```

**Kluczowe zmiany:**
- `new OpenAI()` → `createOpenAIProvider()` — API key z env automatycznie
- `client.chat.completions.create()` → `provider.generateStructured()` — spójna API
- Multimodal content (`TextContentPart`, `ImageContentPart`) — teraz typesafe dzięki rozszerzonemu `Message` z refactor-00-global
- Usunięto ręczny `JSON.parse()` — `generateStructured()` zwraca `result.data` już sparsowane
- Usunięto check `OPENAI_API_KEY` — `createOpenAIProvider()` obsługuje to wewnętrznie
- `satisfies` na content parts — zapewnia zgodność typów bez rzutowania

**Uwaga o max_completion_tokens:** `generateStructured()` aktualnie nie wspiera `max_completion_tokens`. Jeśli ten parametr jest potrzebny, rozważ dodanie go do `GenerateStructuredInput` w ai-core. Dla tego zadania (krótka odpowiedź) nie jest krytyczny.

---

## Weryfikacja

```bash
# Zero direct openai imports
grep -n 'from "openai"' lessons/ts/S01/E04/extractRouteCode.ts   # → zero results

# Uses @ai-devs/ai-core
grep -n "@ai-devs/ai-core" lessons/ts/S01/E04/extractRouteCode.ts  # → found

# Uruchomienie
bun run lessons/ts/S01/E04/main.ts
```
