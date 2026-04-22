import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import { trackCost } from "./costGuard.ts";
import { parseAreaValue } from "./formatArea.ts";
import type { FinalAnswer, FactCandidate } from "./types.ts";

const MODEL = "gpt-5-mini";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cityName: { type: "string", description: "Prawdziwa nazwa miasta (NIE 'Syjon')" },
    cityArea: {
      type: "string",
      description: "Powierzchnia jako string '12.34' — 2 miejsca po przecinku",
    },
    warehousesCount: { type: "integer" },
    phoneNumber: {
      type: "string",
      description: "Tylko cyfry, bez spacji/myślników",
    },
    reasoning: { type: "string" },
  },
  required: ["cityName", "cityArea", "warehousesCount", "phoneNumber", "reasoning"],
} as const;

type SynthesisRaw = {
  cityName: string;
  cityArea: string;
  warehousesCount: number;
  phoneNumber: string;
  reasoning: string;
};

export const synthesize = async (
  candidates: Record<string, FactCandidate[]>
): Promise<FinalAnswer> => {
  const summary = JSON.stringify(candidates, null, 2);
  console.log(chalk.gray("\n  [synthesize] candidates:\n") + chalk.gray(summary));

  const provider = createDefaultProvider();

  const systemPrompt = `Jesteś analitykiem radiowym syntetyzującym zebrane fakty o tajnym mieście "Syjon".

Na podstawie podanego obiektu z kandydatami (pogrupowanymi według rodzaju faktu, posortowanymi wg confidence) ustal ostateczne wartości dla raportu końcowego.

KRYTYCZNE:
- cityName: NIGDY nie wpisuj "Syjon" — to alias/kryptonim. Podaj prawdziwą nazwę miasta.
- cityArea: format "12.34" (dokładnie 2 miejsca po przecinku, matematyczne zaokrąglenie).
  Kandydaci cityArea mogą być w formacie "NazwaMiasta:powierzchnia" — znajdź ten, którego NazwaMiasta odpowiada wybranej nazwie miasta (cityName). Wyciągnij tylko liczbę i zaokrąglij do 2 miejsc po przecinku.
- warehousesCount: liczba całkowita.
- phoneNumber: tylko cyfry, bez myślników/spacji/plusów.

Wybierz kandydatów z najwyższą wartością totalConfidence/votes. Jeśli brak danych dla jakiegoś pola — wpisz "UNKNOWN".`;

  const result = await provider.generateStructured<SynthesisRaw>({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Zebrane fakty:\n${summary}`,
      },
    ],
    schema: SCHEMA,
    schemaName: "synthesis",
    model: MODEL,
  });

  await trackCost(MODEL, result.usage, "synthesize");

  const raw = result.data;
  console.log(
    chalk.cyan.bold("\n  SYNTEZA:"),
    chalk.white(JSON.stringify(raw, null, 2))
  );

  const cityArea = parseAreaValue(raw.cityArea) ?? raw.cityArea;

  const phoneNumber = raw.phoneNumber.replace(/\D/g, "");

  return {
    cityName: raw.cityName,
    cityArea,
    warehousesCount: raw.warehousesCount,
    phoneNumber,
  };
};
