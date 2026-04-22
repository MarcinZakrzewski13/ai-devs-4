import type { Fact, FactKind } from "./types.ts";

export const FACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isNoise: { type: "boolean" },
    facts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: {
            type: "string",
            enum: ["cityName", "cityArea", "warehousesCount", "phoneNumber", "other"],
          },
          value: { type: "string" },
          confidence: { type: "number" },
          source: { type: "string" },
        },
        required: ["kind", "value", "confidence", "source"],
      },
    },
  },
  required: ["isNoise", "facts"],
} as const;

export const TEXT_ANALYSIS_SYSTEM_PROMPT = `Analizujesz przechwycone fragmenty radiowe.
Zadanie: znaleźć informacje o tajnym mieście zwanym "Syjon" i wyciągnąć fakty.

UWAGA: "Syjon" to ALIAS (kryptonim) — miasto ma prawdziwą nazwę. Jeśli znajdziesz wskazówkę o prawdziwej nazwie tego miasta — zapisz jako fact kind="cityName".

Szukaj faktów:
- cityName: prawdziwa nazwa miasta (NIE "Syjon" — to alias)
- cityArea: powierzchnia miasta w km² (liczba, może być z jednostką)
- warehousesCount: liczba magazynów w mieście
- phoneNumber: numer telefonu osoby kontaktowej (cyfry, może być z myślnikami/spacjami)
- other: inne potencjalnie istotne informacje

Jeśli fragment to szum radiowy (przypadkowe dźwięki, bełkot, ciąg losowych znaków, krótkie niezrozumiałe słowa) — ustaw isNoise=true i zwróć pustą tablicę facts.

Przy confidence:
- 0.9 = bezpośrednie, jasne stwierdzenie
- 0.7 = pośrednie wskazanie
- 0.5 = domysł na podstawie kontekstu
- 0.3 = bardzo niepewne

W source: krótki cytat (max 80 znaków) z fragmentu uzasadniający fakt.`;
