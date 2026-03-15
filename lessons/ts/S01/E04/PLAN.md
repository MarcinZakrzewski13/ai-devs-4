# Plan rozwiązania S01E04 — sendit

## Cel zadania

Wypełnić deklarację transportu SPK i wysłać do Centrali jako `answer.declaration` w zadaniu **sendit**.

---

## Dane przesyłki (z task.md)

| Pole | Wartość |
|------|---------|
| Nadawca (identyfikator) | `450202122` |
| Punkt nadawczy | Gdańsk |
| Punkt docelowy | Żarnowiec |
| Waga | 2800 kg |
| Budżet | 0 PP (darmowa lub finansowana przez System) |
| Zawartość | kasety z paliwem do reaktora |
| Uwagi specjalne | **brak** — nie dodawać żadnych uwag |

---

## Informacje wyciągnięte z dokumentacji

### 1. Wzór deklaracji (załącznik E)

```
SYSTEM PRZESYŁEK KONDUKTORSKICH - DEKLARACJA ZAWARTOŚCI
======================================================
DATA: [YYYY-MM-DD]
PUNKT NADAWCZY: [miasto nadania]
------------------------------------------------------
NADAWCA: [identyfikator płatnika]
PUNKT DOCELOWY: [miasto docelowe]
TRASA: [kod trasy]
------------------------------------------------------
KATEGORIA PRZESYŁKI: A/B/C/D/E
------------------------------------------------------
OPIS ZAWARTOŚCI (max 200 znaków): [...]
------------------------------------------------------
DEKLAROWANA MASA (kg): [...]
------------------------------------------------------
WDP: [liczba]
------------------------------------------------------
UWAGI SPECJALNE: [...]
------------------------------------------------------
KWOTA DO ZAPŁATY: [PP]
------------------------------------------------------
OŚWIADCZAM, ŻE PODANE INFORMACJE SĄ PRAWDZIWE.
BIORĘ NA SIEBIE KONSEKWENCJĘ ZA FAŁSZYWE OŚWIADCZENIE.
======================================================
```

**Formatowanie musi być zachowane dokładnie** — Hub weryfikuje wartości i format.

### 2. Kategorie przesyłek i opłaty (sekcja 9.2)

| Kategoria | Opłata bazowa (PP) |
|-----------|--------------------|
| A - Strategiczna | 0 (pokrywana przez System) |
| B - Medyczna | 0 (pokrywana przez System) |
| C - Żywnościowa | 2 PP |
| D - Gospodarcza | 5 PP |
| E - Osobista | 10 PP |

**Budżet 0 PP → tylko kategoria A lub B.**

### 3. Żarnowiec — Dyrektywa Specjalna 7.7 (sekcja 8.3)

- Wszystkie trasy do Żarnowca są **wyłączone z użytku**.
- Trasy wyłączone mogą być wykorzystane **wyłącznie** przy przesyłkach **kategorii A lub B**.

### 4. Zawartość „kasety z paliwem do reaktora”

- **Kategoria A (Strategiczna)** pasuje: obejmuje „ogniwa paliwowe” i materiały dla infrastruktury.
- Kategoria B (Medyczna) — nie pasuje.

**→ Kategoria przesyłki: A**

### 5. WDP (Wagony Dodatkowe Płatne) — załącznik G

- Skład standardowy: 2 wagony × 500 kg = 1000 kg.
- Przesyłka 2800 kg wymaga: (2800 − 1000) / 500 = 3,6 → **4 dodatkowe wagony**.
- **WDP = 4**

Z `dodatkowe-wagony.md`: dla przesyłek Strategicznych (A) i Medycznych (B) opłata za dodatkowe wagony **nie jest naliczana**.

### 6. Mapa sieci (załącznik F)

```
ŻARNOWIEC ===X=== GDAŃSK
```

- `===X===` oznacza trasę wyłączoną.
- Istnieje bezpośrednie połączenie Gdańsk–Żarnowiec (wyłączone).

### 7. Kod trasy Gdańsk–Żarnowiec

- **Źródło:** plik graficzny `trasy-wylaczone.png` (sekcja 8.2 dokumentacji).
- **Wymaga:** modelu z Vision do analizy obrazu.
- **Analiza:** wykonać oddzielnie — przekazać obraz do gpt-5-mini (lub gpt-5) i poprosić o odczyt kodu trasy dla Gdańsk–Żarnowiec.

---

## Pliki dokumentacji do pobrania

**Baza URL:** `https://hub.ag3nts.org/dane/doc/`

| Plik | Zapis w projekcie | Uwagi |
|------|--------------------|-------|
| index.md | `lessons/ts/resources/dane-doc-index.md` | Już istnieje |
| zalacznik-E.md | `lessons/ts/resources/zalacznik-E.md` | Wzór deklaracji |
| zalacznik-F.md | `lessons/ts/resources/zalacznik-F.md` | Mapa sieci |
| zalacznik-G.md | `lessons/ts/resources/zalacznik-G.md` | Słownik skrótów |
| dodatkowe-wagony.md | `lessons/ts/resources/dodatkowe-wagony.md` | Opłaty za wagony |
| trasy-wylaczone.png | `lessons/ts/resources/trasy-wylaczone.png` | **Obraz** — analiza Vision |

---

## Wartości do wstawienia w deklarację

| Pole | Wartość |
|------|---------|
| DATA | aktualna data (YYYY-MM-DD) |
| PUNKT NADAWCZY | Gdańsk |
| NADAWCA | 450202122 |
| PUNKT DOCELOWY | Żarnowiec |
| TRASA | **[z trasy-wylaczone.png — Vision]** |
| KATEGORIA PRZESYŁKI | A |
| OPIS ZAWARTOŚCI | kasety z paliwem do reaktora |
| DEKLAROWANA MASA (kg) | 2800 |
| WDP | 4 |
| UWAGI SPECJALNE | *(puste — nie dodawać)* |
| KWOTA DO ZAPŁATY | 0 |

---

## Kroki implementacji

1. **Pobierz i zapisz dokumentację** — fetch plików z hub.ag3nts.org, zapis w `lessons/ts/resources/`.
2. **Analiza obrazu** — przekaż `trasy-wylaczone.png` do modelu z Vision (gpt-5-mini), odczytaj kod trasy Gdańsk–Żarnowiec.
3. **Zbuduj deklarację** — wypełnij wzór z załącznika E dokładnie według formatu.
4. **Wyślij** — `sendAnswer("sendit", { declaration: "<pełny tekst>" })` via `@ai-devs/ai-devs-hub`.
5. **Persystencja** — `saveTmpAnswer` przed wysłaniem, `saveFinalAnswer` po fladze.

---

## Moduły (wg ADR-001)

```
loadDocs.ts        — pobieranie i zapis plików do resources/
extractRouteCode.ts — Vision: odczyt kodu trasy z trasy-wylaczone.png
buildDeclaration.ts — budowa deklaracji (czysta funkcja)
verifyAnswer.ts    — sendAnswer + saveTmpAnswer/saveFinalAnswer
main.ts            — orkiestracja
types.ts           — typy
```

---

## Format odpowiedzi do Hub

```json
{
  "apikey": "...",
  "task": "sendit",
  "answer": {
    "declaration": "SYSTEM PRZESYŁEK KONDUKTORSKICH - DEKLARACJA ZAWARTOŚCI\n..."
  }
}
```

Użycie: `sendAnswer("sendit", { declaration: fullText })` — apikey dodaje `verify.ts` z `process.env.API_KEY_AI_DEVS4`.
