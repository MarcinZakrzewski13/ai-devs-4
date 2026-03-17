/**
 * @file registry.ts
 * @description Globalny rejestr narzędzi MCP.
 *
 * ## Wzorzec rejestracji
 *
 * Registry to singleton (jedna instancja na cały czas życia procesu serwera).
 * Narzędzia rejestrują się przez efekt uboczny importu:
 *
 * ```typescript
 * // tools/packages-api.ts
 * import { registerTool } from "../registry.ts";
 * registerTool(checkPackageTool);   // wykonuje się przy imporcie modułu
 * registerTool(redirectPackageTool);
 *
 * // tools/index.ts — importuje wszystkie pliki z narzędziami
 * import "./packages-api.ts"; // ten import rejestruje narzędzia
 *
 * // server.ts — jedyny import wystarczy do rejestracji wszystkich narzędzi
 * import "./tools/index.ts";
 * ```
 *
 * ## Dodawanie nowych narzędzi
 *
 * 1. Utwórz plik `packages/mcp-tools/tools/<nazwa-zadania>.ts`
 * 2. Zaimplementuj logikę jako McpTool (z execute())
 * 3. Wywołaj registerTool() przy imporcie modułu
 * 4. Dodaj import do `tools/index.ts`
 * 5. Zaktualizuj `docs/mcp-server.md` (sekcja "Dostępne narzędzia")
 *
 * Serwer automatycznie zwróci nowe narzędzia w odpowiedzi na tools/list.
 */

import type { McpTool } from "./protocol/types.ts";

/** Mapa narzędzi: nazwa → McpTool. Używamy Map dla O(1) lookup po nazwie. */
const registry = new Map<string, McpTool>();

/**
 * Rejestruje narzędzie w globalnym rejestrze.
 *
 * Jeśli narzędzie o tej samej nazwie już istnieje — nadpisuje je i loguje ostrzeżenie.
 * Nadpisywanie jest świadomym wyborem (np. hotswap narzędzi w przyszłości),
 * ale w normalnym użyciu każda nazwa powinna być unikalna.
 *
 * @param tool - narzędzie do zarejestrowania
 */
export const registerTool = (tool: McpTool): void => {
  if (registry.has(tool.name)) {
    process.stderr.write(
      `[registry] UWAGA: nadpisuję narzędzie "${tool.name}" — sprawdź czy nazwy są unikalne\n`
    );
  }
  registry.set(tool.name, tool);
  process.stderr.write(`[registry] zarejestrowano: ${tool.name}\n`);
};

/** Zwraca wszystkie zarejestrowane narzędzia jako tablicę (kolejność rejestracji) */
export const getAllTools = (): McpTool[] => [...registry.values()];

/** Zwraca narzędzie po nazwie lub undefined jeśli nie istnieje */
export const getTool = (name: string): McpTool | undefined => registry.get(name);

/** Zwraca liczbę zarejestrowanych narzędzi */
export const getToolCount = (): number => registry.size;

/** Zwraca nazwy wszystkich zarejestrowanych narzędzi (do logowania) */
export const getToolNames = (): string[] => [...registry.keys()];
