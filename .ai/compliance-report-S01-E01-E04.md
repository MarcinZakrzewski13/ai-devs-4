# Raport zgodności realizacji S01E01–S01E04 z założeniami projektu

**Data:** 2025-03-15  
**Źródła:** `.ai/rules/general.md`, `.ai/architecture.md`, `CLAUDE.md`

---

## 1. Podsumowanie

| Epizod | Zgodność | Krytyczne naruszenia |
|--------|----------|------------------------|
| S01E01 | ✅ Wysoka | 0 |
| S01E02 | ⚠️ Średnia | 2 |
| S01E03 | ⚠️ Średnia | 2 |
| S01E04 | ✅ Wysoka | 0 |

---

## 2. Szczegółowa analiza

### S01E01 (people) — ✅ Zgodny

| Wymaganie | Status | Uwagi |
|-----------|--------|-------|
| `main.ts` = orkiestracja, zero logiki biznesowej | ✅ | Import kroków, wywołanie w kolejności |
| Każdy moduł = jedna funkcja, jedna rzecz | ✅ | loadPeople, filterCandidates, classifyJobs, buildAnswer, verifyAnswer |
| Czyste funkcje (filtracja, transformacja) | ✅ | filterCandidates, buildAnswer — bez efektów ubocznych |
| LLM izolowany w osobnym module | ✅ | classifyJobs.ts |
| Typy w types.ts | ✅ | PersonRecord, JobTag, PersonAnswer |
| Import z @ai-devs/ai-devs-hub | ✅ | verifyAnswer.ts |
| saveTmpAnswer / saveFinalAnswer | ✅ | Przed wysłaniem i po fladze |
| Komentarz modeli w main.ts | ✅ | gpt-5-mini |
| Model z listy dozwolonych | ✅ | gpt-5-mini |
| Użycie @ai-devs/ai-core | ⚠️ Brak | classifyJobs używa surowego OpenAI — dopuszczalne dla wczesnego zadania |

---

### S01E02 (findhim) — ⚠️ Naruszenia

| Wymaganie | Status | Uwagi |
|-----------|--------|-------|
| `main.ts` = orkiestracja | ⚠️ | Zawiera logikę `reduce` dla best candidate — można wyekstrahować |
| Import z @ai-devs/*, NIE z toolset | ❌ | **findNearPlant.ts** importuje `haversineDistanceKm` z `../../toolset/haversine.ts` |
| Cross-episode: loadFinalAnswer(), nie fs | ❌ | **loadSuspects.ts** ładuje S01E01 przez `fs.readFileSync(answers/final/...)` zamiast `loadFinalAnswer("S01E01", "people")` |
| verifyAnswer z @ai-devs/ai-devs-hub | ✅ | |
| Brak LLM | ✅ | Zadanie deterministyczne (API + Haversine) |

**Rekomendacje:**
1. Zamienić `loadSuspects` na użycie `loadFinalAnswer("S01E01", "people")` z @ai-devs/ai-devs-hub.
2. Przenieść `haversineDistanceKm` do `packages/ai-core` (np. `ai-core/utils/`) lub dodać pakiet `@ai-devs/geo-utils`, następnie importować stamtąd.

---

### S01E03 (proxy) — ⚠️ Naruszenia

| Wymaganie | Status | Uwagi |
|-----------|--------|-------|
| Wzorzec modułów HTTP | ✅ | types, sessionStore, sessionLogger, packageApi, tools, systemPrompt, agentLoop, handleRequest, main |
| Import z @ai-devs/* | ❌ | **main.ts**: `../../../../packages/ai-devs-hub/verify.ts` zamiast `@ai-devs/ai-devs-hub` |
| | ❌ | **agentLoop.ts**: `../../../../packages/ai-core/model/openai.ts` zamiast `@ai-devs/ai-core` |
| | ❌ | **tools.ts**: `../../../../packages/ai-core/tools/tool.ts` zamiast `@ai-devs/ai-core` |
| Session logging | ✅ | sessions/S01E03-YYYYMMDD-HHMM/ |
| Detekcja flag | ✅ | handleRequest skanuje {FLG:...} |
| Rejestracja endpointu | ✅ | sendAnswer("proxy", { url, sessionID }) |
| Komentarz modeli | ✅ | gpt-5-mini |
| Model z listy | ✅ | gpt-5-mini |

**Rekomendacje:**
1. Zamienić wszystkie importy względne na aliasy:
   - `import { sendAnswer } from "@ai-devs/ai-devs-hub"`
   - `import { createOpenAIProvider } from "@ai-devs/ai-core"`
   - `import type { AiTool } from "@ai-devs/ai-core"; import { toolOk, toolErr } from "@ai-devs/ai-core"`

---

### S01E04 (sendit) — ✅ Zgodny

| Wymaganie | Status | Uwagi |
|-----------|--------|-------|
| `main.ts` = orkiestracja | ✅ | |
| Moduły: loadDocs, extractRouteCode, buildDeclaration, verifyAnswer | ✅ | |
| Czyste funkcje | ✅ | buildDeclaration — zero efektów ubocznych |
| LLM izolowany | ✅ | extractRouteCode.ts (Vision) |
| Import z @ai-devs/ai-devs-hub | ✅ | verifyAnswer.ts |
| Dokumentacja w resources | ✅ | loadDocs zapisuje do lessons/ts/resources/ |
| Komentarz modeli | ✅ | gpt-5-mini (Vision) |
| Model z listy | ✅ | gpt-5-mini |
| Użycie @ai-devs/ai-core | ⚠️ Brak | extractRouteCode używa surowego OpenAI — spójne z S01E01 |

---

## 3. Wspólne obserwacje

1. **S01E01 i S01E04** używają bezpośrednio klienta OpenAI zamiast `@ai-devs/ai-core` (ModelProvider). Architektura zaleca ai-core; można stopniowo migrować.
2. **toolset** jest deprecated — S01E02 nie powinien z niego importować.
3. **Cross-episode** — reguła jest jasna: `loadFinalAnswer()`, nie `fs`.
4. **Ścieżki względne do packages/** — nieużywane w nowych zadaniach; preferowane aliasy `@ai-devs/*`.

---

## 4. Struktura zależności projektu (do przekazania architektowi)

Plik: `dependency-structure-S01-E01-E04.md` (osobny dokument).
