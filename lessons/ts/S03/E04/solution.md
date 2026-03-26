# S03E04 — Negotiations (budowanie narzędzi dla agenta)

## Czego dotyczy zadanie

Agent Centrali potrzebuje narzędzi do wyszukiwania miast sprzedających komponenty elektroniczne potrzebne do budowy turbiny wiatrowej. Agent wysyła zapytania w języku naturalnym do naszych endpointów HTTP. Musimy dostarczyć max 2 narzędzia, które pozwolą agentowi znaleźć miasta oferujące WSZYSTKIE 3 potrzebne przedmioty jednocześnie. Agent sam decyduje jakie produkty szuka i sam zgłasza wynik do Centrali.

**Kluczowe ograniczenia:**
- Max 2 narzędzia (endpointy HTTP)
- Odpowiedź narzędzia: 4–500 bajtów
- Agent ma max 10 kroków
- Agent szuka 3 produktów
- Zapytania w języku naturalnym (`{params: "rezystor 10 ohm"}`)
- Weryfikacja asynchroniczna — agent potrzebuje 30-60s na przetworzenie

## Czego uczy zadanie

### 1. Projektowanie narzędzi dla zewnętrznego agenta AI
To nie jest budowanie API dla człowieka — to API dla modelu językowego. Opis narzędzia (`description`) musi być na tyle precyzyjny, żeby agent wiedział **kiedy** go użyć, **co** mu wysłać i **jak** interpretować odpowiedź. Kluczowe jest powiązanie narzędzi: "Use these codes with the find-cities tool" — bez tego agent nie wie, że output jednego narzędzia jest inputem drugiego.

### 2. Guard LLM jako warstwa bezpieczeństwa
Przed przetworzeniem każdego zapytania tani model (gpt-5-nano) waliduje je pod kątem prompt injection, off-topic queries i prób manipulacji. Fail-open design: jeśli guard się wywali, zapytanie przechodzi — lepsze niż zablokowanie legalnego ruchu.

### 3. LLM jako normalizer języka naturalnego
Zamiast pisać ręcznie parser dla "potrzebuję kabla długości 10 metrów" → `{keywords: ["kabel", "10m"]}`, LLM robi to niezawodnie z Structured Output. Model normalizuje jednostki, usuwa filler words, rozpoznaje synonimy — coś, czego regex/keyword matching nigdy nie obsłuży kompletnie.

### 4. Separacja warstw: guard → normalizer → search engine
Trójwarstwowa architektura per request:
- **Guard** (LLM) — czy zapytanie jest legalne?
- **Normalizer** (LLM) — ekstrakcja parametrów z języka naturalnego
- **Search Engine** (deterministyczny) — przeszukiwanie CSV danych

Każda warstwa robi jedną rzecz. LLM nigdy nie dotyka danych bezpośrednio — tylko przygotowuje parametry dla deterministycznego silnika.

### 5. Ograniczenia komunikacji agent↔narzędzie
500 bajtów na odpowiedź wymusza zwięzłość. 10 kroków wymusza efektywność narzędzi. To realistyczne ograniczenie produkcyjne — agenci mają limity kontekstu i budżetu.

## Jak działa rozwiązanie

### Architektura

```
┌─────────────────────────────────────────────────────┐
│                    Bun.serve (:3000)                 │
│                                                     │
│  POST /search-items          POST /find-cities      │
│  ┌───────────────┐           ┌───────────────┐      │
│  │  Guard (nano) │           │  Guard (nano) │      │
│  │  ↓            │           │  ↓            │      │
│  │  Normalizer   │           │  Normalizer   │      │
│  │  (mini)       │           │  (mini)       │      │
│  │  ↓            │           │  ↓            │      │
│  │  Search Engine│           │  Code Lookup  │      │
│  │  (keyword AND)│           │  (Map lookup) │      │
│  └───────────────┘           └───────────────┘      │
│                                                     │
│  CSV Data (in-memory):                              │
│  - 51 cities, 2136 items, 5349 connections          │
│  - Indexed: cityByCode, itemByCode, connectionsByItem│
└─────────────────────────────────────────────────────┘
         ↑                              ↑
         │    ngrok tunnel              │
         └──────────────────────────────┘
                      ↑
              Agent Centrali
              (max 10 kroków)
```

### Przepływ danych

```
1. Agent → POST /search-items {params: "rezystor SMD 10 ohm"}
   Guard: ✅ (gpt-5-nano, ~100ms)
   Normalizer: {keywords: ["rezystor", "smd", "10", "ohm"]} (gpt-5-mini, ~300ms)
   Search: AND match w 2136 items → "Rezystor SMD 10 ohm 0402 1% niski szum (2GF4VO), ..."
   ← {output: "Rezystor SMD 10 ohm 0402... (2GF4VO), Rezystor SMD 10 ohm... (YFJSZY)"}

2. Agent → POST /find-cities {params: "2GF4VO"}
   Guard: ✅
   Normalizer: {itemCode: "2GF4VO", itemName: ""}
   Lookup: connections[2GF4VO] → cityCodes → cityNames
   ← {output: "Torun, Inowroclaw, Jastrzebie-Zdroj"}

3-6. Agent powtarza dla pozostałych 2 produktów

7. Agent oblicza przecięcie miast i zgłasza wynik do Centrali
```

