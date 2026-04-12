# AI_Devs 4: Builders — przeglad materialow lekcyjnych

AI_Devs 4: Builders to kurs praktyczny poswiecony budowaniu produkcyjnych rozwiazan opartych na generatywnej sztucznej inteligencji. Kurs prowadzi od fundamentow interakcji z modelami jezykowymi (LLM) przez API, przez projektowanie narzedzi i agentow AI, az po zaawansowane systemy wieloagentowe z dlugoterminowa pamiecia i bazami wiedzy. Kazda lekcja laczy teorie z praktyka — materialy wideo, schematy architektoniczne i przyklady kodu uzupelniane sa zadaniami praktycznymi rozwiazywanymi w TypeScript (Bun). Kurs uczy swiadomego doboru narzedzi: kiedy uzyc LLM, a kiedy wystarczy deterministyczny kod; jak projektowac prompty, schematy i narzedzia; jak budowac odpornych agentow zdolnych do samodzielnej interakcji z otoczeniem.

Materialy lekcyjne znajduja sie w `lessons/txt/S01/` - `lessons/txt/S05/`.

---

## Sezon 1 — Fundamenty integracji LLM i budowy agentow

### S01E01: Programowanie interakcji z modelem jezykowym

Lekcja wprowadzajaca w fundamenty pracy z LLM przez API. Omawia proces generowania tokenow (autoregresja), okna kontekstowe, bezstanowe API i kontrole zachowania modelu przez kod. Przedstawia Structured Output (JSON Schema) jako sposob wymuszania formatu odpowiedzi modelu, co eliminuje parsowanie wolnego tekstu. Porusza tez roznice miedzy deterministycznym kodem a niedeterministycznymi wynikami modeli, strategie doboru modeli do roznych zadan, oraz zdarzeniowa komunikacje (semantic events). Przyklady kodu obejmuja OpenAI i OpenRouter.

**Plik:** `lessons/txt/S01/s01e01-programowanie-interakcji-z-modelem-jezykowym-1773053098.md`

### S01E02: Techniki laczenia modelu z narzedziami

Lekcja o Function Calling / Tool Use — mechanizmie pozwalajacym modelowi "przejac kontrole" nad logika aplikacji. LLM nie ma dostepu do otoczenia bezposrednio, ale moze generowac strukturyzowane zadania wywolania funkcji, ktore kod aplikacji wykonuje i zwraca wyniki. Omawia natywne narzedzia (web search, code interpreter) vs wlasne, dobre praktyki projektowania narzedzi (nazwy, opisy, schematy, walidacja, obsluga bledow), bezpieczenstwo oraz polaczenie z zewnetrznymi serwisami (API, MCP, CLI). Kluczowa lekcja: nie mapuj istniejacego API 1:1 na narzedzia — projektuj interfejs z perspektywy modelu.

**Plik:** `lessons/txt/S01/s01e02-techniki-laczenia-modelu-z-narzedziami-1773096471.md`

### S01E03: Projektowanie API dla efektywnej pracy z modelem

Lekcja o projektowaniu interfejsow narzedzi zoptymalizowanych pod LLM. Analizuje cechy API wplywajace na jakosc narzedzi (paginacja, rate limit, asynchronicznosc, relacje), planowanie struktury narzedzi i schematow, optymalizacje interfejsu (redukcja liczby narzedzi bez utraty mozliwosci). Wprowadza Model Context Protocol (MCP) — standard laczenia LLM z narzedziami zewnetrznymi. Praktyczna implementacja serwera MCP dla systemu plikow. Omawia dynamiczne odpowiedzi z hintami pomagajacymi modelowi w odzyskiwaniu sie po bledach.

**Plik:** `lessons/txt/S01/s01e03-projektowanie-api-dla-efektywnej-pracy-z-modelem-1773213233.md`

### S01E04: Wsparcie multimodalnosci oraz zalacznikow

Lekcja o pracy z danymi multimodalnymi: obrazami, audio, wideo i dokumentami. Omawia mozliwosci modeli vision (rankingi, porownania), obsluge zalacznikow w interakcjach agentowych, iteracyjne generowanie i edycje obrazow, prompty JSON dla spojnosci generowanych grafik, obrazy referencyjne, renderowanie PDF i generowanie dokumentow, przetwarzanie audio i interfejsy glosowe. Praktyczne zastosowania: odczyt danych z obrazow, analiza map i schematow, ekstrakcja informacji z dokumentow skanowanych.

