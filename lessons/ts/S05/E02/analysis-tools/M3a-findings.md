# M3a — Findings (pełny pipeline, single attempt → auto-restart × 4)

**Data:** 2026-07-05

## Co działa

1. **Pipeline S2T → LLM → TTS → Hub** — end-to-end. Wszystkie moduły integrują się poprawnie.
2. **`whisper-1`** — transkrypcja PL audio operatora bezbłędna, w tym kody `RD-472`, `RD-820`.
3. **`gpt-4o-mini-tts` voice=`onyx`** — TTS PL akceptowalne. Hub whisperuje nasze audio i poprawnie odczytuje kody dróg.
4. **`gpt-5-mini` agent LLM** — generuje wypowiedzi zgodne z hintem state machine.
5. **Structured extraction (`gpt-5-mini`)** — poprawnie wyciąga statusy dróg z tekstu operatora (`RD224=BLOCKED`, `RD472=BLOCKED`, `RD820=PASSABLE`).
6. **State machine** — poprawne przejścia `OPEN_LINE → IDENTITY_CONFIRMED → STATUSES_RECEIVED`.
7. **Auto-restart × 4** + delay 5s między próbami.
8. **Non-JSON retry** — hub czasem odbija HTML (Cloudflare); retry z backoffem 3s, 6s, 9s.
9. **Cost guard** — kumulatywnie, cap $2.00, ~$0.005-0.02 per pełen run.

## Kody odpowiedzi hub

| Code | Message | Znaczenie |
|---|---|---|
| 0 / 110 | Phonecall session started. | Sesja otwarta (30 min) |
| 120 | Identity confirmed. | Tożsamość Tymona potwierdzona po samym przedstawieniu |
| 150 | Road status delivered. | Statusy 3 dróg dostarczone (po BARBAKAN + Zygfryd + drogi) |
| -790/-810/-820 | Mowisz w bardzo dziwny sposob... | Podejrzenie bota — sesja spalona |
| -771 | Rozmowa spalona - musisz zadzwonić ponownie. | Fatal, wymaga `start` |

## Sprawdzone szablony wypowiedzi

| Faza | Wypowiedź | Wynik |
|---|---|---|
| OPEN_LINE | "Dzień dobry, tu Tymon Gajewski." | ✅ 120 |
| OPEN_LINE | "Cześć, tu Tymon Gajewski." | ✅ 120 |
| OPEN_LINE | "Halo, tu Tymon Gajewski." | ✅ 120 |
| OPEN_LINE | "Hej, tu Tymon Gajewski." | ✅ 120 |
| OPEN_LINE | "Hej, Tymon Gajewski z tej strony." | ⚠️ czasem -820 |
| OPEN_LINE | "Słuchaj, tu Tymon Gajewski." | ✅ 120 |
| IDENTITY_CONFIRMED | "Hasło BARBAKAN. Słuchaj, dzwonię w sprawie transportu do jednej z baz Zygfryda — możesz sprawdzić status dróg RD224, RD472 i RD820?" | ~30% ✅ 150, 70% ❌ -810 |
| STATUSES_RECEIVED | "Wiesz co, proszę wyłączyć monitoring na drodze RD820." | ❌ -790 |
| STATUSES_RECEIVED | "Wiesz co, możesz proszę wyłączyć monitoring na drodze RD820?" | ❌ -790 |

## Kluczowe obserwacje

1. **Hub jest niedeterministyczny** — ta sama wypowiedź (identyczny tekst, identyczny TTS setup) daje różne wyniki w kolejnych uruchomieniach.
2. **Prawdopodobna hipoteza**: hub prowadzi state per `apikey`; wiele fails w krótkim czasie → hub staje się bardziej podejrzliwy. Wcześniejsze uruchomienia miały ~30-50% success przechodząc do `STATUSES_RECEIVED`, ostatnie 0%.
3. **BARBAKAN + Zygfryd + drogi** to poprawna kombinacja (potwierdzone `code=150` w kilku próbach).
4. **Prośba o wyłączenie monitoringu** — jak dotąd 0% (fail przy każdym testowanym wariancie).

## Bugi naprawione podczas M3a

- Fatal fail na `code !== 0` po `start` — hub zwraca zmienne kody startowe (0, 110). Poprawka: nie fail-fast na code, tylko na `message` bez "started".
- Regex `RD\s*\d+` nie łapał `RD-472` (myślnik). Poprawka: `RD[\s-]*\d+`.
- Sanitize zamieniał em-dash na kropkę → mała litera po kropce = gramatyka boli. Poprawka: sanitize nie zamienia em-dash.
- Extract dróg trigger tylko w `PURPOSE_SENT`. Poprawka: trigger też na wzmiance `RD\d+` w tekście operatora niezależnie od fazy.
- State machine miał redundantne fazy `INTRO_SENT`/`PURPOSE_SENT`. Uproszczono do 6 głównych faz.

