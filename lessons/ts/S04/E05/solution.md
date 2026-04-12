# S04E05 — Foodwarehouse

## Czego dotyczy zadanie

Przygotowanie zamówień magazynowych dla 8 miast wymienionych w `food4cities.json`.
Każde zamówienie musi mieć poprawny `creatorID` (z SQLite), `destination` (kod docelowy z bazy),
podpis SHA1 wygenerowany przez API oraz dokładne ilości towarów.

## Czego uczy zadanie

- **Multi-tool orchestration** — agent koordynuje CRUD orders, zapytania SQLite i generator kryptograficzny w jednej pętli tool-call
- **Schema discovery** — baza jest czarna skrzynką; agent sam odkrywa tabele (`SHOW CREATE TABLE`) bo PRAGMA zablokowane
- **API error-driven learning** — agent dowiaduje się o wymaganiu pola `action` w signatureGenerator dopiero z błędu `-680`; to normalne w agentowych zadaniach z nieznanym API
- **Role-based authorization** — błąd `-652` (not a transport responsible person) ujawnia, że `creatorID` musi mieć właściwą rolę; agent czyta tabelę roles i wybiera właściwego usera
- **Workflow transakcyjny** — `reset` jako atomowy rollback; agent wywołał go po wykryciu błędu autoryzacji z pierwszą próbą (creatorID=1 zamiast creatorID=2)
- **Batch append** — `items: { name: qty }` w jednym wywołaniu zamiast pętli; wydajność i idempotencja

## Jak działa rozwiązanie

```
main.ts
  → loadCities()            fetch + cache food4cities.json → CityEntry[]
  → buildSystemPrompt()     instrukcje fazowe dla agenta
  → runAgentLoop()          pętla tool-call (max 40 iter)
      tools:
        help                → { tool: "help" }
        database            → { tool: "database", query }
        signatureGenerator  → { tool: "signatureGenerator", action: "generate", login, birthday, destination }
        orders              → { tool: "orders", action: "get|create|append", ... }
        reset               → { tool: "reset" }
        done                → { tool: "done" }  ← zwraca flagę
        finish              ← sygnał końca pętli (tool wewnętrzny)
  → saveFinalAnswer()
```

**Przebieg agenta (21 iteracji):**
1. `help` + `show tables` + `SHOW CREATE TABLE` × 3 → schemat DB
2. `SELECT * FROM destinations` + `SELECT * FROM users` (2 strony po 30 wierszy) → dane miast i userów
3. `signatureGenerator` × 8 z błędnym polem → retry bez pola `secret` → błąd `-680 missing action` → retry z `action: "generate"` ✓
4. `orders create` × 8 (creatorID=1) → `done` → błąd `-652` (rola) → `SELECT roles` → `SELECT users WHERE role=2 AND is_active=1`
5. `reset` → generuj sygnatury dla creatorID=2 × 8 → `orders create` × 8 → `orders append` (batch) × 8 → `done` → `{FLG:JUSTEATIT}`

## Dlaczego takie podejście

`claude-sonnet-4-6` zamiast `gpt-5-mini` — zadanie wymaga:
- Śledzenia kontekstu między wieloma systemami (SQLite ↔ API orders ↔ signatureGenerator)
- Odporności na błędy API i adaptacji strategii (zmiana creatorID po odkryciu struktury ról)
- Rozumienia niejawnych reguł (pole `action`, ograniczenia SQL, format destination jako string vs int)

Jeden zintegrowany `tools.ts` zamiast katalogu — tylko 7 narzędzi, prosta hierarchia.

## Odpowiedzi API — dane referencyjne

- Dozwolone SQL: `SELECT`, `SHOW TABLES`, `SHOW CREATE TABLE`, `.tables`, `.schema`
- PRAGMA zablokowane (błąd `-570`)
- signatureGenerator wymaga: `{ tool, action: "generate", login, birthday, destination }`
- Pole `secret` z users NIE jest wejściem do generatora (błąd `-980 Unexpected field`)
- Błąd `-652`: creatorID musi mieć rolę odpowiedzialną za transport (role_id=2 w roles)
- Batch append: `{ tool: "orders", action: "append", id, items: { name: qty } }`
- `done` przy poprawnych zamówieniach zwraca `code: 0, message: "{FLG:...}"`

## Wnioski z lekcji

### 1. Błędy API są częścią protokołu odkrycia, nie awariami

**Co się wydarzyło:** Agent trafił na `-570 PRAGMA not allowed`, `-980 Unexpected field "secret"`, `-680 Missing "action"`, `-652 Not a transport responsible person` — każdy błąd precyzyjnie wskazał co zmienić.

**Analogia:** Ślusarz próbujący kluczy do zamka — każdy zły klucz mówi coś o mechanizmie (za duży, zły kształt zębów, za krótki trzpień). To nie jest czas stracony, to eksploracja przestrzeni rozwiązań.

**Przykład zastosowania:** Przy integracji z nieznanym zewnętrznym API (np. legacy ERP) — zaplanuj fazę "error-harvesting": wyślij celowo niepoprawne żądania, by zebrać komunikaty błędów, zanim napiszesz właściwy kod.

### 2. Autoryzacja przez rolę, nie tożsamość — odkryj model ról przed akcją

**Co się wydarzyło:** Pierwsze 8 zamówień użyło creatorID=1 (pierwszy aktywny user). `done` zwrócił `-652`. Dopiero `SELECT roles` + `SELECT users WHERE role=2` ujawnił właściwą klasę userów.

**Analogia:** W firmie nie wystarczy być "pracownikiem" by podpisać fakturę — potrzebujesz być "kierownikiem magazynu". Struktura ról jest niewidoczna dopóki system nie odrzuci Twojej próby.

**Przykład zastosowania:** W każdym systemie z RBAC (AWS IAM, SharePoint, GitHub orgs) — zanim wyślesz żądanie z danymi usera, sprawdź jego role/permissions. Oszczędza to kosztowne operacje zakończone błędem autoryzacji.

### 3. Reset jako transakcja — tańszy restart niż naprawa w miejscu

**Co się wydarzyło:** Agent mógł spróbować "poprawić" 8 zamówień ze złym creatorID, ale wybrał `reset` + pełny restart. Wynik: czysty stan, minimalne ryzyko niespójności.

**Analogia:** Zamiast poprawiać ręcznie pomyłkę w torcie (wyciągać składnik po wypieczeniu), łatwiej zacząć od nowa gdy ciasto jest jeszcze surowe.

**Przykład zastosowania:** W workflowach transakcyjnych (zamówienia, faktury, deploy'e) — jeśli błąd pojawia się na etapie walidacji końcowej, często tańszy jest `rollback + retry` niż in-place correction, zwłaszcza gdy operacje nie są idempotentne.

## Uruchomienie

```bash
bun run lessons/ts/S04/E05/main.ts
```