### Moduły (8 plików)

| Plik | Rola | LLM? |
|------|------|------|
| `main.ts` | Bun.serve, routing, rejestracja narzędzi, async check | - |
| `types.ts` | Typy: ToolRequest, ToolResponse, CsvData, GuardResult, NormResult | - |
| `load-data.ts` | Fetch + parse 3 CSV → indeksowane mapy in-memory | - |
| `guard.ts` | Guard LLM: walidacja zapytania (gpt-5-nano, Structured Output) | gpt-5-nano |
| `normalizer.ts` | Normalizer LLM: ekstrakcja parametrów (gpt-5-mini, Structured Output) | gpt-5-mini |
| `search-engine.ts` | Deterministyczny search: keyword AND/OR + code lookup | - |
| `handle-search.ts` | Orchestrator /search-items: guard → norm → search | - |
| `handle-cities.ts` | Orchestrator /find-cities: guard → norm → lookup | - |

### Kluczowe decyzje techniczne

**2 endpointy zamiast 1:** Separacja "szukaj produkt" od "znajdź miasta" daje agentowi elastyczność — może najpierw zbadać katalog, potem dopytać o lokalizacje. Kosztuje to 6 kroków zamiast 3, ale mieści się w limicie 10.

**Guard fail-open:** Jeśli guard LLM się wywali, zapytanie przechodzi. W kontekście CTF ryzyko prompt injection jest niskie (agent Centrali jest kontrolowany), a fałszywe blokowanie = brak flagi.

**AND match z OR fallback:** Najpierw szukamy produktów pasujących do WSZYSTKICH keywords. Jeśli brak wyników, szukamy z dowolnym keyword. To zwiększa szansę na trafienie gdy normalizer podzieli frazę inaczej niż oczekiwano.

**Normalizacja diakrytyków:** `normalize("NFD")` + usunięcie combining marks pozwala matchować "rezystor" z "Rezystor" i "ząb" z "zab" (choć akurat w tym datasecie to mniej istotne).

## Odpowiedzi API / dane referencyjne

### Dane CSV
- **cities.csv**: 51 miast polskich z 6-znakowym kodem alfanumerycznym
- **items.csv**: 2136 komponentów elektronicznych (rezystory, kondensatory, diody, tranzystory, cewki, stabilizatory, układy logiczne, wzmacniacze)
- **connections.csv**: 5349 powiązań item→city

### Format komunikacji agent↔narzędzie
```json
// Request (agent → narzędzie)
{"params": "wartość w języku naturalnym"}

// Response (narzędzie → agent)
{"output": "odpowiedź tekstowa ≤500B"}
```

### Rejestracja narzędzi w Centrali
```json
{
  "task": "negotiations",
  "answer": {
    "tools": [
      {"URL": "https://xxx.ngrok-free.app/search-items", "description": "..."},
      {"URL": "https://xxx.ngrok-free.app/find-cities", "description": "..."}
    ]
  }
}
```

### Weryfikacja asynchroniczna
```json
// Po 30-60s:
{"task": "negotiations", "answer": {"action": "check"}}
```

## Dlaczego takie podejście

**LLM guard + normalizer zamiast czystego keyword matching:**
Keyword matching nie obsłuży "potrzebuję rezystora o rezystancji dziesięciu omów" → "rezystor 10 ohm". LLM robi to natywnie. Guard dodaje warstwę bezpieczeństwa, która w produkcji byłaby krytyczna (agenci publicznie dostępni = wektor ataku). Koszt ~$0.004 per pełny run — marginalny.

**Deterministyczny search engine zamiast LLM search:**
LLM nie powinien przeszukiwać 2136 produktów — to za duży kontekst i niedeterministyczne wyniki. Keyword match na znormalizowanych stringach jest szybki, powtarzalny i darmowy.

**Bun.serve + ngrok zamiast deploy na serwer:**
Dla zadań CTF ngrok jest idealny — zero konfiguracji, instant deploy. W produkcji byłby to serwer lub serverless function.

## Wnioski z lekcji

### 1. Opis narzędzia jest ważniejszy niż implementacja

**Co się wydarzyło:** Agent Centrali musi zrozumieć z samego opisu narzędzia: (a) co ono robi, (b) co mu wysłać, (c) jak użyć wyniku. Bez frazy "Use these codes with the find-cities tool" agent nie wiedziałby, że output /search-items jest inputem /find-cities.

**Analogia:** To jak pisanie instrukcji obsługi dla osoby, która nigdy nie widziała Twojego urządzenia i nie może Cię o nic zapytać. Każda dwuznaczność = błąd. W przeciwieństwie do API dla ludzi, gdzie developer czyta docs, debuguje, iteruje — agent ma jeden shot na zrozumienie.

