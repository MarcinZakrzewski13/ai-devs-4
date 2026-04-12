// LLM ekstrakcja strukturalnych danych z notatek Natana.
//
// Model: gpt-5-mini z Structured Output (strict JSON schema).
//
// Dlaczego LLM (a nie regex/parser):
// - mianownik polskich rzeczowników: "45 chlebow" → towar "chleb",
//   "workow ryzu" → "ryz", "butelek wody" → "woda"
// - mianownik miast: "w Domatowie" → "domatowo", "do Pucka" → "puck"
// - normalizacja polskich znaków (ą→a, ż→z, ó→o itd.)
// - rozumienie kontekstu rozmów: kto faktycznie zarządza miastem,
//   a kto tylko dzwonił w sprawie dostaw (Kisiel vs Rafal dla Brudzewa)
// - deduplikacja potrzeb między ogloszenia.txt i rozmowy.txt
//
// Cache: extracted.json w tmp/. Drugi run omija LLM.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import type { ExtractedData } from "./types.ts";

const CACHE_DIR = path.resolve("lessons/ts/resources/S04E04/tmp");
const CACHE_FILE = path.join(CACHE_DIR, "extracted.json");

const SYSTEM_PROMPT = `Jesteś ekstraktorem danych z notatek handlowych po polsku.

Twoje zadanie: wyciągnij z notatek trzy zbiory danych i zwróć je w podanym schemacie JSON.

ŹRÓDŁA (każda sekcja oznaczona nagłówkiem "=== nazwa ==="):
- "ogloszenia" — z tego wyciągasz POTRZEBY miast (towary + ilości). Format: np. "45 chlebow, 120 butelek wody, 6 mlotkow".
- "rozmowy" — z tego wyciągasz OSOBY zarządzające handlem w danym mieście. Uważaj: czasem pada kilka imion, z których jedno to tylko osoba dzwoniąca z dostawą. Zarządcą jest osoba opisywana jako ta, która prowadzi handel / pilnuje braków / domyka zamówienia.
- "transakcje" — z tego wyciągasz TOWARY wystawione na sprzedaż. Format: "MiastoA -> towar -> MiastoB" oznacza, że MiastoA sprzedało towar do MiastoB. Czyli MiastoA jest SPRZEDAWCĄ.

REGUŁY NORMALIZACJI (KRYTYCZNE):
1. Wszystkie nazwy miast, towarów, osób: lowercase.
2. Bez polskich znaków: ą→a, ć→c, ę→e, ł→l, ń→n, ó→o, ś→s, ź→z, ż→z.
3. Nazwa towaru ZAWSZE w mianowniku liczby pojedynczej: "chlebow"→"chleb", "butelek wody"→"woda", "workow ryzu"→"ryz", "mlotkow"→"mlotek", "kilofow"→"kilof", "lopat"→"lopata", "wiertarek"→"wiertarka", "porcji wolowiny"→"wolowina", "porcji kurczaka"→"kurczak", "kg ziemniakow"→"ziemniaki", "kapusty"→"kapusta", "marchwi"→"marchew", "makaronu"→"makaron", "maki"→"maka".
4. Nazwa miasta w mianowniku: "w Domatowie"→"domatowo", "do Pucka"→"puck", "pod Mechowo"→"mechowo", "z Opalina"→"opalino", "z Brudzewa"→"brudzewo", "z Darzlubiem"→"darzlubie", "z Celbowa"→"celbowo", "z Karlinkowa"→"karlinkowo".
5. Ilości: tylko liczba, bez jednostek. "100 kg ziemniakow" → { towar: "ziemniaki", ilosc: 100 }.
6. W "towary" pole "sprzedawcy" to unikalna, posortowana lista miast-sprzedawców dla danego towaru.
7. W "miasta" każde miasto pojawia się raz; scalaj potrzeby, jeśli padają w kilku miejscach (dedupe po nazwie towaru, sumowanie NIE — bierz ilość z ogłoszeń, bo to one są źródłem liczb).
8. Pole "imie" i "nazwisko" rozdziel osobno.
9. SCALANIE WZMIANEK O OSOBIE: dla danego miasta w notatce mogą paść dwa różne zwroty — jeden z imieniem, drugi z nazwiskiem — odnoszące się do TEJ SAMEJ osoby. Rozpoznasz to po: (a) tym samym mieście, (b) pokrywających się tematach rozmów (te same towary, ten sam kontekst). Przykłady:
   - "Kisiel ma dzwonić... Rafal oddzwonił" — oba o Brudzewie i ryżu/wiertarkach/wodzie → jedna osoba: Rafal Kisiel.
   - "sygnał od Konkel... Lena pilnuje handlu" — oba o Karlinkowie → jedna osoba: Lena Konkel.
   Scalaj takie wzmianki w jeden rekord z wypełnionymi oboma polami imie i nazwisko. NIE twórz dwóch osobnych rekordów dla tego samego miasta.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    miasta: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nazwa: { type: "string", description: "lowercase, bez polskich znaków" },
          potrzeby: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                towar: { type: "string", description: "mianownik l.poj., lowercase" },
                ilosc: { type: "integer" },
              },
              required: ["towar", "ilosc"],
            },
          },
        },
        required: ["nazwa", "potrzeby"],
      },
    },
    osoby: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          imie: { type: "string" },
          nazwisko: { type: "string", description: "puste jeśli nieznane" },
          miasto: { type: "string" },
        },
        required: ["imie", "nazwisko", "miasto"],
      },
    },
    towary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          nazwa: { type: "string" },
          sprzedawcy: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["nazwa", "sprzedawcy"],
      },
    },
  },
  required: ["miasta", "osoby", "towary"],
} as const;

export async function extractData(notes: string, forceRefresh = false): Promise<ExtractedData> {
  if (!forceRefresh) {
    try {
      const cached = await readFile(CACHE_FILE, "utf8");
      console.log(chalk.gray("  [cache] extracted.json → hit, omijam LLM"));
      return JSON.parse(cached) as ExtractedData;
    } catch {
      // cache miss — fall through
    }
  }

  console.log(chalk.gray("  [llm] gpt-5-mini → ekstrakcja danych z notatek..."));
  const provider = createDefaultProvider();
  const result = await provider.generateStructured<ExtractedData>({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: notes },
    ],
    schema: SCHEMA,
    schemaName: "natan_notes_extract",
    model: "gpt-5-mini",
  });

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(result.data, null, 2), "utf8");
  console.log(chalk.gray(`  [cache] extracted.json → zapisano`));

  return result.data;
}
