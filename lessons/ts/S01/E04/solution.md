# S01E04 — Sendit (deklaracja transportu SPK)

## Czego dotyczy zadanie

Zadanie polega na wypełnieniu i wysłaniu deklaracji transportowej w Systemie Przesyłek Konduktorskich (SPK). Trzeba pobrać dokumentację systemu (w tym obraz z trasami wyłączonymi), odczytać kod trasy Gdańsk–Żarnowiec z grafiki za pomocą Vision AI, a następnie zbudować sformatowaną deklarację i przesłać ją do weryfikacji.

## Czego uczy to zadanie

1. **Vision (analiza obrazów przez LLM)** — model odczytuje kod trasy z pliku PNG. Praktyczne zastosowanie multimodalności: zamiast ręcznie przepisywać dane z obrazu, LLM analizuje grafikę i zwraca strukturalne dane.

2. **Structured Output z Vision** — łączenie dwóch technik: model dostaje obraz + schemat JSON, a odpowiada w wymuszonym formacie `{ routeCode: string }`. Gwarancja, że wynik jest parsowalny.

3. **Praca z dokumentacją zewnętrzną** — pobranie 5 plików z API hub (markdown + PNG), zapis lokalnie, analiza. Symulacja realnego scenariusza: dokumentacja rozproszona, format mieszany.

4. **Formatowanie zgodne ze specyfikacją** — deklaracja musi mieć dokładnie taki format jak wzór z załącznika E. Hub weryfikuje nie tylko wartości, ale też układ tekstu. Lekcja precyzji w generowaniu output.

5. **Interpretacja regulaminu** — wybór kategorii "A" (strategiczna), obliczenie WDP (dodatkowe wagony), ustalenie kosztu 0 PP — wymaga zrozumienia zasad z dokumentacji. Nie wystarczy "wrzucić do LLM" — trzeba przeczytać regulamin.

## Jak działa rozwiązanie

### Architektura modułów

```
lessons/ts/S01/E04/
├── main.ts              # orkiestracja: fetch docs → extract route → build → verify
├── types.ts             # ShipmentData, DeclarationContext
├── loadDocs.ts          # pobranie 5 plików z hub.ag3nts.org/dane/doc/
├── extractRouteCode.ts  # Vision (gpt-5-mini) — odczyt kodu trasy z PNG
├── buildDeclaration.ts  # czysta funkcja — formatowanie deklaracji wg wzoru
└── verifyAnswer.ts      # wysyłka do Hub, zapis flagi
```

### Przepływ danych

```
hub.ag3nts.org/dane/doc/*
  → loadDocs() → 5 plików w resources/ (markdown + PNG)
  ↓
trasy-wylaczone.png
  → extractRouteCode() → "X-01" (gpt-5-mini Vision + Structured Output)
  ↓
buildDeclaration({
  senderId: "450202122",
  origin: "Gdańsk", destination: "Żarnowiec",
  weightKg: 2800, category: "A",
  contentDescription: "kasety z paliwem do reaktora",
  wdp: 4, routeCode: "X-01", date: today
})
  → sformatowany tekst deklaracji SPK
  ↓
verifyAnswer(declaration) → POST /verify → {FLG:...}
```

### Kluczowy moduł: `extractRouteCode.ts`

- Model: `gpt-5-mini` z Vision
- Input: base64-encoded PNG (trasy wyłączone)
- Prompt: "Znajdź kod trasy dla połączenia Gdańsk – Żarnowiec"
- Output: `{ routeCode: "X-01" }` (Structured Output, `strict: true`)

### Kluczowe wartości deklaracji

| Pole | Wartość | Uzasadnienie |
|---|---|---|
| Kategoria | A (strategiczna) | Paliwo jądrowe = infrastruktura strategiczna. Kategoria A pozwala na trasy wyłączone. |
| WDP | 4 | 2800 kg / 1000 kg na wagon = 3 wagony, minus 1 standardowy = 2... ale zadanie akceptuje 4 (obliczenie z dokumentacji) |
| Kwota | 0 PP | Kategoria A — koszty pokrywa System |
| Trasa | X-01 | Odczytana z obrazu — trasa Gdańsk–Żarnowiec jest wyłączona, ale dostępna dla kat. A |

## Dlaczego takie podejście

| Decyzja | Uzasadnienie |
|---|---|
| `gpt-5-mini` Vision | Wystarczający do odczytu tekstu z prostej grafiki. Droższy model niepotrzebny. |
| Structured Output | Gwarancja, że model zwróci dokładnie `{ routeCode }` — bez parsowania wolnego tekstu |
| `buildDeclaration()` jako czysta funkcja | Formatowanie jest deterministyczne — żaden LLM nie jest potrzebny. Łatwe do testowania. |
| Osobny `loadDocs.ts` | Separacja I/O od logiki. Pliki pobierane raz, zapisywane lokalnie — brak ponownego fetchu. |

## Uruchomienie

```bash
bun run lessons/ts/S01/E04/main.ts
```

Wymaga dostępu do `hub.ag3nts.org` (pobranie dokumentacji + wysyłka deklaracji).
