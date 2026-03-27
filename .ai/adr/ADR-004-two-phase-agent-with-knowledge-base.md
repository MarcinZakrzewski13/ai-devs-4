# ADR-004: Two-Phase Agent Architecture with Knowledge Base

**Status:** Accepted
**Data:** 2026-03-27

## Kontekst

Zadania kursu wymagają eksploracji nieznanych API, zbierania informacji i podejmowania decyzji. Dotychczas robiliśmy to deterministycznie (hardcoded queries, bezpośrednie wywołania). Potrzebujemy wzorca, w którym LLM agent samodzielnie odkrywa API, buduje wiedzę i podejmuje decyzje.

## Decyzja

Wprowadzamy wzorzec dwufazowej architektury agentowej:

### Faza 1: Discovery Agent
- Agent LLM z narzędziami: `api_call` (generic), `save_knowledge`, `finish`
- System prompt definiuje cel eksploracji, NIE podaje gotowych odpowiedzi
- Agent samodzielnie odkrywa endpointy, odpytuje je, zapisuje fakty do `KnowledgeBase`

### Knowledge Base jako interfejs
- `KnowledgeBase` — typowany obiekt z kategoriami (endpoints, map, vehicles, terrain_rules, other)
- `save_knowledge` tool — LLM artykułuje odkryte fakty i je klasyfikuje
- `formatKnowledge(kb)` — serializuje bazę wiedzy jako structured text
- Wiedza wstrzykiwana w system prompt następnego agenta

### Faza 2: Planner/Executor Agent
- Agent LLM z narzędziami specyficznymi dla zadania + `submit_answer` + `finish`
- System prompt zawiera pełną bazę wiedzy z Fazy 1
- Algorytmy deterministyczne (BFS, sort) opakowane jako `AiTool` — agent decyduje kiedy je użyć

### Orchestration
- `main.ts` łączy fazy: discovery → parse → planning
- Parser (`parseMapFromKnowledge`, `parseVehiclesFromKnowledge`) ekstrahuje typed data z tekstu bazy wiedzy

## Konsekwencje

- Rozwiązania wymagają LLM (koszt ~$0.01-0.05 per run)
- Knowledge base jest debugowalna (tekst logowany do konsoli)
- Algorytmy pozostają deterministyczne, ale delegacja do LLM
- Wzorzec reużywalny: zmień tools + prompts, zachowaj agent-loop + knowledge-base

## Alternatywy rozważone

- **Jeden duży agent** — zbyt złożony prompt, mieszanie discovery z execution
- **Pełen determinizm** — nie uczy programowania z LLM (cel kursu)
- **Trzy agenty** (discovery + planner + executor) — overengineering dla tego rozmiaru zadań