**Plik:** `lessons/txt/S01/s01e04-wsparcie-multimodalnosci-oraz-zalacznikow-1772976388.md`

### S01E05: Zarzadzanie jawnymi oraz niejawnymi limitami modeli

Lekcja o produkcyjnych aspektach pracy z LLM: limity okna kontekstowego, zarzadzanie tokenami, optymalizacja kosztow i cennikow. Omawia mechanizmy kontroli i odzyskiwania po bledach, workflow zatwierdzania (confirmation), narzedzia zaufane vs niezaufane, optymalizacje wydajnosci na poziomie architektury. Porusza moderacje, filtrowanie bezpieczenstwa, rate limity, limity outputu i knowledge cutoffs. Kluczowa lekcja: projektuj architekture z uwzglednieniem ograniczen — nie walcz z nimi, ale buduj wokol nich.

**Plik:** `lessons/txt/S01/s01e05-zarzadzanie-jawnymi-oraz-niejawnymi-limitami-modeli-1773377197.md`

---

## Sezon 2 — Zaawansowane zarzadzanie kontekstem i systemy wieloagentowe

### S02E01: Zarzadzanie kontekstem w konwersacji

Lekcja o inzynierii kontekstu — kluczowej umiejetnosci w pracy z LLM. Omawia role kontekstu w instrukcjach systemowych, swiadomosc srodowiskowa agenta, modyfikacje kontekstu w trakcie sesji, instrukcje dla zespolow wieloagentowych. Wprowadza pojecie stosunku sygnalu do szumu w kontekscie LLM, ksztaltowanie kontekstu przez obserwacje, Agentic RAG (Retrieval Augmented Generation) oraz generalizacje regul przetwarzania kontekstu. Praktyczna lekcja: im lepiej zarzadzasz kontekstem, tym skuteczniej dziala agent.

**Plik:** `lessons/txt/S02/s02e01-zarzadzanie-kontekstem-w-konwersacji-1773634920.md`

### S02E02: Zewnetrzny kontekst narzedzi i dokumentow

Lekcja o integracji zewnetrznych zrodel wiedzy z kontekstem LLM. Omawia bezpieczenstwo kontekstu zewnetrznego (prompt injection, ryzyka), wplyw dlugiego kontekstu na zachowanie modelu, strategie indeksowania i chunkowania dokumentow, porownanie wyszukiwania tekstowego vs semantycznego. Wprowadza bazy wektorowe, bazy grafowe, modele embeddingowe i ich zastosowanie w wyszukiwaniu semantycznym. Praktyczne wskazowki dotyczace prezentowania tresci zewnetrznych w kontekscie agenta.

**Plik:** `lessons/txt/S02/s02e02-zewnetrzny-kontekst-narzedzi-i-dokumentow-1773818117.md`

### S02E03: Dokumenty oraz pamiec dlugoterminowa jako narzedzia

Lekcja o budowaniu baz wiedzy dla agentow AI. Wprowadza wzorzec Observational Memory (Observer/Reflector) — agent obserwuje interakcje i buduje dlugoterminowa pamiec. Omawia kompresje kontekstu, kategorie i strukture baz wiedzy, tworzenie baz wiedzy specjalizowanych pod agenta vs podlaczanie do istniejacych. Porusza strategie prezentacji dokumentow i nawigacji (referencje vs tresc), bazy grafowe (Neo4j) do mapowania wiedzy, oraz nawigacje opartą na referencjach vs pelna tresc.

**Plik:** `lessons/txt/S02/s02e03-dokumenty-oraz-pamiec-dlugoterminowa-jako-narzedzia-1773813001.md`

### S02E04: Organizowanie kontekstu dla wielu watkow

Lekcja o systemach wieloagentowych i komunikacji miedzy agentami. Omawia wzorce interakcji wielowatkowej: Pipeline, Blackboard, Orchestrator, Tree, Mesh, Swarm. Porusza delegowanie zadan, narzedzia do komunikacji, komunikacje dwukierunkowa, architekture zdarzeniowa (event-driven). Zaawansowane tematy: globalne zarzadzanie kontekstem miedzy instancjami agentow, wykrywanie konfliktow kontekstu, wspoldzielona pamiec miedzy agentami, degradacja komunikacji i utrata informacji.

