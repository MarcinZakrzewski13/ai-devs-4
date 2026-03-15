# S01E05 — Railway (aktywacja trasy X-01)

## Czego dotyczy zadanie

Zadanie polega na aktywacji trasy kolejowej "X-01" przez samo-dokumentujące API (`hub.ag3nts.org/verify`). API celowo utrudnia interakcję — zwraca błędy 503, wymusza rate limiting (~30s między żądaniami) i nie udostępnia dokumentacji z góry. Jedynym punktem wejścia jest akcja `help`.

## Czego uczy to zadanie (lekcja kursu)

1. **Praca z samo-dokumentującym API** — nie znamy z góry dostępnych endpointów ani parametrów. Trzeba zacząć od `help` i na podstawie odpowiedzi zbudować sekwencję kroków. To symuluje sytuację, w której agent AI musi samodzielnie odkryć możliwości systemu.

2. **Odporność na błędy HTTP** — API celowo zwraca 503 (Service Unavailable) i 429 (Rate Limit). Rozwiązanie musi radzić sobie z tym automatycznie (retry, backoff, parsowanie nagłówków rate-limit).

3. **Deterministyczna interakcja bez LLM** — nie każde zadanie wymaga modelu językowego. Tu wystarczy sekwencja wywołań API odkryta z dokumentacji. Lekcja: dobieraj narzędzia do problemu, nie używaj LLM "bo możesz".

4. **Adaptacyjne podejście dwufazowe** — najpierw discovery (poznaj API), potem execution (wykonaj kroki). Ten wzorzec jest kluczowy przy budowie agentów AI, które muszą rozpoznać środowisko przed działaniem.

## Jak działa rozwiązanie

### Architektura modułów

```
lessons/ts/S01/E05/
├── main.ts           # orkiestracja: help → discover → execute → flag
├── types.ts          # typy: RailwayAction, RailwayRequest, RailwayResponse
├── apiClient.ts      # POST do hub z retry (503) + rate limit handling
├── verifyAnswer.ts   # zapis flagi przez saveFinalAnswer()
└── solution.md       # ten plik
```

### Przepływ

```
help → discover API actions
  ↓
getstatus(X-01) → route is "close"
  ↓
reconfigure(X-01) → enter reconfigure mode
  ↓
setstatus(X-01, RTOPEN) → set status to "open"
  ↓
save(X-01) → exit reconfigure mode → {FLG:COUNTRYROADS}
```

### Kluczowy moduł: `apiClient.ts`

Funkcja `callRailwayApi(action)` obsługuje:

- **Retry na 503**: exponential backoff (1s → 2s → 4s...), max 10 prób
- **Rate limit (429)**: parsuje nagłówek `retry-after` i czeka dokładnie tyle, ile API wymaga
- **Nagłówki**: loguje `x-ratelimit-remaining`, `x-ratelimit-reset`, `x-ratelimit-limit`, `retry-after` po każdym żądaniu
- **Detekcja flagi**: regex `/{FLG:[^}]+}/` na każdej odpowiedzi, z wyróżnionym logiem (`chalk.bgGreen`)

### Orkiestracja: `main.ts`

Dwufazowa:
1. **Discovery** — wywołanie `help`, wypisanie pełnej odpowiedzi
2. **Execution** — sekwencja 4 kroków: `getstatus` → `reconfigure` → `setstatus` → `save`

Nie ma pętli decyzyjnej ani LLM — sekwencja jest stała, wynikająca z dokumentacji API.

## Dlaczego takie podejście

| Decyzja | Uzasadnienie |
|---|---|
| Bez LLM | API jest deterministyczne — dokumentacja w odpowiedzi `help` jednoznacznie opisuje kroki. LLM byłby nadmiarowy. |
| `fetch` zamiast `axios` | Wystarczający do odczytu nagłówków, brak dodatkowej zależności. |
| Agresywne logowanie | API jest powolne (rate limit ~30s) — logi pozwalają śledzić postęp w czasie rzeczywistym. |
| Osobny `apiClient.ts` | Izoluje logikę retry/rate-limit od orkiestracji. Zgodne z ADR-001 (jeden moduł = jedna odpowiedzialność). |
| Brak `sendAnswer()` | Flaga przychodzi bezpośrednio z API railway (nie trzeba osobnego kroku weryfikacji). Zapis przez `saveFinalAnswer()`. |

## Odpowiedzi API (referencja)

### `help`
```json
{
  "actions": ["help", "reconfigure", "getstatus", "setstatus", "save"],
  "route_format": "[a-z]-[0-9]{1,2}",
  "status_values": { "RTOPEN": "open", "RTCLOSE": "close" },
  "notes": ["To change status, first set to reconfigure mode."]
}
```

### `getstatus` → `{ "route": "X-01", "mode": "normal", "status": "close" }`
### `reconfigure` → `{ "route": "X-01", "mode": "reconfigure", "message": "Reconfigure mode enabled." }`
### `setstatus` → `{ "route": "X-01", "mode": "reconfigure", "status": "open", "message": "Status updated." }`
### `save` → `{ "code": 0, "message": "{FLG:COUNTRYROADS}" }`

## Uruchomienie

```bash
bun run lessons/ts/S01/E05/main.ts
```

Czas wykonania: ~2.5 min (ze względu na rate limiting ~30s między żądaniami, 5 wywołań API).
