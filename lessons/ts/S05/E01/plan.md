# Plan: S05E01 — Radiomonitoring

> **Fresh-context pickup:** ten plik jest self-contained. Przed pracą przeczytaj: `lessons/ts/S05/E01/task.md`, `CLAUDE.md`, `.ai/architecture.md` (sekcje „Dozwolone modele", „Pliki tymczasowe", „Szacunek kosztów"), `.ai/rules/general.md`. Plan zatwierdzony przez użytkownika.

---

## 1. Context

Zadanie **radiomonitoring** (S05E01): nasłuch radiowy z Centrali (`hub.ag3nts.org/verify`) w cyklu `start → listen × N → transmit`. Centrala zwraca mieszankę: transkrypcje tekstowe, szum radiowy, pliki binarne w Base64 z polem `meta` (MIME). Cel: ustalić o mieście „Syjon":

- `cityName` — właściwa nazwa miasta (NIE „Syjon" — to alias w eterze)
- `cityArea` — powierzchnia, dokładnie 2 miejsca po przecinku, **matematyczne zaokrąglenie** (nie truncate), format `"12.34"`
- `warehousesCount` — liczba magazynów (integer)
- `phoneNumber` — numer telefonu osoby kontaktowej

**Sens dydaktyczny** (sekcja „Praktyczna wskazówka" w task.md): nie „jeden wielki prompt", tylko **programistyczny router**, który ocenia typ materiału (tekst / szum / binarka) i **decyduje** — analiza kodem, lokalne dekodowanie, odfiltrowanie szumu, czy dopiero odpowiednio dobrany LLM. Cel: minimalizacja tokenów i kosztów. Różne modele do różnych typów danych.

### Format payloadu hub (z task.md)
```json
// start
{ "apikey": "...", "task": "radiomonitoring", "answer": { "action": "start" } }
// listen
{ "apikey": "...", "task": "radiomonitoring", "answer": { "action": "listen" } }
// transmit
{ "apikey": "...", "task": "radiomonitoring", "answer": {
    "action": "transmit",
    "cityName": "NazwaMiasta",
    "cityArea": "12.34",
    "warehousesCount": 321,
    "phoneNumber": "123456789"
}}
```

### Typy odpowiedzi listen
```json
// tekst
{ "code": 100, "message": "Signal captured.", "transcription": "fragment..." }
// binarka
{ "code": 100, "message": "Signal captured.", "meta": "application/json", "attachment": "BASE64...", "filesize": 12345 }
```

---

## 2. Ustalenia (potwierdzone z użytkownikiem)

1. **Workflow:** exploration + implementacja w jednej sesji.
2. **Audio policy:** jeśli `meta: audio/*` → **STOP pipeline**, prośba o dopisanie Whisper (np. `whisper-1`) do `architecture.md` „Dozwolone modele". Dalsza praca dopiero po zatwierdzeniu przez właściciela projektu.
3. **Cost cap:** twardy **$0.50**. Log kumulatywny po każdej LLM-call; przekroczenie → abort + zrzut `tmp/cost-breakdown.json`.

---

## 3. Analiza linków z task.md

| Link | Treść | Decyzja |
|---|---|---|
| **LiteLLM** (litellm.ai) | Gateway proxy 100+ LLM, OpenAI-compatible, cost tracking, routing, fallbacks. | NIE adoptować. Nasz `createDefaultProvider()` (OpenRouter + OpenAI fallback) wystarcza. Sygnał dydaktyczny: **multi-model routing to realny temat produkcyjny** — nasz router w S05E01 to mini-wersja. |
| **Vercel AI SDK** (ai-sdk.dev) | TS-owy SDK (generateText, streamText, tools, structured output) + multimodal (image, **speech transcription**, video gen). | NIE adoptować. Mamy `@ai-devs/ai-core`. Odnotować w `solution.md` jako alternatywa. |
| **Gemini Thought Signatures** | Zaszyfrowany stan reasoningu. Dla Gemini 3 **obowiązkowy** w multi-turn function calling (400 error bez). | NIE dotyczy tego zadania. Zapisać do pamięci jako pułapka dla przyszłych Gemini-based zadań. |
| **Claude Extended Thinking** | `signature` w blokach `thinking`; w multi-turn tool use **trzeba zwracać nietknięte**; `tool_choice: auto` lub `none` tylko. | NIE dotyczy tego pipeline. Relevantne tylko gdybyśmy wybrali `claude-sonnet-4-6` z `thinking` dla syntezy. |

**Wniosek do `solution.md`:** linki są meta-komunikatem — „routing i wybór modelu to pierwszorzędny temat inżynierski". Nasza implementacja to uproszczony LiteLLM / AI SDK pattern.

---

## 4. Miejsca ryzyka

1. **Koszt binarki** — Base64 inflate ~33%. 100 KB binary = drogo i bez sensu jeśli szum. **Decyzja przed LLM** (meta + filesize + lokalne dekodowanie).
2. **Szum** — część odpowiedzi to szum radiowy. Router odfiltrowuje taniutkim klasyfikatorem / heurystyką.
3. **„Syjon" jako alias** — `cityName` musi być rzeczywistą nazwą, nie „Syjon". Syntezator musi to rozpoznać.
4. **Zaokrąglenie `cityArea`** — `Number((Math.round(x * 100) / 100).toFixed(2))` → `.toFixed(2)` jako string. Nie `Math.floor`, nie czysty `toFixed` bez roundingu.
5. **Nieznane MIME types** — task podaje przykład `application/json`, ale pełnej listy brak. Router defensywny: nieznany typ → zapis, log, preview pierwszych bajtów, fallback `gpt-5-mini`.
6. **Audio** — jeśli `meta: audio/*` wystąpi: **STOP** (per ustalenie 2). Plan A: audio prawdopodobnie nie wystąpi, bo głos = pole `transcription`.
7. **Koniec materiału** — hub sygnalizuje wyczerpanie (`code !== 100` / specjalny message). Pętla wykrywa, nie zakłada N z góry. MAX_LISTENS=50 jako safety.
8. **Deduplikacja faktów** — wiele fragmentów może dać wielu kandydatów per pole. Synteza używa evidence aggregation (głosowanie + wiarygodność), nie last-write-wins.
9. **Persystencja raw** — każda odpowiedź `listen` trafia do `lessons/ts/resources/S05E01/tmp/` (JSONL + binarki jako pliki) → umożliwia `--replay` bez nowej sesji, audyt, debug.

---

## 5. Architektura modułów (ADR-001)

```
lessons/ts/S05/E01/
├── main.ts               # orkiestracja: start → listenLoop → synthesize → transmit
├── types.ts              # ListenResponse, Fact, FactKind, RouterDecision, FinalAnswer
├── hubSession.ts         # startSession(), listenOnce(), transmit() — wrappery na sendAnswer
├── persistRaw.ts         # save(raw) → tmp/raw-{seq}.json + tmp/bin-{seq}.{ext}
├── router.ts             # classify(raw) → { kind, meta } (text|noise|binary-json|binary-image|binary-text|binary-audio|binary-other)
├── decodeBinary.ts       # decodeBase64() + detectMime() + preview N bajtów
├── analyzeText.ts        # LLM gpt-5-nano → { isNoise, facts: Fact[] } (Structured Output)
├── analyzeBinary.ts      # dispatcher per meta: JSON→parse, image→vision mini, text→nano, inne→mini
├── extractFacts.ts       # wspólny schemat Fact + Structured Output
├── factStore.ts          # FactStore: append(fact), dump(), aggregate() → kandydaci per pole
├── synthesize.ts         # LLM gpt-5-mini: FactStore → FinalAnswer (Structured Output)
├── formatArea.ts         # roundTo2dp(x) → "12.34"
├── costGuard.ts          # akumulator kosztów + abort przy $0.50
├── listenLoop.ts         # pętla: while(!done) { raw = listenOnce; persist; decision = route; dispatch }
├── verifyAnswer.ts       # transmit() + saveFinalAnswer
├── solution.md           # po zakończeniu
└── analysis-tools/
    ├── explore-session.ts    # iter. 1: zapis raw bez LLM
    └── dry-synthesize.ts     # iter. 2: synteza z cached tmp/ bez transmit
```

**Patterns do reużycia:**
- `lessons/ts/S04/E04/extractData.ts` — Structured Output + cache w tmp/
- `lessons/ts/S02/E05/analyze-map.ts` — base64 image → multimodal `image_url: data:...`
- `lessons/ts/S03/E01/` — hybryda det+LLM + deduplikacja
- `lessons/ts/S04/E05/agentLoop.ts` — szablon orkiestracji (adapt, u nas pipeline nie agent)

---

## 6. Przepływ danych

```
start ─▶ hub ack
        │
        ▼
listen ─┬─ transcription (text) ──▶ analyzeText (nano) ──▶ facts
        │                           └─ isNoise=true ──▶ drop
        │
        ├─ attachment + meta ──▶ decodeBinary ──▶ router.binary
        │       ├─ application/json  ──▶ JSON.parse → map deterministycznie (LLM tylko gdy niejasne)
        │       ├─ text/*            ──▶ utf8 → analyzeText (nano)
        │       ├─ image/*  <200KB   ──▶ vision (mini) w data:image/...
        │       ├─ image/* ≥200KB    ──▶ log + skip (manual decyzja po logach)
        │       ├─ audio/*           ──▶ STOP pipeline, prośba o Whisper
        │       └─ inne              ──▶ preview 500B → mini „relevant?"
        │
        └─ code ≠ 100 / end message ──▶ break

FactStore.aggregate() ──▶ synthesize (mini) ──▶ FinalAnswer
  { cityName, cityArea (number → formatArea → "12.34"), warehousesCount, phoneNumber }
        │
        ▼
transmit ──▶ flag
```

---

## 7. Strategia routera (tabela decyzyjna)

| Wejście | Warunek | Akcja | Model |
|---|---|---|---|
| `transcription` obecne, len < 15 | szum/ramowka | drop | — |
| `transcription` obecne, len ≥ 15 | tekst | klasyfikuj + ekstrakcja faktów | gpt-5-nano (Structured Output) |
| `attachment` + `meta: application/json` | strukturalne | `JSON.parse(base64decode)` → map | — (LLM tylko gdy struktura nieznana: mini) |
| `attachment` + `meta: text/*` | tekst encoded | base64→utf8 → analyzeText | gpt-5-nano |
| `attachment` + `meta: image/*` + filesize<200KB | obraz mały | vision z `data:image/...` | gpt-5-mini (vision) |
| `attachment` + `meta: image/*` + filesize≥200KB | obraz duży | zapis, metadata only, NIE do LLM | — |
| `attachment` + `meta: audio/*` | audio | **STOP** + alert „Whisper required" | — |
| `attachment` + inne | nieznane | preview 500B → mini „relevant?" | gpt-5-mini |
| `code ≠ 100` / end | koniec sesji | break pętli | — |

**Reguła:** tekst input > 4000 znaków → streszczenie (nano) zamiast raw do syntezy.

---

## 8. Szacunek kosztów

| Operacja | Ilość (pesymistycznie) | Model | Koszt szac. |
|---|---|---|---|
| start + listen + transmit (HTTP) | ~30 | — | $0.00 |
| Klasyfikacja szum/tekst | ~25 | gpt-5-nano | ~$0.0025 |
| Ekstrakcja faktów z tekstu | ~10 | gpt-5-nano | ~$0.0015 |
| Binarka text | ~3 | gpt-5-nano | ~$0.0005 |
| Binarka JSON fallback | ~1 | gpt-5-mini | ~$0.0015 |
| Vision (małe obrazy) | ~2 | gpt-5-mini | ~$0.006 |
| Synteza finalna | 1 | gpt-5-mini | ~$0.003 |
| Retry +20% | — | — | +$0.003 |
| **Łącznie** | | | **≈ $0.02** |

**Hard cap: $0.50**, abort + zrzut `tmp/cost-breakdown.json`.

---

## 9. Modele

```typescript
// Modele użyte w zadaniu:
//   - gpt-5-nano → klasyfikacja szum/tekst + ekstrakcja prostych faktów (Structured Output)
//   - gpt-5-mini → analiza binarek niejednoznacznych, vision dla małych obrazów, finalna synteza (Structured Output)
```

Rezerwa: `gpt-5` tylko gdy synteza zwróci sprzeczne fakty (fallback retry, 1×).

---

## 10. Plan pracy (1 sesja, 3 iteracje)

### Iteracja 1 — exploration (bez LLM)
`analysis-tools/explore-session.ts`:
- start → listen loop (max 50) → zapis każdej odpowiedzi do `lessons/ts/resources/S05E01/tmp/`:
  - JSONL `raw-log.jsonl` (każda odpowiedź 1 linia + metadane: seq, timestamp, kind-hint)
  - Binarki dekodowane do osobnych plików `bin-{seq}.{ext-z-MIME}`
- **Audio gate:** pierwsze `meta: audio/*` → log alert, zapis, abort pętli, STOP implementacji, prośba do właściciela o dodanie `whisper-1` do `.ai/architecture.md` „Dozwolone modele" → **czekać na zatwierdzenie**.
- Raport: liczba tekstów, liczba binarek per meta, avg/max filesize, sample każdej kategorii.

### Iteracja 2 — pełna implementacja + transmit
- Moduły wg sekcji 5, dopasowane do realnych MIME z iter. 1.
- Tryb `--replay`: router działa na cache JSONL z iter. 1 (bez nowej sesji) → dry-run syntezy.
- Jedna nowa sesja hub dla produkcyjnego transmit (hub raczej nie pozwoli re-listen tej samej sesji).
- Jedna próba `transmit`.

### Iteracja 3 — poprawka (jeśli `code < 0`)
- Hub zwróci precyzyjny powód. Reaguj punktowo:
  - „cityArea nie ma 2 dp" → fix `formatArea.ts`
  - „cityName = Syjon" → retune `synthesize.ts` prompt („NIE używaj aliasu Syjon, znajdź prawdziwą nazwę w transkrypcjach")
  - Błędne phoneNumber → walidacja regex `/^\d{9}$/` lub normalizacja (usuwanie spacji/myślników)
  - Niezgodny warehousesCount → ręczny przegląd `FactStore.dump()`

---

## 11. Krytyczne pliki do reużycia

- `packages/ai-devs-hub/verify.ts` — `sendAnswer(task, answer)` dla start/listen/transmit
- `packages/ai-devs-hub/answer-store.ts` — `saveTmpAnswer`, `saveFinalAnswer`
- `packages/ai-core/model/provider.ts` + `types.ts` — `createDefaultProvider()`, `MessageContent`, `ImageContentPart`
- `packages/ai-core/model/schema.ts` — `buildStrictSchema`, `objectSchema`, `enumSchema`
- `packages/ai-core/obs/` — `logger`, `EventBus`, `createRunReporter` (dla cost tracking)
- `lessons/ts/S04/E04/extractData.ts` — wzór Structured Output + cache
- `lessons/ts/S02/E05/analyze-map.ts` — wzór base64 + vision multimodal
- `lessons/ts/S03/E01/` — wzór hybrydy det+LLM z deduplikacją

---

## 12. Weryfikacja (end-to-end)

1. `bun run lessons/ts/S05/E01/analysis-tools/explore-session.ts` → sprawdź `lessons/ts/resources/S05E01/tmp/` → potwierdź typy MIME + brak `audio/*`.
2. `bun run lessons/ts/S05/E01/analysis-tools/dry-synthesize.ts` → `FinalAnswer` bez transmit, manualny review.
3. Assert `cityArea`: regex `/^\d+\.\d{2}$/` przed transmit.
4. `bun run lessons/ts/S05/E01/main.ts` → flag w `answers/final/S05E01-radiomonitoring.json`.
5. Koszty: suma tokenów per model (EventBus + RunReporter), zapisane w tmp/cost-breakdown.json.
6. `solution.md` wg szablonu z `.ai/architecture.md` sekcja „Dokumentacja rozwiązania". Wnioski z lekcji: routing, multi-model dispatch, Base64 economy, noise filtering, fact aggregation.

---

## 13. Środowisko

- Runtime: **Bun** (nie npm/node)
- Wejście: `.env` zawiera `API_KEY_AI_DEVS4`, `OPENAI_API_KEY`, `OPEN_ROUTER_API_KEY`
- Startup banner: wg wzorca `.ai/architecture.md` „Startup output" (BORDER, step/done z chalk)
- Konwencje kolorów: warstwa procesowania żywe, techniczna stonowana (szczegóły w architecture.md)
