# Architecture

## Charakter projektu

Workspace do rozwiązywania zadań praktycznych z kursu **AI_Devs 4 Builder**.
Każde zadanie polega na napisaniu skryptu TypeScript, który przetwarza dane przy pomocy LLM i wysyła odpowiedź do Centrali (`https://hub.ag3nts.org`). Poprawna odpowiedź zwraca flagę w formacie `{FLG:NAZWA}`, którą wpisuje się na stronie hubu.

## Struktura projektu

```
ai-devs-4/
├── .ai/                          # Dokumentacja architektury (ten folder)
├── .cursor/rules/                # Reguły Cursor IDE
├── lessons/
│   ├── ts/                       # Rozwiązania w TypeScript (główne)
│   │   ├── S01E01-*.ts           # Pliki zadań (Season/Episode)
│   │   ├── toolset/              # Biblioteki pomocnicze (reużywalne)
│   │   │   ├── ai-devs.ts        # Komunikacja z API hubu
│   │   │   ├── prompts/          # Szablony promptów
│   │   │   └── scripts/          # Skrypty pomocnicze
│   │   └── resources/            # Dane lokalne do lekcji
│   ├── py/                       # Rozwiązania w Pythonie (jeśli potrzebne)
│   └── txt/                      # Symlink → E:\devel\AI-Devs\AI-Devs-4-Builders\lekcje
│                                 # Materiały lekcji (ignorowane przez git)
├── .env                          # Klucze API (ignorowany przez git)
├── .env.example                  # Szablon zmiennych środowiskowych
├── package.json                  # Zależności (runtime: Bun)
└── tsconfig.json                 # Konfiguracja TypeScript
```

## Struktura zadań — konwencja katalogów

Każde zadanie ma własny podkatalog w `lessons/ts/S{sezon}/E{epizod}/`:

```
lessons/ts/
├── S01/
│   ├── E01/
│   │   ├── main.ts              # orkiestrator — import i wywołanie kroków
│   │   ├── types.ts             # wszystkie typy zadania
│   │   ├── loadPeople.ts        # I/O i parsowanie danych wejściowych
│   │   ├── filterCandidates.ts  # filtracja deterministyczna
│   │   ├── classifyJobs.ts      # integracja z LLM (Structured Output)
│   │   ├── buildAnswer.ts       # transformacja danych → payload odpowiedzi
│   │   └── verifyAnswer.ts      # wysyłka + logowanie wyniku
│   └── E02/
│       └── ...
└── toolset/                     # biblioteki reużywalne (wspólne dla wszystkich zadań)
```

**Zasady podziału:**
- `main.ts` — wyłącznie orkiestracja: import kroków, wywołanie w kolejności, zero logiki biznesowej
- każdy moduł eksportuje **jedną funkcję** i robi **jedną rzecz**
- moduły filtrowania i transformacji danych to **czyste funkcje** (bez efektów ubocznych) — łatwe do przetestowania
- integracja z LLM izolowana w osobnym module (`classifyJobs.ts` itp.)
- typy współdzielone przez moduły zadania żyją w `types.ts`

**Przepływ danych (przykład S01E01):**
```
CSV → loadPeople() → PersonRecord[]
    → filterCandidates() → PersonRecord[]
    → classifyJobs() → Map<id, string[]>
    → buildAnswer() → PersonAnswer[]
    → verifyAnswer() → AiDevsResponse
```

## Toolset — biblioteki pomocnicze

### `lessons/ts/toolset/ai-devs.ts`

Komunikacja z API Centrali kursu.

**Eksportuje:**

```typescript
sendAnswer(task: string, answer: unknown): Promise<AiDevsResponse>
```

- Odczytuje `API_KEY_AI_DEVS4` z `.env`
- Wysyła `POST https://hub.ag3nts.org/verify` z body `{ apikey, task, answer }`
- Loguje payload i odpowiedź (chalk)
- Wypisuje flagę (zielony) lub błąd (czerwony) na konsolę
- Zwraca obiekt `AiDevsResponse { code, message, error?, flag? }`

**Użycie:**
```typescript
import { config } from "dotenv";
config();
import { sendAnswer } from "../toolset/ai-devs.ts";

await sendAnswer("people", [{ name: "Jan", surname: "Kowalski", ... }]);
```

**Format odpowiedzi API:**
- `code < 0` — błąd, treść w `message`
- `code === 0` — sukces, flaga w `message` lub `flag` jako `{FLG:NAZWA}`

## Zmienne środowiskowe

| Zmienna | Opis |
|---|---|
| `API_KEY_AI_DEVS4` | Klucz API do hubu kursu (https://hub.ag3nts.org) |
| `OPENAI_API_KEY` | Klucz API OpenAI |

Dodawane w miarę potrzeb kolejnych lekcji (Qdrant, Neo4j, itp.)

## Technologia

- **Runtime:** Bun
- **Język:** TypeScript (strict mode, ESNext, moduleResolution: bundler)
- **Kluczowe zależności:** `openai`, `axios`, `chalk`, `dotenv`

## Dozwolone modele OpenAI

Używaj wyłącznie modeli z poniższej listy. Dobierz model odpowiednio do złożoności zadania:

| Model | Kiedy używać |
|---|---|
| `gpt-5.2` | Najtrudniejsze zadania wymagające zaawansowanego rozumowania, wielokrokowego planowania lub złożonej analizy |
| `gpt-5.1` | Zadania złożone: wieloetapowe przetwarzanie, zaawansowana klasyfikacja, generowanie kodu |
| `gpt-5` | Zadania standardowe wymagające dobrej jakości rozumowania i generowania |
| `gpt-5-mini` | Zadania rutynowe: klasyfikacja, tagging, ekstrakcja danych, proste transformacje — domyślny wybór |
| `gpt-5-nano` | Zadania bardzo proste i masowe: krótkie klasyfikacje binarne, formatowanie, gdzie liczy się szybkość i koszt |

## Dokumentowanie użycia modeli w zadaniach

**Każde zadanie musi zawierać na początku pliku komentarz** informujący o użytych modelach i ich roli:

```typescript
// Modele użyte w zadaniu:
//   - gpt-5-mini  → batch tagging opisów zawodów (Structured Output)
```

Konwencja ta ułatwia audyt kosztów i dobór modeli w przyszłych zadaniach.
