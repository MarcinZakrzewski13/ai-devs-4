# Refactor 00 — Global: ai-core fixes + @ai-devs/geo-utils package

**Prereq:** None (this is the first step)
**Blocks:** refactor-S01E02, refactor-S01E01, refactor-S01E04

---

## Cel

Naprawić 3 globalne problemy w `packages/`:
1. `DEFAULT_MODEL = "gpt-4o-mini"` — zakazany model
2. `Message.content: string` — brak obsługi multimodal/Vision
3. Brak pakietu `@ai-devs/geo-utils` — haversine żyje w deprecated `toolset/`

---

## Zmiana 1: DEFAULT_MODEL w ai-core

**Plik:** `packages/ai-core/model/openai.ts:13`

**Obecny kod:**
```typescript
const DEFAULT_MODEL = "gpt-4o-mini";
```

**Nowy kod:**
```typescript
const DEFAULT_MODEL = "gpt-5-mini";
```

**Uzasadnienie:** `gpt-4o-mini` jest na liście zakazanych modeli (`.ai/architecture.md` → "Dozwolone modele OpenAI"). Domyślny model to `gpt-5-mini`.

---

## Zmiana 2: Multimodal Message type

**Plik:** `packages/ai-core/model/types.ts`

**Obecny typ:**
```typescript
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};
```

**Nowy typ — obsługa multimodal (Vision):**
```typescript
/** Single text part in a multimodal message. */
export type TextContentPart = {
  type: "text";
  text: string;
};

/** Image passed as base64 data URL or remote URL. */
export type ImageContentPart = {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" };
};

/** Content can be plain string (text-only) or array of parts (multimodal). */
export type MessageContent = string | Array<TextContentPart | ImageContentPart>;

export type Message = {
  role: "system" | "user" | "assistant";
  content: MessageContent;
};
```

**Uzasadnienie:** Wszystkie dozwolone modele obsługują Vision. Typ `content: string` uniemożliwia przekazanie obrazów przez `generateStructured()` / `generateText()`. Nowy typ jest union — `string` nadal działa bez zmian w istniejącym kodzie.

**Uwaga:** Ponieważ OpenAI SDK akceptuje zarówno `string` jak i `Array<ContentPart>`, implementacja `openai.ts` **nie wymaga zmian** — `messages` są przekazywane do `client.chat.completions.create()` as-is. Typ służy jedynie do bezpieczeństwa typu po stronie wywołującego.

---

## Zmiana 3: Nowy pakiet @ai-devs/geo-utils

### 3a. Utwórz pakiet

**Nowy plik:** `packages/geo-utils/package.json`
```json
{
  "name": "@ai-devs/geo-utils",
  "version": "0.1.0",
  "type": "module",
  "main": "index.ts"
}
```

**Nowy plik:** `packages/geo-utils/index.ts`
```typescript
export { haversineDistanceKm } from "./haversine.ts";
```

**Nowy plik:** `packages/geo-utils/haversine.ts`
Skopiuj zawartość z `lessons/ts/toolset/haversine.ts` (bez zmian):
```typescript
/**
 * Haversine distance between two points on Earth (in km).
 * @see https://en.wikipedia.org/wiki/Haversine_formula
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

### 3b. Zarejestruj w tsconfig.json

**Plik:** `tsconfig.json` → `compilerOptions.paths`

**Dodaj:**
```json
"@ai-devs/geo-utils": ["./packages/geo-utils/index.ts"],
"@ai-devs/geo-utils/*": ["./packages/geo-utils/*"]
```

### 3c. Workspaces

**Plik:** `package.json`

Workspaces już mają `"packages/*"` — nowy katalog `packages/geo-utils/` będzie wykryty automatycznie. Wystarczy `bun install` po utworzeniu pakietu.

---

## Weryfikacja

```bash
# Model check
grep -rn "gpt-4o" packages/                     # → zero results

# Message type check
grep -n "MessageContent" packages/ai-core/model/types.ts  # → found

# Geo-utils package
bun run -e "import { haversineDistanceKm } from '@ai-devs/geo-utils'; console.log(haversineDistanceKm(54.35, 18.65, 54.83, 18.33))"
# → ~55.xx km (Gdańsk → Żarnowiec approx)
```

---

## Kolejność wykonania

1. Zmiana 1 (DEFAULT_MODEL) — jednolinijkowa
2. Zmiana 2 (Message type) — rozszerzenie typu
3. Zmiana 3 (geo-utils) — nowy pakiet + `bun install`
