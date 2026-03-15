import { createDefaultProvider } from "@ai-devs/ai-core";
import type { PersonRecord, JobTag } from "./types.ts";

// Structured Output — schema dla klasyfikacji zawodów.
//
// Kluczowe decyzje projektowe:
//
// 1. `enum` na items tagów — najważniejsza zmiana względem naiwnego schematu.
//    Bez enum model może zwrócić dowolny string ("logistyka", "spedycja" itp.),
//    który nie pasuje do filtra .includes("transport") — błąd cichy i trudny do debugowania.
//    Z enum API odrzuci każdą odpowiedź zawierającą nieznany tag.
//
// 2. `id` zamiast `index` — semantycznie to identyfikator rekordu, nie pozycja
//    w liście. Wynik mapowany przez Map<id, tags> zamiast indeksowania tablicy
//    z ryzykiem off-by-one.
//
// 3. `description` na polach — model używa ich jako wskazówek semantycznych
//    przy wypełnianiu struktury. Poprawia jakość klasyfikacji bez kosztu tokenów.
//
// 4. `strict: true` — API odrzuca odpowiedź niezgodną ze schematem przed
//    zwróceniem jej do klienta. Eliminuje potrzebę ręcznej walidacji.
//
// Czy dodawać reasoning albo confidence?
// W tym zadaniu: nie.
//   - zwiększa koszt tokenów
//   - komplikuje payload
//   - nie jest potrzebny do finalnej odpowiedzi
//   - zbiór tagów jest mały i zamknięty — enum eliminuje halucynacje
//
// Dodaj reasoning tylko gdy:
//   - chcesz debugować błędne klasyfikacje
//   - masz dużo niejednoznacznych opisów stanowisk
//   - planujesz ręczny review wyników
//
// Wersja debugowa (nie używana w produkcji):
// items schematu rozszerzone o:
//   reasoning: { type: "string", description: "Short justification of why the tags were assigned." }
// (reasoning NIE trafia do required[], żeby nie blokować parsowania w trybie prod)

const JOB_TAGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      description: "Classification results for input job descriptions.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "integer",
            description: "Identifier of the input record (0-based index).",
          },
          tags: {
            type: "array",
            description: "List of matching tags for the given job description.",
            items: {
              type: "string",
              enum: [
                "IT",
                "transport",
                "edukacja",
                "medycyna",
                "praca z ludźmi",
                "praca z pojazdami",
                "praca fizyczna",
              ] satisfies JobTag[],
            },
          },
        },
        required: ["id", "tags"],
      },
    },
  },
  required: ["results"],
} as const;

const SYSTEM_PROMPT = `Jesteś klasyfikatorem zawodów. Przypisz tagi do opisów stanowisk pracy.
Dostępne tagi (każdy opis może mieć wiele tagów):
- IT: programowanie, systemy, sieci, bazy danych
- transport: kierowcy, logistyka, spedycja, przewóz, pojazdy
- edukacja: nauczyciele, szkolenia, akademia
- medycyna: lekarze, pielęgniarki, farmacja, zdrowie
- praca z ludźmi: obsługa klienta, HR, zarządzanie zespołem
- praca z pojazdami: mechanicy, operatorzy maszyn, kierowcy
- praca fizyczna: budowlanka, magazyn, produkcja, roboty manualne`;

/**
 * Classifies job descriptions for all candidates in a single API call.
 * Returns a Map from record index (0-based) to assigned tags.
 */
export async function classifyJobs(
  persons: PersonRecord[]
): Promise<Map<number, JobTag[]>> {
  const provider = createDefaultProvider();

  // Build numbered list (id = 0-based index, displayed as 0. 1. 2. ...)
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
