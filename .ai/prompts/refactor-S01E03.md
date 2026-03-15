# Refactor S01E03 — Relative imports → @ai-devs/* aliases

**Prereq:** None (independent of refactor-00-global)
**Violations:** #3 (3 files with relative imports to `packages/`)

---

## Cel

Zamienić 3 importy z bezwzględnych ścieżek `../../../../packages/...` na aliasy `@ai-devs/*`.

---

## Zmiana 1: main.ts

**Plik:** `lessons/ts/S01/E03/main.ts`

**Obecny import (linia ~33):**
```typescript
import { sendAnswer } from "../../../../packages/ai-devs-hub/verify.ts";
```

**Nowy import:**
```typescript
import { sendAnswer } from "@ai-devs/ai-devs-hub";
```

**Uwaga:** Przenieś import na górę pliku, do pozostałych importów (przed `config()`). Obecnie jest osadzony w środku kodu, po `Bun.serve()`.

---

## Zmiana 2: agentLoop.ts

**Plik:** `lessons/ts/S01/E03/agentLoop.ts`

**Obecne importy (linie 2-3):**
```typescript
import { createOpenAIProvider } from "../../../../packages/ai-core/model/openai.ts";
import type { AiTool } from "../../../../packages/ai-core/tools/tool.ts";
```

**Nowe importy:**
```typescript
import { createOpenAIProvider } from "@ai-devs/ai-core";
import type { AiTool } from "@ai-devs/ai-core";
```

Opcjonalnie połącz w jeden import:
```typescript
import { createOpenAIProvider, type AiTool } from "@ai-devs/ai-core";
```

---

## Zmiana 3: tools.ts

**Plik:** `lessons/ts/S01/E03/tools.ts`

**Obecne importy (linie 1-2):**
```typescript
import type { AiTool } from "../../../../packages/ai-core/tools/tool.ts";
import { toolOk, toolErr } from "../../../../packages/ai-core/tools/tool.ts";
```

**Nowe importy:**
```typescript
import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
```

---

## Weryfikacja

```bash
# Zero relative imports to packages/
grep -rn "../../../../packages" lessons/ts/S01/E03/    # → zero results

# Aliasy działają
grep -n "@ai-devs/" lessons/ts/S01/E03/*.ts            # → 3+ matches

# Uruchomienie (wymaga PUBLIC_URL)
# bun run lessons/ts/S01/E03/main.ts
```