**Plik:** `lessons/txt/S02/s02e04-organizowanie-kontekstu-dla-wielu-watkow-1773922583.md`

### S02E05: Projektowanie agentow

Lekcja podsumowujaca sezon — kompleksowe podejscie do projektowania i implementacji agentow. Omawia konfiguracje agenta: tozsamosc, profil, reguly, limity, styl, sesja. Anatomia instrukcji systemowej i najlepsze praktyki. Projektowanie protokolow komunikacji w srodowiskach wieloagentowych, dostosowywanie glosu/tonu do roznych interfejsow. Strategie przydzialu narzedzi agentom, dystrybucja wiedzy i wspoldzielenie kontekstu, architektura przeplywu danych, srodowiska sandbox dla wykonywania zadan agenta.

**Plik:** `lessons/txt/S02/s02e05-projektowanie-agentow-1773962356.md`

---

## Sezon 3 — Budowa agentow z narzedziami i interakcja z otoczeniem

### S03E01: Ewaluacja i walidacja danych

Lekcja o ocenie jakosci danych i wykrywaniu anomalii. Omawia hybrydowe przetwarzanie — deterministyczny kod dla danych liczbowych, LLM dla interpretacji jezyka naturalnego. Porusza optymalizacje kosztow (deduplikacja, minimalizacja tokenow), budowanie regul walidacyjnych na podstawie specyfikacji, oraz limitacje keyword matching wobec negacji w jezyku naturalnym.

**Plik:** `lessons/txt/S03/s03e01-ewaluacja-1774310792.md`

### S03E02: Interakcja z systemami zewnetrznymi

Lekcja o agentach interagujacych z nieznanymi systemami przez shell/API. Omawia petlę agentowa z Function Calling do interaktywnego debugowania, eksploracje nieznanych srodowisk (zaczynaj od `help`), respektowanie ograniczen srodowiska i wielokrokowe rozwiazywanie problemow.

**Plik:** `lessons/txt/S03/s03e02-interakcja-1774393233.md`

### S03E03: Nawigacja w zmiennym srodowisku

Lekcja o reagowaniu na dynamicznie zmieniajacy sie stan otoczenia. Omawia predykcje stanu, decyzje na podstawie przyszlych pozycji, discovery API przez eksperyment, deterministyczne petle decyzyjne.

**Plik:** `lessons/txt/S03/s03e03-nawigacja-1774566782.md`

### S03E04: Projektowanie narzedzi dla agentow zewnetrznych

Lekcja o budowaniu API/narzedzi konsumowanych przez zewnetrzne agenty AI. Omawia projektowanie opisow narzedzi z perspektywy modelu, guard LLM jako warstwę bezpieczenstwa, normalizację jezyka naturalnego do structured data, trojwarstwowa architekturę: guard → normalizer → silnik deterministyczny.

**Plik:** `lessons/txt/S03/s03e04-narzedzia-1774655710.md`

### S03E05: Agentowe planowanie tras

Lekcja o agentach odkrywajacych narzedzia w runtime i planujacych trasy. Omawia API discovery przez meta-endpoint (toolsearch), Knowledge Base pattern, LLM jako decision-maker, algorytmy (BFS) opakowane jako AiTool.

**Plik:** `lessons/txt/S03/s03e05-planowanie-1774741741.md`

---

## Sezon 4 — Automatyzacja, bazy wiedzy i rozwiazania firmowe

### S04E01: Automatyzacja i monitoring systemow

Lekcja o agentach modyfikujacych systemy operacyjne (CRUD) w runtime. Omawia API discovery, web panel indexing z sanityzacja (prompt injection, link loops), temporal constraints (TTL), batch execution.

**Plik:** `lessons/txt/S04/s04e01-automatyzacja-1774821363.md`

### S04E02: Asynchroniczne API i time-boxed execution

Lekcja o pracy z asynchronicznymi API (queue + poll) w ograniczonym czasie. Omawia kolejkowanie zadan, optymalizacje critical path, interpolacje danych z dokumentacji, walidacje konfiguracji.

**Plik:** `lessons/txt/S04/s04e02-asynchroniczne-api-1774914236.md`

### S04E03: Kontekstowa wspolpraca z AI

