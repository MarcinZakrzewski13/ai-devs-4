# AI_Devs 4: Builders — przeglad materialow lekcyjnych

AI_Devs 4: Builders to kurs praktyczny poswiecony budowaniu produkcyjnych rozwiazan opartych na generatywnej sztucznej inteligencji. Kurs prowadzi od fundamentow interakcji z modelami jezykowymi (LLM) przez API, przez projektowanie narzedzi i agentow AI, az po zaawansowane systemy wieloagentowe z dlugoterminowa pamiecia i bazami wiedzy. Kazda lekcja laczy teorie z praktyka — materialy wideo, schematy architektoniczne i przyklady kodu uzupelniane sa zadaniami praktycznymi rozwiazywanymi w TypeScript (Bun). Kurs uczy swiadomego doboru narzedzi: kiedy uzyc LLM, a kiedy wystarczy deterministyczny kod; jak projektowac prompty, schematy i narzedzia; jak budowac odpornych agentow zdolnych do samodzielnej interakcji z otoczeniem.

Materialy lekcyjne znajduja sie w `lessons/txt/S01/` i `lessons/txt/S02/`. Kolejne sezony (S03–S05) beda dodawane w miare postepow kursu.

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
