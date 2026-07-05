# Plan: S05E02 — Phonecall (agent głosowy do operatora)

> **STATUS: ZALICZONE.** Flaga `{FLG:CANYOUHEARME}` uzyskana 2026-07-05. Szczegóły rozwiązania: `solution.md`.


> **Fresh-context pickup:** ten plik jest self-contained. Przed pracą przeczytaj: `lessons/ts/S05/E02/task.md`, `lessons/txt/S05/s05e02-zestaw-narzedzi-1775625284.md`, `CLAUDE.md`, `.ai/architecture.md` (sekcje „Dozwolone modele", „Pliki tymczasowe", „Szacunek kosztów", „Learning Goals"), `.ai/rules/general.md`. Plan **do zatwierdzenia** przez użytkownika.

---

## 1. Kontekst zadania

**Nazwa:** `phonecall`. Endpoint: `https://hub.ag3nts.org/verify`.

Symulowana rozmowa telefoniczna z operatorem systemu OKO. Cel narracyjny (fabuła): dowiedzieć się, która z trzech dróg (`RD224`, `RD472`, `RD820`) jest **przejezdna** i uzyskać wyłączenie monitoringu na tej drodze, tak aby przemyt większej grupy ludzi do "Syjonu" nie wywołał alarmu.

### Protokół z Hubem
- **Start sesji** (tylko raz, restart = full reset):
  ```json
  { "apikey": "...", "task": "phonecall", "answer": { "action": "start" } }
  ```
- **Każdy kolejny krok** = pojedyncze nagranie MP3 (preferowany format) w Base64:
  ```json
  { "apikey": "...", "task": "phonecall", "answer": { "audio": "<base64>" } }
  ```
- Odpowiedzi operatora wracają jako audio (Base64 w polu odpowiedzi Huba — dokładna nazwa pola do potwierdzenia po pierwszej rundzie).
- **Timeout sesji** — po `start` mamy ograniczony czas, żadnych zbędnych opóźnień.
- Sfailowana rozmowa = ponowny `start` i całość od zera.