Lekcja o integracji AI w codzienną prace bez bezposredniej interakcji. Omawia szeroką perspektywę kontekstowej pracy z AI, integracje z narzedziami (GSuite, Slack, Obsidian, Linear), definiowanie zalozen i procesow w tle, zarzadzanie zdarzeniami, izolacje agentow w systemach wieloagentowych, systemy samokontroli.

**Plik:** `lessons/txt/S04/s04e03-kontekstowa-wspolpraca-z-ai-1774999647.md`

### S04E04: Projektowanie wlasnej bazy wiedzy dla AI

Lekcja o budowaniu prywatnych baz wiedzy. Omawia mapowanie obszarow pomocy AI, strukture bazy wiedzy (Profile/World/Craft/Operations/System), szablony notatek i frontmatter, format Markdown, roznice miedzy baza wiedzy a pamiecia dlugoterminowa, modele do edycji notatek, polaczenie z agentami przez szablony.

**Plik:** `lessons/txt/S04/s04e04-projektowanie-wlasnej-bazy-wiedzy-dla-ai-1775085192.md`

### S04E05: Projektowanie rozwiazan wewnatrzfirmowych

Lekcja o zastosowaniu AI w firmach. Omawia aspekt biznesowy (koszty, prawo, vendor selection), kulturowy (buy-in, warsztaty), techniczny (wybor modeli, architektura agentow, optymalizacja). Przykłady: checklists, onboarding, style guides, content review. MCP Apps jako interfejsy interaktywne. Prywatnosc danych i weryfikacja ludzka.

**Plik:** `lessons/txt/S04/s04e05-projektowanie-rozwiazan-wewnatrzfirmowych-1775189135.md`

---

## Sezon 5 — Architektura, produkcja i nowa rzeczywistosc

### S05E01: Architektura aplikacji z AI

Lekcja o architekturze systemow AI. Omawia wzorzec Gateway, projektowanie API, dostep do systemu plikow, struktury baz danych, zarzadzanie zaleznosci, obsluge wielu providerow. Prymitywy vs funkcje, architektury agentow (Orchestrator, Blackboard, DAG), multi-provider support.

**Plik:** `lessons/txt/S05/s05e01-architektura-1775412680.md`

### S05E02: Zestaw narzedzi

Lekcja o budowaniu interfejsow uzytkownika dla AI. Omawia renderowanie Markdown, streaming, niestandardowe bloki (reasoning/tools/artifacts), interfejsy glosowe, ekosystem narzedzi (markdown-it, highlight.js, DOMPurify, live-kit). Zaawansowane komponenty UI i wzorce integracji narzedzi.

**Plik:** `lessons/txt/S05/s05e02-zestaw-narzedzi-1775625284.md`

### S05E03: Rozwoj funkcjonalnosci

Lekcja o cyklu zycia aplikacji AI. Omawia stabilnosc fundamentow vs dynamike wyzszych warstw, zarzadzanie rozwojem agentow (migracje modeli, zarzadzanie mozliwosciami), typowe awarie (rate limits, moderacja, wydajnosc, koszty, skutecznosc), wzorce sukcesu. Autoprompty i frameworki (DSPy/AX).

**Plik:** `lessons/txt/S05/s05e03-rozwoj-funkcjonalnosci-1775596919.md`

### S05E04: Produkcja

Lekcja o wyzwaniach produkcyjnych: usuwanie wiadomosci, halucynacje audio, pulapki obslugi narzedzi, problemy z dlugimi tekstami. Obszerny przyklad architektury enterprise z systemami wieloagentowymi, zarzadzaniem kontekstem, systemami zdarzen, integracja MCP, human-in-the-loop, observability, przetwarzaniem w tle.

**Plik:** `lessons/txt/S05/s05e04-produkcja-1775717856.md`

### S05E05: Nowa rzeczywistosc

Lekcja finalna — nowe mozliwosci spotykaja stare zasady. Omawia kompletny projekt "Wonderlands": zaawansowany system agentowy z digital garden (file-based wiki), wspolpraca wieloagentowa, integracja narzedzi MCP, sandbox execution, generowanie audio/obrazow, web browsing, przetwarzanie w tle. Praktyczna dyskusja o wspolpracy agentow, niestandardowych narzedziach, bazach wiedzy i zrownowazonych codziennych workflow z agentami AI.

**Plik:** `lessons/txt/S05/s05e05-secret-1775803400.md`
