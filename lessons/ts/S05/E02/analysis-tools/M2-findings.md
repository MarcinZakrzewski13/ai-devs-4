# M2 — Findings (probe-first-audio.ts)

**Data:** 2026-07-05
**Wypowiedź out:** „Dzień dobry, tu Tymon Gajewski. Dzwonię w sprawie transportu organizowanego do jednej z baz Zygfryda. Proszę o status trzech dróg: RD224, RD472 oraz RD820."
**TTS:** `gpt-4o-mini-tts` voice=`onyx`, MP3, 312 960 B, B64 len=417 280.
**HTTP:** 200, 1810 ms, body 62 772 B.

## Kontrakt Huba (odpowiedź po audio out)

```json
{
  "code": 120,
  "message": "Identity confirmed.",
  "audio": "SUQzBAAA... (raw base64 MP3, len 61920)"
}
```

Format audio operatora: **raw Base64**, nie `data:audio/...` URL. Header ID3v2.4 (`SUQz` = `ID3`) → MP3.

## Odpowiedź operatora (transkrypt whisper)

> „W jakiej sprawie dzwonisz?"

## Wnioski

1. **Pole audio operatora = `audio`** (top-level, raw B64 MP3). Ten sam schemat co outbound — symetryczne.
2. **`code: 120`** — pierwszy inny niż 0 kod odpowiedzi. Prawdopodobnie oznacza „session progressed / stage advanced" albo konkretnie „identity confirmed". Trzeba obserwować kolejne stany.
3. **`message: "Identity confirmed."`** — hub uznał tożsamość Tymona za potwierdzoną tylko po przedstawieniu (imię + nazwisko). Nie było wymagane hasło `BARBAKAN` na starcie.
4. **Operator zignorował** merytorykę (pytanie o RD*, kontekst Zygfryda). Reakcja: standardowe „W jakiej sprawie dzwonisz?". Dwie hipotezy:
   - **H1 (protokół rozmowy):** operator prowadzi dialog etapami; pierwsza tura Tymona = tylko przedstawienie. Merytoryka dopiero po pytaniu operatora.
   - **H2 (TTS/wypowiedź):** wypowiedź była za mało wyraźna / operator nie „usłyszał" merytoryki. Ale whisper w Huba jest OK — bardziej prawdopodobne H1.
5. Zadanie mówi „podaj to wszystko w jednej wiadomości" — prawdopodobnie chodzi o **pierwszą merytoryczną wypowiedź**, nie o samo przedstawienie się. Tzn.:
   - Turn 1: „Tu Tymon Gajewski, dzień dobry."
   - Turn 2 (po „W jakiej sprawie dzwonisz?"): pełny pakiet — Zygfryd + status 3 dróg.

## Konsekwencje dla planu

- **Poprawka strategii B (hybryda):**
  - Wypowiedź #1: krótkie przedstawienie (bez merytoryki).
  - Wypowiedź #2: pakiet Zygfryd + RD224/RD472/RD820 (spełnia „wszystko w jednej wiadomości").
- **Status codes do zmapowania w trakcie kolejnych tur:** 0 (start), 120 (identity confirmed). Prawdopodobnie kolejne: request understood, monitoring disabled, session ended, error.
- Kontrakt do implementacji `hubClient.postAudio(b64)` = `{ code, message, audio? }`. Może pojawić się pole `flag` na końcu.

## Artefakty

- `tmp/attempt-0-probe/m2-start-response.json`
- `tmp/attempt-0-probe/m2-tymon-turn-1-out.mp3` (nasz TTS)
- `tmp/attempt-0-probe/m2-tymon-turn-1-out.txt` (tekst)
- `tmp/attempt-0-probe/m2-audio-response.json`
- `tmp/attempt-0-probe/m2-operator-turn-1-in-0.mp3` (operator)
- `tmp/attempt-0-probe/m2-operator-turn-1-transcript-0.txt`

## Otwarte pytania na M3

- Czy operator akceptuje pakiet Zygfryd + 3 drogi w drugiej wypowiedzi?
- Jak operator werbalizuje statusy dróg (przejezdna / zablokowana / uszkodzona)? Extraction schema musi to pokryć.
- Kiedy operator żąda hasła `BARBAKAN` (autoryzacja przy prośbie o wyłączenie monitoringu?).
- Kiedy dopytuje o powód wyłączenia monitoringu?
- Kod / message końca sesji (sukces vs fail).
