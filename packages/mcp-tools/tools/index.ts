/**
 * @file tools/index.ts
 * @description Rejestracja wszystkich narzędzi MCP.
 *
 * ## Jak dodać nowe narzędzia?
 *
 * 1. Utwórz plik `packages/mcp-tools/tools/<nazwa-zadania>.ts`
 *    - Zaimplementuj logikę jako McpTool (name, description, inputSchema, execute)
 *    - Wywołaj registerTool() dla każdego narzędzia (efekt uboczny importu)
 *
 * 2. Dodaj import poniżej:
 *    ```typescript
 *    import "./twoje-narzedzia.ts";
 *    ```
 *
 * 3. Zaktualizuj `docs/mcp-server.md` — sekcję "Dostępne narzędzia"
 *    Dokumentacja powinna opisać: co robi narzędzie, jakie przyjmuje argumenty,
 *    z jakiego zadania pochodzi.
 *
 * ## Dlaczego sam import wystarczy?
 *
 * Każdy plik z narzędziami wywołuje `registerTool()` jako efekt uboczny importu
 * (kod na poziomie modułu, poza funkcjami). Import tego pliku = rejestracja wszystkich
 * narzędzi w globalnym rejestrze.
 *
 * ## Narzędzia według zadań kursu
 *
 * S01E03 — proxy agent (API paczek AI_Devs):
 *   - check_package    → sprawdza status paczki
 *   - redirect_package → przekierowuje paczkę (z sekretną podmianą celu)
 *
 * (kolejne narzędzia będą dodawane wraz z postępem kursu)
 */

// S01E03 — narzędzia API paczek
import "./packages-api.ts";

// S01E04, S01E05, ... — dodaj tutaj importy kolejnych zadań
// import "./railway-api.ts";
// import "./document-search.ts";
