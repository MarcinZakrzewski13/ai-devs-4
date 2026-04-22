# Solution: S05E01 — Radiomonitoring

## Czego dotyczy zadanie

Nasłuch radiowy z Centrali (`hub.ag3nts.org/verify`) w cyklu `start → listen × N → transmit`. Centrala zwraca mieszankę typów danych: tekstowe transkrypcje rozmów, pliki binarne (JSON, PNG, JPEG, CSV, XML, audio/mp3). Celem jest ustalenie prawdziwej nazwy miasta kryjącego się pod aliasem „Syjon", jego powierzchni, liczby magazynów i numeru telefonu osoby kontaktowej.

## Czego uczy zadanie

- **Multi-type routing** — nie jeden prompt obsługuje wszystko; dane binarne wymagają innego toru niż tekst
- **Deterministyczna pre-analiza** — dane strukturalne (JSON city list) przetwarzane bez LLM
- **Multimodalność** — vision (PNG sticky note) i audio (whisper-1 transcription) zintegrowane w jednym pipeline
- **Eksploracja jako pierwsza iteracja** — zanim uruchomisz LLM, zbierz surowe dane i zrozum ich kształt
- **Iteratywne zawężanie** — z 34 fragmentów wyciągasz 4 kluczowe fakty, nie jeden prompt

## Jak działa rozwiązanie

```
start → hub ack (code 110)
      ↓
listen × 34 (różne typy)
  text/transcription → analyzeText (gpt-5-nano, Structured Output)
  application/json   → deterministyczne: lista miast + occupiedArea
  image/png (548KB)  → vision (gpt-5-mini) → numer tel. z karteczki
  audio/mpeg (530KB) → whisper-1 → transkrypt → analyzeText
  text/xml, text/csv → analyzeText (gpt-5-nano)
  image/jpeg (meme)  → vision → isNoise=true, dropped
      ↓
FactStore.aggregate() → candidates per field
      ↓
synthesize (gpt-5-mini) → FinalAnswer
      ↓
transmit → {FLG:GOODMORNINGZION}
```

## Kluczowe odkrycia z danych

| Źródło | Kluczowa informacja |
|--------|---------------------|
| PNG (sticky note, seq 11) | „Jacek Kramer – 644-122-092 w sprawie noclegu na Syjonie" → phoneNumber |
| MP3 (audio, seq 9, whisper-1) | „planujemy wybudować **dwunasty** magazyn" → 11 obecnych |
| JSON (city list) | Skarszewy: `occupiedArea: 10.7284` → 10.73 km² |
| Transkrypcje + CSV | Syjon = Skarszewy (bydło, kilof, „prawie biblijny raj", rzeka) |

## Dlaczego takie podejście

- **Router przed LLM** — filesize check decyduje czy image idzie do vision. 560KB PNG dla karteczki to akceptowalne; meme JPEG (243KB) też był w danych — vision poprawnie oznaczył jako isNoise.
- **Deterministyczna ekstrakcja area** — JSON city list ma jasną strukturę; gpt-5-nano nie jest potrzebne do wyciągnięcia `occupiedArea` ze statycznego JSONa.
- **Iteracja 1 bez LLM** — `explore-session.ts` zebrał surowe dane w 2 minuty (tylko HTTP). Iteracja 2 analizowała LLMem. To umożliwiło szybkie potwierdzenie odpowiedzi przed kosztowną analizą.
- **fast-transmit.ts** — po potwierdzeniu odpowiedzi manualnie (z danych explore), użyty prostszy skrypt: start → listen × 34 (bez LLM) → transmit z known answer. Czas: ~3 minuty.

## Odpowiedź finalna

```json
{
  "cityName": "Skarszewy",
  "cityArea": "10.73",
  "warehousesCount": 11,
  "phoneNumber": "644122092"
}
```

Flaga: `{FLG:GOODMORNINGZION}`

## Uruchomienie

```bash
# Iteracja 1 — eksploracja (bez LLM)
bun run lessons/ts/S05/E01/analysis-tools/explore-session.ts

# Iteracja 2 — pełny pipeline z LLM
bun run lessons/ts/S05/E01/main.ts

# Fast transmit (po potwierdzeniu odpowiedzi)
bun run lessons/ts/S05/E01/analysis-tools/fast-transmit.ts
```

## Wnioski z lekcji

### 1. Router to pierwszy model decyzyjny

**Co się wydarzyło:** Bez routera, każdy z 34 fragmentów (w tym 530KB MP3 i 560KB PNG) poszedłby do LLM jako base64 — gigantyczny koszt i bez sensu. Router sklasyfikował 27 fragmentów jako tekst, 1 jako JSON deterministyczny, 1 jako audio → whisper, 1 jako vision PNG, 1 jako vision JPEG (noise).

**Analogia:** Sortownia pocztowa nie otwiera każdego pakietu ręcznie — sprawdza wagę, kształt i adres zanim zdecyduje o torze.

**Przykład zastosowania:** Multimodal pipeline dla dokumentów firmowych — PDFy deterministycznie, obrazy do vision, głos do S2T, tabele JSON deterministycznie. LLM dostaje tylko pre-przetworzone dane.

---

### 2. Eksploracja jako "iteracja 0" — bez kosztów

**Co się wydarzyło:** `explore-session.ts` zebrał 34 fragmenty w 2 minuty, bez LLM. Z raportu wiedziałem: 27 tekstów, 1 JSON, 1 PNG, 1 JPEG, 1 MP3, 1 XML, 1 CSV. Typy MIME i filesizes były znane przed pierwszym LLM-calliem.

**Analogia:** Inspektor celny prześwietla bagaż rentgenem zanim go otworzy — decyduje co wymaga inspekcji, co przechodzi auto.

**Przykład zastosowania:** Przed batch-processingiem dokumentów: szybki scan (rozmiar, typ, liczba stron) → priorytetyzacja → selektywne LLM.

---

### 3. Deterministyczna ekstrakcja > LLM dla znanych struktur

**Co się wydarzyło:** JSON z listą miast miał `name` i `occupiedArea`. LLM nie wiedział który to Syjon, więc dostał `"UNKNOWN"`. Fix: deterministyczna ekstrakcja wszystkich par `NazwaMiasta:area` jako fact candidates — synthesizer wiedział już który wybrać.

**Analogia:** Nie pytasz prawnika o zawartość umowy; czytasz paragrafy sam i prosisz prawnika tylko o interpretację dwuznacznych klauzul.

**Przykład zastosowania:** API response z cenami walut — deterministycznie wyciągnij `USD/PLN`, nie pytaj LLM o kurs.

---

### 4. `filesize` w API ≠ zawartość istotna

**Co się wydarzyło:** PNG 560KB (limit 200KB) był sticky note z numerem telefonu — kluczowa informacja. JPEG 248KB był memem z Twittera — kompletny szum. Limit 200KB był arbitralny i błędny dla tego zadania.

**Analogia:** Nie odrzucasz listu bo jest gruby — sprawdzasz nadawcę i temat.

**Przykład zastosowania:** Zamiast bezwzględnego size-based filtru: content-type + filesize jako wskazówka, ale fallback: analiza małego preview (first 500 bytes) lub metadata-only dla dużych plików.
