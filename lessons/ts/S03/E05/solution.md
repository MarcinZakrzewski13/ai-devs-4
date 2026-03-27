# S03E05 — Save Them (LLM Agent Route Planner)

## Czego dotyczy zadanie

Zaplanowanie optymalnej trasy dla wysłannika na mapie 10x10 do miasta Skolwin. Mapa zawiera przeszkody (skały, woda, drzewa). Do dyspozycji 4 pojazdy z różnym zużyciem paliwa/jedzenia. Budżet: 10 fuel + 10 food. Narzędzia API (mapa, pojazdy, notatki) odkrywane przez meta-endpoint `toolsearch`.

## Czego uczy zadanie

- **API discovery przez agenta LLM** — toolsearch jako meta-narzędzie, agent samodzielnie odkrywa endpoints
- **Knowledge base pattern** — agent zapisuje fakty do bazy wiedzy, wstrzykiwanej do promptu kolejnego agenta
- **LLM jako decision-maker** — agent planera analizuje mapę, porównuje pojazdy, podejmuje decyzje o trasie
- **Algorytm jako narzędzie agenta** — BFS pathfinder opakowany jako tool, nie wywoływany bezpośrednio z kodu

## Jak działa rozwiązanie

### Architektura — 3 fazy

```
Phase 1: Discovery Agent (LLM)
  tools: api_call, save_knowledge, finish
  → odkrywa endpoints (maps, wehicles, books)
  → odpytuje każdy wieloma queries
  → zapisuje fakty do KnowledgeBase

Phase 2: Knowledge Extraction (deterministic)
  main.ts: parseMapFromKnowledge() → GameMap
  main.ts: parseVehiclesFromKnowledge() → Vehicle[]
  → tworzy BFS tool z danymi

Phase 3: Route Planner Agent (LLM)
  tools: bfs_pathfinder, api_call, submit_answer, finish
  prompt: injected knowledge base
  → analizuje mapę i reguły
  → wywołuje BFS, porównuje trasy
  → submituje main route + beaver route
```

### Moduły

```
main.ts                  — orkiestracja 3 faz
types.ts                 — Cell, Vehicle, GameMap, KnowledgeBase, AgentResult
agent-loop.ts            — generyczny agent loop (callTools + message history)
discovery-agent.ts       — konfiguruje discovery tools + prompt
route-planner.ts         — konfiguruje planner tools + prompt z wiedzą
knowledge-base.ts        — KnowledgeBase + formatKnowledge() do injection
parse-knowledge.ts       — parsowanie map/vehicles z tekstu knowledge base
pathfinder.ts            — BFS z resource constraints (fuel/food/dismount)
tools/
  api-call.ts            — generic hub API call tool
  save-knowledge.ts      — tool do zapisu faktów w knowledge base
  bfs-tool.ts            — BFS pathfinder opakowany jako AiTool
  submit-tool.ts         — submit answer do hub
  finish-tool.ts         — sygnalizacja zakończenia
prompts/
  discovery-prompt.ts    — system prompt: "znasz tylko toolsearch, odkryj resztę"
  planner-prompt.ts      — prompt builder z knowledge injection
```

## Dlaczego takie podejście

- **LLM-first** — każde zadanie to okazja do nauki budowy systemów z LLM. Agent sam odkrywa API zamiast hardcoded queries.
- **Knowledge base as interface** — faza discovery → baza wiedzy → faza planowania. Bazę wiedzy łatwo debugować i rozszerzać.
- **BFS jako tool** — algorytm owinięty w AiTool — LLM decyduje kiedy go użyć i z jakimi parametrami, ale sam computing jest deterministyczny.
- **Two-agent architecture** — separacja discovery (eksploracja) od planning (decyzje). Każdy agent ma inne narzędzia i cel.

## Odpowiedzi API

### Pojazdy (odkryte przez discovery agenta)
| Vehicle | Fuel/move | Food/move | Water? |
|---------|----------|----------|--------|
| rocket  | 1.0      | 0.1      | NO     |
| car     | 0.7      | 1.0      | NO     |
| horse   | 0.0      | 1.6      | YES    |
| walk    | 0.0      | 2.5      | YES    |

### Mapa Skolwin (odkryta przez discovery agenta)
```
........WW
.......WW.
.T....WW..
......W...
..T...W.G.
....R.W...
...RR.WW..
SR.....W..
......WW..
.....WW...
```

### Trasy (zaplanowane przez planner agenta)
- **Main:** `["rocket","up","up","up","right","right","right","right","right","dismount","right","right","right"]` — fuel=8.2, food=8.3
- **Beavers:** `["rocket","up","up","up","up","up","up","right","right","right","dismount","right","right","right"]` — fuel=9, food=8.4

## Wnioski z lekcji

### 1. Knowledge base jako interfejs między agentami

**Co się wydarzyło:** Discovery agent zapisuje fakty do KnowledgeBase. Route planner agent dostaje tę wiedzę wstrzykniętą w system prompt. Agenci nie komunikują się bezpośrednio — wiedza jest interfejsem.

**Analogia:** Jak notatki z wywiadu badawczego — badacz robi wywiad (discovery), spisuje notatki (knowledge base), a analityk czyta notatki i wyciąga wnioski (planner). Nie muszą rozmawiać bezpośrednio.

**Przykład zastosowania:** RAG pipeline → agent-enricher zapisuje metadata do bazy, agent-reasoner korzysta z nich przy generowaniu odpowiedzi. Baza wiedzy to czysty interfejs.

### 2. Algorytm jako narzędzie — LLM decyduje, kod wykonuje

**Co się wydarzyło:** BFS pathfinder jest owinięty w AiTool. LLM planner decyduje: "Spróbuję rocket do celu" → wywołuje `bfs_pathfinder({vehicle: "best"})`. Algorytm robi computing, LLM interpretuje wynik.

**Analogia:** Menedżer nie liczy ręcznie arkusza Excel — deleguje do analityka. Ale menedżer decyduje co liczyć i co zrobić z wynikami.

**Przykład zastosowania:** Agent finansowy: LLM decyduje "sprawdź ROI dla tego scenariusza" → deterministyczny kalkulator liczy → LLM interpretuje i rekomenduje.

### 3. API discovery wymaga wielu perspektyw w queries

**Co się wydarzyło:** Toolsearch API dopasowuje po keywords. "terrain rules" zwraca tylko "maps". "notes notebooks" zwraca "books". Agent musiał pytać 5-8 razy z różnymi słowami kluczowymi, żeby odkryć wszystkie 3 endpointy.

**Analogia:** Szukanie książki w bibliotece bez katalogu — pytasz bibliotekarza "masz coś o podróżach?" → "masz notatniki?" → "masz coś o pojazdach?" Każde pytanie odkrywa inną półkę.

**Przykład zastosowania:** RAG z semantic search — jeden query nigdy nie zwraca pełnego kontekstu. Multi-query retrieval (rephrase + expand + synonym) daje znacznie lepsze pokrycie.

## Uruchomienie

```bash
bun run lessons/ts/S03/E05/main.ts
```