**Przykład zastosowania:** Każde narzędzie w systemie agentowym (MCP server, function calling, plugin) powinno mieć opis napisany z perspektywy "co agent musi wiedzieć, żeby podjąć dobrą decyzję o użyciu tego narzędzia". Nie wystarczy powiedzieć "searches products" — trzeba powiedzieć "searches by name, returns codes for use with another tool".

### 2. LLM jako "tłumacz" między językiem naturalnym a strukturą — nie jako silnik wyszukiwania

**Co się wydarzyło:** Zamiast wysyłać 2136 produktów do LLM z pytaniem "który pasuje?", LLM dostaje tylko zapytanie użytkownika i wyciąga z niego znormalizowane keywords. Potem deterministyczny silnik robi matching. Dwie warstwy, każda robi to, w czym jest najlepsza.

**Analogia:** Nie zatrudniasz tłumacza do przeszukiwania biblioteki — tłumacz tłumaczy Twoje pytanie na język katalogowy, a bibliotekarz szuka na półkach. Każdy robi swoją robotę.

**Przykład zastosowania:** System e-commerce: klient pisze "czerwona sukienka na wesele do 200 zł" → LLM normalizuje: `{color: "red", type: "dress", occasion: "wedding", maxPrice: 200}` → SQL/Elasticsearch robi query. LLM nie widzi katalogu produktów — widzi tylko intencję użytkownika.

### 3. Guard LLM: fail-open vs fail-closed to decyzja biznesowa

**Co się wydarzyło:** Guard LLM waliduje zapytania pod kątem prompt injection. Wybraliśmy fail-open (jeśli guard się wywali, zapytanie przechodzi) — bo w kontekście CTF fałszywe blokowanie = brak flagi, a ryzyko ataku jest niskie.

**Analogia:** Bramkarz w klubie nocnym. W ekskluzywnym VIP lounge lepiej nie wpuścić jednego legalnego gościa (fail-closed) niż wpuścić jednego intruza. Ale w publicznym barze na rogu lepiej wpuścić wątpliwego gościa niż odstraszać klientów (fail-open). Kontekst decyduje.

**Przykład zastosowania:** Publiczne API z function calling → fail-closed (lepiej zwrócić "nie rozumiem" niż wykonać złośliwą komendę). Wewnętrzny agent do raportowania → fail-open (lepiej przetworzyć dziwne zapytanie niż zablokować raport dla szefa).

### 4. Dwuwarstwowy design narzędzi daje agentowi elastyczność kosztem kroków

**Co się wydarzyło:** 2 endpointy (search + lookup) zamiast 1 (search+lookup razem). Kosztuje 6 kroków zamiast 3, ale daje agentowi możliwość: zbadać katalog → wybrać najlepszy produkt → sprawdzić dostępność. Z jednym endpointem agent nie ma kontroli nad wyborem konkretnego produktu z wielu pasujących.

**Analogia:** Automat biletowy z jednym przyciskiem "kup bilet do Krakowa" vs dwa ekrany: "pokaż połączenia do Krakowa" → "kup bilet na połączenie X". Pierwszy jest szybszy, drugi daje kontrolę nad wyborem.

**Przykład zastosowania:** Przy projektowaniu toolkitu dla agenta: jeśli agent ma budżet kroków, rozważ granularność. Jedno narzędzie "do wszystkiego" jest szybkie ale nieprecyzyjne. Wiele małych narzędzi jest precyzyjne ale kosztowne. Sweet spot zależy od limitu kroków i złożoności zadania.

### 5. Ograniczenie rozmiaru odpowiedzi wymusza lepszy design

**Co się wydarzyło:** 500B limit na odpowiedź wymusił: (a) zwracanie tylko niezbędnych danych (nazwa + kod, bez opisu), (b) truncation z informacją `[+N more]`, (c) myślenie o tym, co agent naprawdę potrzebuje vs co moglibyśmy mu dać.

**Analogia:** Tweet vs esej. Ograniczenie do 280 znaków zmusza do zastanowienia się "co jest istotą mojego przekazu?" — i paradoksalnie komunikat staje się czytelniejszy. Bez limitu wrzucilibyśmy pełne opisy produktów i agent utopiłby się w danych.

**Przykład zastosowania:** Przy projektowaniu odpowiedzi narzędzi dla agentów: mniej = lepiej. Agent z 10 trafnymi nazwami podejmie lepszą decyzję niż agent z 200 pełnymi opisami. Kontekst modelu jest skończony — respektuj go.

## Uruchomienie

```bash
# Terminal 1: tunel publiczny
ngrok http 3000

# Terminal 2: serwer (ustaw PUBLIC_URL w .env na URL z ngrok)
bun run lessons/ts/S03/E04/main.ts
```

Serwer automatycznie: pobiera CSV → startuje HTTP → rejestruje narzędzia w Centrali → po 30s zaczyna sprawdzać wynik.
