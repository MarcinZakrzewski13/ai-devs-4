/**
 * Analiza obrazu trasy-wylaczone.png przez model Vision.
 * Odczytuje kod trasy dla połączenia Gdańsk–Żarnowiec.
 * Wymusza Structured Output — zawsze zwraca poprawny format.
 *
 * Modele: gpt-5-mini (Vision) — odczyt kodu trasy z mapy.
 */

import chalk from "chalk";
import path from "path";
import { createDefaultProvider, type TextContentPart, type ImageContentPart } from "@ai-devs/ai-core";

const MODEL = "gpt-5-mini";
const RESOURCES_DIR = path.resolve(import.meta.dir, "../../resources");
const IMAGE_PATH = path.join(RESOURCES_DIR, "trasy-wylaczone.png");

/** Schemat Structured Output — wymusza pole routeCode. */
const ROUTE_CODE_SCHEMA = {
  type: "object" as const,
  properties: {
    routeCode: {
      type: "string" as const,
      description: "Kod trasy dla Gdańsk–Żarnowiec (np. X-01, X-02)",
    },
  },
  required: ["routeCode"] as const,
  additionalProperties: false,
};

type RouteCodeResult = { routeCode: string };

/**
 * Odczytuje kod trasy Gdańsk–Żarnowiec z pliku graficznego tras wyłączonych.
 * Używa Structured Output — model zawsze zwraca JSON z polem routeCode.
 * @returns Kod trasy (np. X-01)
 */
export async function extractRouteCode(): Promise<string> {
  const imageBuffer = await Bun.file(IMAGE_PATH).arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");

  const provider = createDefaultProvider();

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
