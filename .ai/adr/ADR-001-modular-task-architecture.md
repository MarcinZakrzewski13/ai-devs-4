# ADR-001: Modularna architektura zadań

**Status:** Accepted
**Data:** 2026-03-14

## Context

Pierwsze rozwiązanie S01E01 powstało jako jeden plik `S01E01-people.ts` (monolit).
Podejście to działa dla prostych zadań, ale utrudnia testowanie, ponowne użycie i czytelność
przy złożoności typowej dla kolejnych epizodów.

## Decision

Każde zadanie ma własny katalog `lessons/ts/S{XX}/E{YY}/` z podziałem na moduły:

| Moduł | Odpowiedzialność |
|---|---|
| `main.ts` | Orkiestracja — import kroków, wywołanie w kolejności, zero logiki |
| `types.ts` | Wszystkie typy zadania współdzielone przez moduły |
| `load*.ts` | I/O i parsowanie danych wejściowych |
| `filter*.ts` | Filtracja deterministyczna (czyste funkcje) |
| `classify*.ts` / `process*.ts` | Integracja z LLM (Structured Output) |
| `build*.ts` | Transformacja danych → payload odpowiedzi (czyste funkcje) |
| `verifyAnswer.ts` | Wysyłka do Centrali + persystencja odpowiedzi |

Reużywalne biblioteki trafiają do `lessons/ts/toolset/`.

## Consequences

**Pozytywne:**
- Moduły czysto funkcyjne są łatwe do przetestowania w izolacji
- LLM izolowany → łatwa podmiana modelu lub mockowanie w testach
- `main.ts` czytelny jak pseudokod — widać przepływ bez zagłębiania w szczegóły
- Wspólny toolset redukuje duplikację między epizodami

**Negatywne:**
- Więcej plików dla prostych zadań (kompromis świadomie zaakceptowany)
- Wymaga dyscypliny przy podziale odpowiedzialności
