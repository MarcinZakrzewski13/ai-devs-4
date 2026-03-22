# S02E04 — Mailbox (przeszukiwanie skrzynki mailowej)

## Czego dotyczy zadanie

Przeszukanie skrzynki mailowej operatora systemu przez API (zmail) w celu znalezienia trzech informacji: daty planowanego ataku na elektrownię, hasła do systemu pracowniczego i kodu potwierdzenia ticketu bezpieczeństwa.

## Czego uczy zadanie

- **API discovery** — start od akcji `help`, poznanie dostępnych endpointów i parametrów
- **Dwuetapowe pobieranie danych** — lista maili (metadane) -> pełna treść wiadomości po ID
- **Iteracyjne przeszukiwanie aktywnego źródła** — skrzynka jest "żywa", dane mogą pojawić się w trakcie pracy
- **Agent loop z function calling** — LLM sam decyduje jakie zapytania wykonać i w jakiej kolejności
- **Gmail-like query operators** — `from:`, `subject:`, `OR`, `AND`

## Jak działa rozwiązanie

Pętla agentowa z 6 narzędziami. Agent LLM (Gemini Flash) dostaje system prompt z opisem misji i sam steruje przeszukiwaniem.

```
main.ts → runMailboxAgent(tools, systemPrompt)
           ↓
         agent-loop.ts — callTools() loop (max 20 iteracji)
           ↓
         tools.ts — zmail_help, zmail_inbox, zmail_search,
                    zmail_get_message, submit_answer, finish
           ↓
         zmail-api.ts — POST https://hub.ag3nts.org/api/zmail
```

Typowy przebieg agenta (12 iteracji):
1. `zmail_help` → poznanie API
2. `zmail_search(from:proton.me)` → mail od Wiktora
3. `zmail_get_message` → treść donosu (kontekst, ale brak szukanych danych)
4. `zmail_search(password OR "hasło")` → mail z hasłem
5. `zmail_get_message` → hasło: RABARBAR25
6. `zmail_search(subject:"SEC-")` → tickety bezpieczeństwa
7-10. `zmail_get_message` × kilka → data ataku + poprawiony kod potwierdzenia
11. `submit_answer` → flaga
12. `finish`

## Dlaczego takie podejście

- **Agent loop zamiast deterministycznego skryptu** — nie znamy struktury skrzynki ani nazw nadawców z góry; agent sam eksploruje i dostosowuje zapytania
- **Gemini Flash** — zadanie polega na ekstrakcji faktów, nie na złożonym rozumowaniu; tani model wystarczy
- **Narzędzia zamiast surowego API** — abstrakcja pozwala agentowi operować na wyższym poziomie (szukaj, czytaj, wyślij) bez znajomości detali HTTP

## Odpowiedzi API / dane referencyjne

Znalezione wartości:
- `date`: 2026-03-23 (atak na elektrownię w najbliższy poniedziałek)
- `password`: RABARBAR25 (nowe hasło do systemu pracowniczego)
- `confirmation_code`: SEC-c1e598764329cc9c377ef1d029be8ceb (poprawiony kod z ticketu)

Interesujący detail: kod potwierdzenia pojawił się w dwóch wariantach — pierwszy był błędny ("zgubiłem literkę na końcu"), poprawny przyszedł w kolejnym mailu.

## Wnioski z lekcji

### Agent jako nawigator, nie jako programista
- **Co się wydarzyło:** Agent sam wymyślał zapytania search (`from:proton.me`, `password OR "hasło"`, `subject:"SEC-"`), czytał wyniki i decydował co dalej. Zero hardcoded logiki przeszukiwania.
- **Analogia:** To jak wysłanie detektywa z opisem misji zamiast pisania mu krok-po-kroku instrukcji. Detektyw sam wie jak szukać — ty mówisz mu tylko CO ma znaleźć.
- **Przykład zastosowania:** Każde zadanie "przeszukaj nieznane źródło danych" — baza ticketów, dokumentacja, logi — nadaje się do tego wzorca. Agent eksploruje, my definiujemy cel.

### API discovery jako pierwszy krok agenta
- **Co się wydarzyło:** Pierwszą akcją agenta było `zmail_help`. Dzięki temu dowiedział się o `getMessages` (nie `getMessage`) i parametrze `ids` (nie `messageId`). Ręczne zgadywanie nazw endpointów kosztowało mnie pół godziny debugowania.
- **Analogia:** Nie wchodzisz do nowego biura i nie zgadujesz gdzie jest łazienka — pytasz recepcję.
- **Przykład zastosowania:** Każde nowe API — zacznij od `help`/`docs`/`OPTIONS` zanim napiszesz choćby jeden request. Dotyczy to też agentów: niech agent sam odkryje API.

### Dane mogą być niespójne — agent musi to rozpoznać
- **Co się wydarzyło:** Kod potwierdzenia pojawił się w dwóch mailach — pierwszy był błędny ("zgubiłem literkę"). Agent musiał przeczytać oba i wybrać poprawny na podstawie kontekstu ("Poprawny to: SEC-...").
- **Analogia:** W skrzynce mailowej korekta zawsze nadpisuje oryginał — ale trzeba ją najpierw przeczytać.
- **Przykład zastosowania:** Ekstrakcja danych z niestrukturyzowanych źródeł (maile, czaty, dokumenty) wymaga czytania kontekstu, nie tylko pattern matchingu. LLM są w tym dobre — regex nie.

## Uruchomienie

```bash
bun run lessons/ts/S02/E04/main.ts
```
