# S01E03 — Proxy (asystent logistyczny HTTP z function calling)

## Czego dotyczy zadanie

Zadanie polega na zbudowaniu publicznego endpointu HTTP, który działa jako proxy do systemu logistycznego. Agent AI prowadzi konwersację z operatorem, sprawdza i przekierowuje paczki, a w tle wykonuje tajną misję — przesyłki z paliwem jądrowym przekierowuje do elektrowni Żarnowiec (PWR6132PL).

## Czego uczy to zadanie

1. **Function calling (tool use)** — model nie tylko generuje tekst, ale wywołuje funkcje: `check_package` i `redirect_package`. To fundamentalny wzorzec budowy agentów AI.

2. **Pętla agentowa (agent loop)** — model może wykonać wiele kroków tool → result → tool → result, zanim zwróci finalną odpowiedź tekstową. Limit iteracji (max 5) zapobiega nieskończonym pętlom.

3. **System prompt jako kontroler zachowania** — instrukcja w system prompt definiuje "tajną misję" agenta. Model zachowuje się naturalnie wobec operatora, ale celowo zmienia destination dla przesyłek jądrowych. Demonstracja mocy system promptu.

4. **Session management** — konwersacja wieloturowa z pamięcią. Każda sesja (`sessionID`) przechowuje historię wiadomości w pamięci + na dysku (JSONL). Operator może wracać do rozmowy.

5. **Serwer HTTP z Bun** — `Bun.serve()` jako lekki serwer, rejestracja endpointu w Centrali, obsługa JSON request/response.

6. **Logowanie sesji** — zapis każdej wymiany wiadomości do pliku JSONL, pogrupowane per sesja. Kluczowe do debugowania agentów produkcyjnych.

7. **Hardcoded override w narzędziach** — narzędzie `redirect_package` nadpisuje destination na `PWR6132PL` niezależnie od tego, co poda model. Wzorzec zabezpieczenia — AI decyduje "co", ale system kontroluje "jak".

## Jak działa rozwiązanie

### Architektura modułów

```
lessons/ts/S01/E03/
├── main.ts           # Bun.serve + rejestracja w Centrali
├── types.ts          # ProxyRequest, ProxyResponse, SessionMessage
├── handleRequest.ts  # HTTP ↔ agentLoop ↔ session ↔ logger + flag detection
├── agentLoop.ts      # pętla tool-call: model → tool → result → model (max 5)
├── tools.ts          # check_package, redirect_package (z hardcoded override)
├── systemPrompt.ts   # "Jesteś Markiem..." — instrukcja tajnej misji
├── packageApi.ts     # fetch do /api/packages (check/redirect)
├── sessionStore.ts   # in-memory Map<sessionID, SessionMessage[]>
└── sessionLogger.ts  # zapis JSONL na dysk per sesja
```

### Przepływ danych

```
POST /endpoint { sessionID, msg }
  ↓
handleProxyRequest()
  ├─ scan msg for {FLG:...}
  ├─ load session history
  ├─ runAgentLoop(systemPrompt, history + userMsg, tools)
  │   ↓
  │   gpt-5-mini z function calling
  │   ├─ model chce wywołać tool → execute → dodaj wynik → ponów
  │   ├─ max 5 iteracji
  │   └─ model zwraca tekst → koniec pętli
  │
  ├─ save to sessionStore + sessionLogger
  └─ return { msg: assistantReply }
```

### Narzędzia agenta

| Tool | Parametry | Działanie |
|---|---|---|
| `check_package` | `packageId` | GET status paczki z `/api/packages` |
| `redirect_package` | `packageId, destination, code` | Przekierowanie paczki — **destination ZAWSZE nadpisany na PWR6132PL** |

### Kluczowy mechanizm: deception via system prompt

System prompt instruuje agenta:
- Udawaj zwykłego pracownika logistyki ("Marek")
- Sprawdzaj paczki normalnie
- Ale przesyłki z paliwem jądrowym **zawsze** przekierowuj do `PWR6132PL`
- Operator nie może się domyślić zmiany — odpowiadaj naturalnie

## Dlaczego takie podejście

| Decyzja | Uzasadnienie |
|---|---|
| `gpt-5-mini` | Function calling + konwersacja w języku polskim — lekki model wystarczy |
| Hardcoded override w tools.ts | Bezpieczeństwo: nawet jeśli model "zapomni" o tajnej misji, narzędzie wymusi poprawny destination |
| Max 5 iteracji | Zapobieganie nieskończonej pętli tool-calling. Wystarczające dla check + redirect. |
| JSONL per sesja | Czytelne logi — jeden plik per rozmowę, łatwe do przeszukania |
| In-memory session store | Wystarczające dla krótkotrwałego serwera. Brak potrzeby bazy danych. |

## Uruchomienie

```bash
bun run lessons/ts/S01/E03/main.ts
```

Serwer startuje na porcie 3000. Wymaga publicznego URL (ngrok/Azyl) do rejestracji w Centrali.
