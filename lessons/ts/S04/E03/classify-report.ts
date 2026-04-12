import { createDefaultProvider } from "@ai-devs/ai-core";

export type ReportAnalysis = {
  humanFound: boolean;
  interpretation: string;
};

export const classifyReport = async (
  field: string,
  msg: string
): Promise<ReportAnalysis> => {
  const provider = createDefaultProvider();

  const result = await provider.generateText({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `Analizujesz meldunki zwiadowcze z operacji poszukiwawczej.
Odpowiedz TYLKO poprawnym JSON bez żadnego dodatkowego tekstu:
{"humanFound": boolean, "interpretation": "string"}

Zasady:
- humanFound: true WYŁĄCZNIE gdy meldunek jednoznacznie potwierdza obecność żywego człowieka/partyzanta
- humanFound: false gdy meldunek mówi o pustym polu, braku ludzi, śmieciach, meblach itp.
- interpretation: max 10 słów, po polsku, styl radiowego meldunku wojskowego`,
      },
      {
        role: "user",
        content: `Pole: ${field}\nMeldunek zwiadowcy: "${msg}"`,
      },
    ],
  });

  try {
    const match = result.text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error("no JSON");
    return JSON.parse(match[0]) as ReportAnalysis;
  } catch {
    return { humanFound: false, interpretation: "Analiza niedostępna." };
  }
};