## Otwarte problemy

- **P1: fail-rate BARBAKAN+Zygfryd+drogi** — nawet identyczna wypowiedź zawodzi w >70% prób. Możliwe źródła:
  - TTS niedeterministyczny (audio bit-po-bicie), hub karze konkretne charakterystyki audio.
  - Hub `apikey`-side blocklist po serii fails.
- **P2: brak zwycięskiej wypowiedzi w STATUSES_RECEIVED**. Nie odkryto formy prośby o wyłączenie monitoringu, którą operator akceptuje. Brak pełnego przejścia do SUCCESS w żadnej próbie.

## Rekomendacja na M3b

1. **Cooldown 15-30 min** i ponowna próba (odczekać, aż hub „ochłonie" po serii fails).
2. **Dywersyfikacja TTS voice per attempt** (alloy/echo/onyx/verse). Może różne głosy dają różny hub score.
3. **`speed: 0.9`** w OpenAI TTS API (wolniejsze, bardziej naturalne).
4. **Nowe warianty wypowiedzi STATUSES_RECEIVED** — sprawdzić:
   - "W takim razie wyłącz monitoring na RD820."
   - "Ok, świetnie. Proszę o wyłączenie monitoringu na RD820."
   - "Rozumiem. Wyłącz proszę monitoring na RD820, jadę tą drogą."
5. **Rozważyć: pierwsza wypowiedź BARBAKAN+Zygfryd+drogi w podziale na dwie tury** (najpierw BARBAKAN, potem cel + drogi) — może hub oczekuje ACK po haśle.

## M3b eksperymenty (2026-07-05 wieczór)

- **`speed: 0.9`** w TTS — dodane. Brak zmiany na wyniku.
- **Split BARBAKAN + reszta na 2 tury** (nowa faza `PASSWORD_ACK`) — samo "Hasło BARBAKAN." deterministycznie -810 (4/4).
- Silne podejrzenie: hub prowadzi state per apikey, po serii ~20 fails wchodzi w tryb "wszystko podejrzane".

## Cost cumulative (M3a + M3b eksperymenty)

~$0.07 (28× poniżej capu $2.00). Bezpieczne pole do dalszych eksperymentów.

## Rekomendacja stanu

Cooldown 15-30 min i ponowić próby. Rozwiązanie techniczne (rozbicie BARBAKAN + speed) już w kodzie — czekamy tylko na hub. Alternatywa: całkowicie zresetować state huba (jeśli hub przyjmuje `apikey` retry).

## Dodatkowe eksperymenty (późny wieczór 2026-07-05)

- **Literowanie hasła** `B, A, R, B, A, K, A, N` → 4/4 fail. Hub jednoznacznie odrzuca.
- **Split BARBAKAN samo w turze 2**, pakiet w turze 3 → samo BARBAKAN deterministycznie fail (`-810`). Hub wymaga kontekstu.
- **BARBAKAN + acknowledge terenówki + wyłącz monitor** (attempt 2 dotarło do STATUSES_RECEIVED) → prośba o wyłączenie fail (`-790`).
- **BARBAKAN znów w STATUSES_RECEIVED** ("Hasło BARBAKAN. Wyłącz proszę monitoring na RD820.") → nie zostało przetestowane, bo run zafailował już na turze 2 (0/4 dotarło do STATUSES_RECEIVED).

## Wzorzec obserwowany

Success-rate przechodzenia turnu 2 (BARBAKAN + Zygfryd + drogi):
- Wczesne uruchomienia: ~30-50%
- Środek dnia: ~10-25%
- Późny wieczór: 0%

Silnie wspiera hipotezę **state per apikey**: hub prawdopodobnie zapamiętuje serie fails i zaostrza kryterium. Nie jest to udokumentowane w task.md ani w lekcji.

## Konkluzja M3

Kod jest gotowy. Dalsza praca wymaga **cooldownu apikey** (kilka godzin) i testów z aktualnym setupem.

## Artefakty

- `lessons/ts/S05/E02/*.ts` — pełny runtime
- `lessons/ts/resources/S05E02/tmp/attempt-{1..4}/` — audio in/out, transkrypty, state per turn, hub responses
- `lessons/ts/resources/S05E02/tmp/cost-breakdown.json`
- `answers/tmp/S05E02-phonecall-*.json`
