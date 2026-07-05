# M1 — Findings (probe-start.ts)

**Data:** 2026-07-05
**Endpoint:** `https://hub.ag3nts.org/verify`
**Latency:** ~192 ms.

## Odpowiedź Huba na `action: start`

```json
{
  "code": 0,
  "message": "Phonecall session started.",
  "msg": "Przez najbliższe 30 minut możesz prowadzić rozmowę.",
  "action": "start"
}
```

Body: 173 B, HTTP 200.

## Wnioski (korekta planu)

1. **Brak audio operatora po `start`.** Hub nie wysyła powitania — my inicjujemy dialog wysyłając pierwsze audio.
2. **Sesja: 30 minut.** Duży bufor czasowy, ale wciąż nie zwlekamy z LLM/TTS callami.
3. **Pole `action: "start"`** w odpowiedzi = potwierdzenie fazy sesji Huba. Prawdopodobnie kolejne odpowiedzi (po audio) będą miały `action` = np. `"continue"` / `"end"` / podobne — trzeba to potwierdzić w M2 po pierwszym audio in.
4. **`code: 0`** = sukces (zgodne z konwencją hub-a z innych zadań).
5. Struktura pól `message` (EN, statusowe) + `msg` (PL, dla użytkownika) — parsować oba pola przy detekcji sukcesu/failu.

## Aktualizacja modelu stanu

Usunąć fazę `OPERATOR_GREETING`. Nowy start:

```
AWAIT_START
  → POST { action: start }
  → OPEN_LINE (mamy sesję, operator "czeka na drucie" bez audio)
  → nasze pierwsze audio: intro Tymona + pytanie o 3 drogi + kontekst Zygfryda
INTRO_SENT
  → operator odpowiada audio (dopiero teraz mamy pierwsze audio in)
  → transcribe, extractRoadStatuses
STATUSES_RECEIVED / AUTH_CHALLENGED / ...
```

## Otwarte pytania na M2

- Nazwa pola w odpowiedzi Huba, gdzie znajdzie się audio operatora (po naszym audio out).
- Czy pole to zawiera raw Base64 czy `data:audio/...;base64,...`.
- Format MP3? Sample rate?
- Kod odpowiedzi po fatal-error (spalona rozmowa) — inne niż 0? `error`?
- Kod / message dla sukcesu z flagą — czy flaga w `message` jak w innych zadaniach (`{FLG:...}`).

## Artefakty

- `tmp/attempt-0-probe/raw-start-response.json`
- `tmp/attempt-0-probe/raw-start-response.txt`