### Twarde reguły dialogu (z task.md)
1. Rozmowa **wyłącznie po polsku**.
2. Przedstaw się jako **Tymon Gajewski** — pierwsza wiadomość.
3. **W jednej wiadomości** zapytaj o status **wszystkich trzech dróg** (`RD224`, `RD472`, `RD820`) **oraz** dodaj kontekst: „transport organizowany do jednej z baz Zygfryda".
4. Poproś o **wyłączenie monitoringu** wyłącznie na drogach, które operator uzna za przejezdne.
5. **Hasło operatorów: `BARBAKAN`** — użyć, gdy operator zażąda potwierdzenia tożsamości / autoryzacji.
6. **Uzasadnienie wyłączenia monitoringu** (jeśli pyta): „transport żywności do tajnej bazy Zygfryda, lokalizacja utajniona, misja nie może zostać zalogowana".
7. Komunikaty krótkie i sensowne — **nie kumulować** próśb w jednym audio (poza wyjątkiem #3, który jest wymuszony przez zadanie).

### Warunek sukcesu
Podczas **jednej** rozmowy: ustalić przejezdną drogę → poprosić o jej odblokowanie → operator skutecznie odblokuje. Centrala odsyła flagę.

---

## 2. Sens dydaktyczny (dlaczego robimy to tak, a nie inaczej)

Zgodnie z `.ai/rules/general.md` → **Learning Goals**: LLM jako **centralny element decyzyjny**, nawet gdyby dało się zaskryptować dialog "twardo". Robimy z tego mini-agenta konwersacyjnego, żeby:

- Nauczyć się **pipeline'u S2T ↔ LLM ↔ TTS** (klasyczny stack z lekcji, sekcja „Speech to Text / Text to Speech").
- Zaprojektować **agenta prowadzącego dialog** z jasnym systemowym promptem, hard-constraintami (persona, hasło, sekwencja) i "guardrailami" (nie wypowiadaj hasła przed prośbą, nie ujawniaj lokalizacji bazy).
- Poćwiczyć **stan konwersacji** (co już powiedziano, jakie fakty operator ujawnił, na jakim etapie protokołu jesteśmy) — LLM decyduje o następnym ruchu na podstawie stanu + transkryptu.
- Zbudować **strukturalny wyciąg** (Structured Output) ze statusów dróg z tekstu operatora — klasyczne zadanie ekstrakcji.

Nie celujemy w 100% deterministyczny automat. Deterministyczna jest tylko: sekwencja I/O z Hubem, zapisy tmp, ekstrakcja statusów przez Structured Output. Decyzję "co powiedzieć następnym audio" podejmuje LLM.

---

## 3. Ustalenia (potwierdzone przez właściciela — 2026-07-05)

| # | Decyzja | Wybór |
|---|---|---|
| 3.1 | Model TTS | **`gpt-4o-mini-tts`** — dopisany do `.ai/architecture.md` sekcja „Modele audio (Text-to-Speech)" |
| 3.2 | Strategia dialogu | **B — hybryda**: pierwsza wypowiedź szablonowa (przedstawienie + 3 drogi + kontekst), kolejne = agent LLM reaktywnie wg fazy |
| 3.3 | Cost cap | **$2.00** — abort + dump `tmp/cost-breakdown.json` po przekroczeniu |
| 3.4 | Auto-restart przy fail-conversation | **N=4** próby; każda próba → własny katalog `tmp/attempt-N/` z transkryptami i audio |
| 3.5 | Persystencja audio | Każda tura in/out zapisywana do `lessons/ts/resources/S05E02/tmp/attempt-N/` — nigdy nie usuwać (feedback rule) |

---

## 4. Architektura rozwiązania (ADR-001 compliant)

Katalog: `lessons/ts/S05/E02/`. Tmp: `lessons/ts/resources/S05E02/tmp/`.

```
S05/E02/
├── main.ts               # orkiestracja: start → pętla dialogu → sukces/fail
├── types.ts              # ConversationState, RoadStatus, TurnResult, HubResponse
├── hubClient.ts          # POST /verify: sendStart(), sendAudio(b64)
├── transcribe.ts         # whisper-1 (reuse wzorca z S05E01/analyzeAudio.ts)
├── synthesize.ts         # TTS: text → MP3 buffer → Base64 (model do zatwierdzenia)
├── persistAudio.ts       # zapisz każde audio (in/out) do tmp/turn-N-{in,out}.mp3
├── extractRoadStatuses.ts# Structured Output: transkrypt → { RD224, RD472, RD820: passable? note }
├── agent.ts              # LLM: decyduje treść kolejnej wypowiedzi (system prompt + state + history)
├── stateMachine.ts       # deterministyczny szkielet etapów (INTRO → ASK_ROADS → AUTH → REQUEST_DISABLE → CONFIRM)
├── runConversation.ts    # pojedyncza próba: pętla { transcribe → decide → synthesize → send }
├── costGuard.ts          # kumulatywny licznik z limitem $1.00 (wzór z S05E01)
├── verifyAnswer.ts       # sanity check finalnej odpowiedzi Huba (flaga w komunikacie)
├── analysis-tools/       # (opc.) sniffery pierwszych odpowiedzi Huba, testy TTS PL
├── plan.md               # ← ten plik
├── solution.md           # PO ZALICZENIU
└── task.md
```

**Zasady:**
- `main.ts` = tylko import + wywołanie kroków, zero logiki.
- `agent.ts` — jedyne miejsce z systemowym promptem persony Tymona; **hard-coded fakty** (persona, hasło, uzasadnienia) w prompt-asset (`packages/ai-core/prompts` jeśli sensowne, inaczej w `agent.ts`).
- `stateMachine.ts` — enum `Phase` + transition table; agent czyta phase jako context, ale to LLM decyduje o wypowiedzi.
- Wszystkie moduły oprócz `agent.ts`, `transcribe.ts`, `synthesize.ts` = czyste funkcje.

---

## 5. Stan konwersacji (model danych)

```ts
type Phase =
  | "AWAIT_START"        // przed POST action:start
  | "OPEN_LINE"          // sesja zestawiona, hub NIE wysyła audio operatora — my inicjujemy
  | "INTRO_SENT"         // wysłaliśmy krótkie przedstawienie (Tymon Gajewski)
  | "IDENTITY_CONFIRMED" // hub: code=120, message="Identity confirmed."; operator pyta „W jakiej sprawie dzwonisz?"
  | "PURPOSE_SENT"       // wysłaliśmy pakiet Zygfryd + 3 drogi (RD224/RD472/RD820)
  | "STATUSES_RECEIVED"  // znamy status RD224/RD472/RD820
  | "AUTH_CHALLENGED"    // operator poprosił o hasło (spodziewane przy prośbie o wyłączenie monitoringu)
  | "AUTH_CONFIRMED"     // odpowiedzieliśmy BARBAKAN, operator zaakceptował
  | "DISABLE_REQUESTED"  // poprosiliśmy o wyłączenie monitoringu na przejezdnej drodze
  | "REASON_ASKED"       // operator dopytuje po co
  | "REASON_GIVEN"       // podaliśmy legendę (żywność, tajne, bez logów)
  | "SUCCESS" | "FAIL";

type RoadStatus = "PASSABLE" | "BLOCKED" | "UNKNOWN";

type ConversationState = {
  phase: Phase;
  turns: Array<{ role: "operator" | "tymon"; text: string; audioPath: string }>;
  roadStatuses: Record<"RD224" | "RD472" | "RD820", RoadStatus>;
  passwordSpoken: boolean;
  reasonSpoken: boolean;
  attemptId: number;
  cost: number;
};
```

Extraction schema (Structured Output, `gpt-5-mini`):
```json
{
  "type": "object",
  "required": ["RD224", "RD472", "RD820"],
  "properties": {
    "RD224": { "type": "string", "enum": ["PASSABLE", "BLOCKED", "UNKNOWN"] },
    "RD472": { "type": "string", "enum": ["PASSABLE", "BLOCKED", "UNKNOWN"] },
    "RD820": { "type": "string", "enum": ["PASSABLE", "BLOCKED", "UNKNOWN"] },
    "notes":  { "type": "string" }
  }
}
```

---

## 6. Pipeline pojedynczej próby (runConversation)

**Uwagi (M1+M2 findings):**
- `action: start` → `{code:0, message:"Phonecall session started.", msg:"...30 min...", action:"start"}`. Brak audio operatora.
- Odpowiedź na audio out → `{code, message, audio: <raw base64 MP3, ID3 header>}`. Pole = **`audio`**, raw B64 (nie data-URL).
- `code=120` + `message="Identity confirmed."` po samym przedstawieniu → identity nie wymaga hasła BARBAKAN.
- **Operator prowadzi dialog etapami** — pierwsza wypowiedź = tylko przedstawienie. Merytorykę (Zygfryd + 3 drogi) podajemy dopiero po pytaniu „W jakiej sprawie dzwonisz?".

```
1. POST { action: "start" } → response bez audio (session opened, 30 min timeout)
2. Turn 1 out — TYLKO przedstawienie (M2 finding):
   „Dzień dobry, tu Tymon Gajewski."
3. synthesize → mp3 → base64 → POST { audio } → response { code:120, message, audio:<operator> }
4. Turn 2 out — pełny pakiet (spełnia „wszystko w jednej wiadomości" z task.md):
   „W sprawie transportu organizowanego do jednej z baz Zygfryda.
    Proszę o status trzech dróg: RD224, RD472 oraz RD820."
5. loop while phase ∉ {SUCCESS, FAIL} && turn < MAX_TURNS(=10):
   a) transcribe(inbound audio, "pl") → text
   b) extractRoadStatuses jeśli phase == INTRO_SENT
   c) stateMachine.advance(state, transcript) → nextPhase + hint (co powiedzieć)
   d) agent.decide(state, transcript, phaseHint) → tekstowa odpowiedź Tymona
      - Constraint checker (deterministyczny) na tekst: brak zakazanych fraz (np. lokalizacja bazy),
        obecność wymaganych elementów (np. hasło jeśli phase == AUTH_CHALLENGED)
      - Jeśli fail → retry LLM z korektą (max 1 raz)
   e) synthesize(text) → mp3 buffer → base64
   f) persistAudio.saveOut(turn=N)
   g) POST { audio: b64 } → response
   h) parse response: sukces (flaga w message) / fail / kolejny audio
4. Zwróć result { ok, flag?, transcript, cost }
```

`main.ts` wywołuje `runConversation` w pętli do 3 prób. Sukces → `saveFinalAnswer`, log flagi do `answers/final/`.

---

## 7. System prompt agenta (draft)

Kluczowe reguły, które muszą być w prompcie:

```
Jesteś Tymonem Gajewskim. Dzwonisz do operatora systemu OKO w sprawie transportu
organizowanego do jednej z baz Zygfryda. Rozmowa telefoniczna, wyłącznie po polsku.

TWARDE ZASADY:
1. Pierwsza wypowiedź (phase=OPERATOR_GREETING): przedstaw się imieniem i nazwiskiem,
   od razu w tej samej wypowiedzi zapytaj o status trzech dróg: RD224, RD472, RD820,
   i podaj powód: transport do jednej z baz Zygfryda.
2. Hasło BARBAKAN wypowiedz WYŁĄCZNIE gdy operator poprosi o autoryzację/hasło.
3. Jeśli operator pyta po co wyłączyć monitoring: „transport żywności do tajnej bazy
   Zygfryda, lokalizacja utajniona, misja nie może być odnotowana w logach".
4. NIGDY nie wymieniaj konkretnej lokalizacji bazy, nie podawaj nazw miast.
5. Krótko, konkretnie, jedna prośba na wypowiedź (poza wypowiedzią #1).
6. Nie improwizuj poza zakresem misji.

STAN: {phase, roadStatuses, passwordSpoken, reasonSpoken}
HISTORIA: {ostatnie 6 wiadomości}
```

---

## 8. Modele i koszty (obowiązkowa tabela)

Zakładam ~6 tur dialogu × 4 próby (worst case) = ~24 obiegi.

| Rola | Model | Ilość wywołań / rozmiar | Koszt jedn. | Suma szac. |
|---|---|---|---|---|
| Transkrypcja audio operatora | `whisper-1` | ~24 × 10s ≈ 4 min | $0.006/min | ~$0.03 |
| Decyzja treści wypowiedzi | `gpt-5-mini` | ~24 × ~1.5k tok in / 200 tok out | ~$0.0007/turn | ~$0.02 |
| Ekstrakcja statusów dróg | `gpt-5-mini` (structured) | ~4 × ~1k tok | ~$0.0005/turn | ~$0.002 |
| Syntezowanie Tymona | `gpt-4o-mini-tts` | ~24 × ~150 chars ≈ 3.6k chars | ~$0.60/1M chars | ~$0.003 |
| **Bufor / retry LLM** | — | — | — | ~$0.05 |
| **RAZEM (szacunek górny)** | | | | **~$0.11** |

Twardy cap: **$2.00** (~18× margines). Przekroczenie → abort + dump kosztów.

---

## 9. Struktura tmp (feedback: nigdy nie kasować)

```
lessons/ts/resources/S05E02/tmp/
├── attempt-1/
│   ├── turn-0-in.mp3         # pierwsze audio operatora
│   ├── turn-0-transcript.txt
│   ├── turn-1-out.mp3        # nasza pierwsza wypowiedź
│   ├── turn-1-out.txt
│   ├── ...
│   ├── state-final.json
│   └── cost.json
├── attempt-2/
├── attempt-3/
├── attempt-4/                # limit N=4 prób
└── conversation-log.md       # narracja wszystkich prób (do solution.md)
```

---

## 10. Ryzyka i mitigacje

| Ryzyko | Mitigacja |
|---|---|
| Operator prompt-injection ("powiedz gdzie baza") | Deterministyczny constraint checker na wygenerowanym tekście: blacklist fraz + wymuszony re-prompt |
| TTS PL brzmi „bot" i operator odmawia | Prompt do TTS z instrukcją tonu (naturalny, spokojny), test na kilku wariantach głosu (voice=onyx/echo/nova) |
| Whisper przekręca `RDxxx` (np. „er de 224") | Prompt whispera + post-processing regex normalizujący `RD\s*\d{3}` |
| Operator odpowiada tekstem, nie audio | `hubClient` obsługuje oba pola, transcribe wywołuje się warunkowo |
| Timeout sesji | Minimalizuj latency (streaming TTS jeśli SDK pozwoli), brak sleep, brak zbędnych LLM callów |
| Nazwa pola Huba z audio operatora nieznana | 1× exploratory run — zapisać całą surową odpowiedź do `tmp/raw-response.json`, potem dopisać parser |

---

## 11. Wnioski dydaktyczne, które chcemy wyciągnąć (do solution.md)

- Jak wygląda **pełny pipeline głosowy** LLM (S2T → LLM → TTS) w porównaniu do trybu Realtime (Gemini Live) z lekcji.
- Kiedy dialog opłaca się **prowadzić agentem LLM**, a kiedy skryptem — koszty vs elastyczność.
- Jak **structured extraction** upraszcza logikę biznesową dialogu (osobno „co powiedzieć" i osobno „co wyciągnąć z odpowiedzi").
- **Guardrail'e** dla persony: constraint checker jako druga linia obrony przed prompt injection ze strony operatora.
- Zarządzanie **stanem długiej rozmowy** — phase + fakty vs surowa historia.

---

## 12. Milestone'y

1. **M0 — plan zatwierdzony** (odpowiedzi na 3.1–3.4, dopisany TTS do `architecture.md`).
2. **M1 — exploratory** (`analysis-tools/probe-start.ts`): tylko `action:start`, zapis surowej odpowiedzi, potwierdzenie nazwy pola audio operatora + formatu.
3. **M2 — pojedynczy hop happy-path**: transcribe + synthesize + odpowiedź na pierwsze audio. Test TTS PL. Bez agenta LLM, hardkodowana pierwsza wypowiedź.
4. **M3 — agent + state machine**: pełna pętla dialogu, ale bez extraction (LLM sam interpretuje).
5. **M4 — structured extraction statusów dróg** + constraint checker.
6. **M5 — pełen scenariusz z prośbą o wyłączenie + auto-restart do 3 prób**.
7. **M6 — flaga → `saveFinalAnswer` + `solution.md`** z sekcją „Wnioski z lekcji" (feedback rule).

---

## 13. Status M0

✅ Zamknięty. Ustalenia w sekcji 3. TTS dopisany do `.ai/architecture.md`. Przechodzimy do M1.

## 14. M1 — done (2026-07-05)

✅ `analysis-tools/probe-start.ts` uruchomiony. Findings: `analysis-tools/M1-findings.md`.

**Kluczowa niespodzianka:** hub NIE odsyła audio operatora po `start`. My inicjujemy dialog. Sesja: 30 min. Odpowiedź: `{code:0, message, msg, action:"start"}`. Sekcja 5 (Phase) i sekcja 6 (pipeline) zaktualizowane.

## 15. M2 — done (2026-07-05)

✅ `analysis-tools/probe-first-audio.ts` uruchomiony. Findings: `analysis-tools/M2-findings.md`.

**Kluczowe:**
- Kontrakt: `{code, message, audio: <raw B64 MP3>}`.
- `code=120` „Identity confirmed" po samym przedstawieniu.
- Operator: „W jakiej sprawie dzwonisz?" — dialog etapami, nie all-in-one.

**Konsekwencja:** Turn 1 = tylko przedstawienie. Turn 2 = pakiet merytoryczny (Zygfryd + RD224/RD472/RD820). Sekcje 5, 6 zaktualizowane.

## 16. M3 — plan

Cel: **pełen scenariusz konwersacji** (koniec-końcem) z agentem LLM. Cel dydaktyczny: zbudować i uruchomić pełny pipeline S2T → LLM decision → TTS → S2T.

Zakres:
1. Modularna struktura wg sekcji 4: `hubClient.ts`, `transcribe.ts`, `synthesize.ts`, `persistAudio.ts`, `agent.ts`, `stateMachine.ts`, `extractRoadStatuses.ts`, `runConversation.ts`, `costGuard.ts`, `main.ts`.
2. State machine wg zaktualizowanej sekcji 5 (INTRO → IDENTITY_CONFIRMED → PURPOSE_SENT → STATUSES_RECEIVED → AUTH_CHALLENGED → AUTH_CONFIRMED → DISABLE_REQUESTED → REASON_ASKED → REASON_GIVEN → SUCCESS/FAIL).
3. Agent LLM (`gpt-5-mini`) z prompt-assetem persony Tymona (sekcja 7). Constraint checker (blacklist + wymagane elementy per faza).
4. Structured extraction statusów dróg (`gpt-5-mini`, schema z sekcji 5).
5. Auto-restart do 4 prób, tmp per attempt-N.
6. `saveTmpAnswer` / `saveFinalAnswer` z Hub-a.

Cost: ~$0.11/pełen scenariusz (patrz sekcja 8). Cap: $2.00.

Wynik: zaliczenie zadania + flaga.
