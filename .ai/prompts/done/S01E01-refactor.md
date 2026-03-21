Przeanalizuj moje rozwiązanie zadania AI_DEVS 4 S01E01 pod kątem architektury, separacji odpowiedzialności i jakości integracji z LLM.

Kontekst zadania:
- pobieram plik CSV z danymi osób
- filtruję rekordy po warunkach deterministycznych:
  - mężczyzna
  - wiek 20–40 lat w roku 2026
  - miasto: Grudziądz
- następnie klasyfikuję pole `job` do zestawu tagów przy pomocy LLM
- interesują mnie tylko osoby z tagiem `transport`
- obecnie mam całe rozwiązanie w jednym pliku

Chcę, żebyś ocenił to rozwiązanie nie pod kątem "czy działa", tylko pod kątem jakości architektury i możliwości dalszego rozwoju.

Twoje zadanie:
1. Wskaż, co jest słabe architektonicznie w rozwiązaniu jednoplikowym.
2. Zaproponuj, jak rozdzielić odpowiedzialności na moduły / funkcje / warstwy.
3. Zaproponuj minimalną, ale sensowną architekturę dla tego zadania w TypeScript.
4. Oceń jakość obecnego Structured Output.
5. Zaproponuj lepszy JSON Schema dla klasyfikacji tagów.
6. Uzasadnij każdą zmianę technicznie, a nie ogólnikowo.
7. Nie pisz frameworkowego overengineeringu. Ma być prosto, ale poprawnie.

Propozycja nowego Structured Output wygląda tak:

const jobTagsSchema = {
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
            description: "Identifier of the input record.",
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
              ],
            },
          },
        },
        required: ["id", "tags"],
      },
    },
  },
  required: ["results"],
};


Dodaj także w komentarzu informację, że możliwe jest dodanie reasoning lub confidence. Może to być wiadomość w postaci
Czy dodawać reasoning albo confidence?
W tym zadaniu: raczej nie.

Powód:

zwiększasz koszt tokenów

komplikujesz payload

nie potrzebujesz tego do finalnej odpowiedzi

zadanie jest klasyfikacją do małego, zamkniętego zbioru tagów

Dodaj to tylko wtedy, gdy:

chcesz debugować błędne klasyfikacje

masz dużo niejednoznacznych zawodów

planujesz ręczny review

Wtedy sensowniejsza wersja debugowa wygląda tak:

const jobTagsSchemaDebug = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "integer",
          },
          tags: {
            type: "array",
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
              ],
            },
          },
          reasoning: {
            type: "string",
            description: "Short justification of why the tags were assigned.",
          },
        },
        required: ["id", "tags"],
      },
    },
  },
  required: ["results"],
};

Ale do finalnego rozwiązania produkcyjnego dla tego taska brałbym wersję bez reasoning.


Dostępne tagi są wyłącznie takie:
- IT
- transport
- edukacja
- medycyna
- praca z ludźmi
- praca z pojazdami
- praca fizyczna

Chcę, żebyś szczególnie zwrócił uwagę na:
- czy `tags` nie są zbyt słabo ograniczone
- czy `index` to dobra nazwa
- czy schema jest wystarczająco odporna na halucynacje
- czy wynik będzie wygodny do mapowania z rekordami wejściowymi
- czy warto dodać pole typu `reasoning` albo `confidence`, czy w tym zadaniu to zbędny koszt i komplikacja

Oczekiwany format odpowiedzi:

## 1. Ocena obecnego rozwiązania
- co działa
- co jest słabe
- największe ryzyko

## 2. Proponowana architektura
- podział na moduły
- odpowiedzialność każdego modułu
- przepływ danych krok po kroku

## 3. Proponowany Structured Output
- finalny JSON Schema
- krótkie uzasadnienie każdego istotnego pola

## 4. Rekomendacja praktyczna
- co poprawić najpierw
- czego nie komplikować

Minimalny sensowny podział:

main.ts
loadPeople.ts
filterCandidates.ts
classifyJobs.ts
buildAnswer.ts
verifyAnswer.ts
types.ts

Więc zadania powinny być umieszczane w podkatalogach w scieżce ./lessons/ts np katalog ./lessons/ts/S01/E01
Dodaj do .ai/architecture.md w jaki sposob mają być realizowane zadania na podstawie powyższego opisu.