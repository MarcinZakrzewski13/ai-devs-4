# ADR-003: Współdzielony serwer MCP dla narzędzi agentowych

**Status:** Accepted
**Data:** 2026-03-17

---

## Kontekst

Zadania kursu AI_Devs 4 wymagają budowania agentów z tool calling (S01E03 i kolejne).
Dotychczas narzędzia (`AiTool`) były definiowane osobno w każdym zadaniu i nie mogły
być reużywane. Spodziewamy się, że finalne zadanie kursu połączy umiejętności z wielu
wcześniejszych epizodów — w tym narzędzia (API paczek, koleje, dokumenty itp.).

Alternatywy rozważane:
- **A: narzędzia per-zadanie** — izolowane, proste, ale bez możliwości reużycia
- **B: współdzielony serwer MCP** — jeden pakiet akumuluje narzędzia, dostępny przez protokół

## Decyzja

Tworzymy pakiet `@ai-devs/mcp-tools` (`packages/mcp-tools/`) jako **współdzielony serwer MCP**
implementujący protokół [Model Context Protocol](https://modelcontextprotocol.io) (Anthropic).

Kluczowe wybory:

1. **Implementacja ręczna** (bez `@modelcontextprotocol/sdk`) — edukacyjna, pokazuje protokół od środka
2. **Dwa transporty**: stdio (domyślny, subprocess) i HTTP/SSE (--http flag)
3. **Wzorzec rejestracji przez efekt uboczny importu** — każdy plik tools/*.ts wywołuje registerTool() przy imporcie
4. **Klient zwraca AiTool[]** — agentLoop.ts nie wymaga zmian, traktuje MCP jak lokalny zestaw narzędzi

## Konsekwencje

### Pozytywne

- Każde nowe zadanie może dodać narzędzia do `packages/mcp-tools/tools/` → dostępne globalnie
- `agentLoop.ts` pozostaje bez zmian — klient MCP jest transparent proxy dla AiTool[]
- Dwa transporty pokazują dwa wzorce komunikacji (lokalny subprocess vs sieciowy)
- Pełna dokumentacja w `docs/mcp-server.md` ułatwia naukę protokołu

### Negatywne / kompromisy

- Dodatkowa złożoność vs bezpośrednie AiTool (uzasadniona dla finalnego zadania kursu)
- W trybie stdio każdy restart agenta = restart serwera MCP (subprocess lifecycle)
- Implementacja ręczna wymaga utrzymania — SDK byłoby mniej kodu

### Konwencje wynikające z tej decyzji

- Nowe narzędzia: `packages/mcp-tools/tools/<zadanie>.ts` → import w `tools/index.ts` → opis w `docs/mcp-server.md`
- Nazwy narzędzi: `snake_case` (konwencja MCP)
- Błędy narzędzi: `mcpErr()` (isError: true w result) ≠ błędy protokołu (error w JSON-RPC)
- Serwer stdio: `bun run packages/mcp-tools/server.ts`
- Serwer HTTP: `bun run packages/mcp-tools/server.ts --http [--port N]`
