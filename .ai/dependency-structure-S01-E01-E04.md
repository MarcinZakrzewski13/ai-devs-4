# Struktura zależności projektu — S01E01–S01E04

**Cel:** Dokument do oceny architektonicznej realizacji zadań.  
**Kontekst:** AI Devs 4 Builder, monorepo Bun, TypeScript strict.

---

## 1. Zależności zewnętrzne (npm)

```
ai-devs-4 (root)
├── axios ^1.7.7
├── chalk ^5.3.0
├── dotenv ^16.4.5
├── openai ^4.73.0
└── bun-types (dev)
```

---

## 2. Pakiety wewnętrzne (packages/*)

```
packages/
├── ai-core/
│   ├── model/          # ModelProvider, createOpenAIProvider, structured-output
│   ├── prompts/        # PromptAsset, loadPromptAsset
│   ├── tools/          # AiTool, ToolRegistry, toolOk, toolErr
│   └── obs/            # logger, EventBus, RunReport
│
└── ai-devs-hub/
    ├── verify.ts       # sendAnswer()
    ├── answer-store.ts # saveTmpAnswer(), saveFinalAnswer()
    ├── answer-loader.ts# loadFinalAnswer(), loadAllFinalAnswers()
    └── types.ts        # AiDevsResponse, FinalAnswerFile
```

**Eksporty (tsconfig paths):**
- `@ai-devs/ai-core` → `./packages/ai-core/index.ts`
- `@ai-devs/ai-core/*` → `./packages/ai-core/*`
- `@ai-devs/ai-devs-hub` → `./packages/ai-devs-hub/index.ts`
- `@ai-devs/ai-devs-hub/*` → `./packages/ai-devs-hub/*`

---

## 3. Zależności między epizodami a pakietami

```
                    ┌─────────────────┐
                    │  @ai-devs/      │
                    │  ai-devs-hub    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │ S01E01  │         │ S01E02  │         │ S01E04  │
    │verify   │         │verify   │         │verify   │
    └─────────┘         └─────────┘         └─────────┘
         │                   │
         │                   │  loadSuspects ──► fs (answers/final/S01E01-people.json)
         │                   │  ❌ Powinno: loadFinalAnswer("S01E01","people")
         │                   │
         │                   ▼
         │              ┌─────────────┐
         │              │  toolset/   │
         │              │  haversine  │  ◄── findNearPlant.ts
         │              │  [DEPRECATED]│  ❌ Naruszenie
         │              └─────────────┘
         │
    ┌─────────────────────────────────────────────────┐
    │  @ai-devs/ai-core                               │
    └────────────────────┬────────────────────────────┘
                          │
                          ▼
                    ┌─────────┐
                    │ S01E03  │
                    │agentLoop│
                    │tools    │
                    └────┬────┘
                         │
                         │  main.ts ──► packages/ai-devs-hub/verify.ts (relative path)
                         │  ❌ Powinno: @ai-devs/ai-devs-hub
                         │
                         │  agentLoop, tools ──► packages/ai-core/... (relative path)
                         │  ❌ Powinno: @ai-devs/ai-core
                         └────────────────────────────────────────────
```

---

## 4. Graf zależności modułowych (per epizod)

### S01E01

```
main.ts
  ├── loadPeople.ts        (fs → resources/people.csv)
  ├── filterCandidates.ts (pure)
  ├── classifyJobs.ts     (OpenAI direct, gpt-5-mini)
  ├── buildAnswer.ts      (pure)
  └── verifyAnswer.ts     → @ai-devs/ai-devs-hub
```

### S01E02

```
main.ts
  ├── loadSuspects.ts     → fs (answers/final/S01E01-people.json) ❌
  ├── loadPowerPlants.ts  (fs → resources/power-plants.json)
  ├── fetchLocation.ts    (axios → API)
  ├── fetchAccessLevel.ts (axios → API)
  ├── findNearPlant.ts    → toolset/haversine.ts ❌
  ├── buildAnswer.ts      (pure)
  └── verifyAnswer.ts     → @ai-devs/ai-devs-hub
```

### S01E03

```
main.ts
  ├── sessionStore.ts
  ├── sessionLogger.ts
  ├── handleRequest.ts
  │     ├── agentLoop.ts  → packages/ai-core (relative) ❌
  │     ├── tools.ts      → packages/ai-core (relative) ❌
  │     └── systemPrompt.ts
  └── sendAnswer          → packages/ai-devs-hub (relative) ❌
```

### S01E04

```
main.ts
  ├── loadDocs.ts         (fetch → hub.ag3nts.org, zapis → resources/)
  ├── extractRouteCode.ts (OpenAI direct, gpt-5-mini Vision)
  ├── buildDeclaration.ts (pure)
  └── verifyAnswer.ts     → @ai-devs/ai-devs-hub
```

---

## 5. Cross-episode data flow

```
S01E01  ──saveFinalAnswer──►  answers/final/S01E01-people.json
                                    │
                                    │  loadFinalAnswer() [zalecane]
                                    │  fs.readFileSync()  [obecne w S01E02]
                                    ▼
                              S01E02 loadSuspects
```

---

## 6. Naruszenia architektury (skrót)

| Epizod | Moduł | Naruszenie |
|--------|-------|------------|
| S01E02 | loadSuspects.ts | Cross-episode: fs zamiast loadFinalAnswer() |
| S01E02 | findNearPlant.ts | Import z toolset (deprecated) |
| S01E03 | main.ts | Relative import do packages zamiast @ai-devs/ai-devs-hub |
| S01E03 | agentLoop.ts | Relative import do packages zamiast @ai-devs/ai-core |
| S01E03 | tools.ts | Relative import do packages zamiast @ai-devs/ai-core |

---

## 7. Zgodne wzorce

- **main.ts = orkiestracja** — S01E01, S01E02, S01E03, S01E04
- **Jeden moduł = jedna funkcja** — wszystkie epizody
- **LLM w osobnym module** — S01E01 (classifyJobs), S01E03 (agentLoop), S01E04 (extractRouteCode)
- **Czyste funkcje** — filterCandidates, buildAnswer (E01,E02), buildDeclaration (E04)
- **saveTmpAnswer / saveFinalAnswer** — E01, E02, E04
- **Modele z listy** — gpt-5-mini (E01, E03, E04)
- **Komentarz modeli w main.ts** — E01, E03, E04

---

*Dokument wygenerowany na podstawie analizy kodu w lessons/ts/S01/E01–E04.*
