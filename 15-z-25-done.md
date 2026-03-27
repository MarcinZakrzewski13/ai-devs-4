# 15 z 25 — Raport poldrogi

Krytyczna retrospektywa projektu AI Devs 4 Builder w punkcie 60% ukonczenia.
Data: 2026-03-28. Zadania: 15 ukonczonych, 10 pozostalych.

---

## 1. Mapa postepu

| Sezon | Epizody | Dominujacy wzorzec | Zlozonosc |
|-------|---------|-------------------|-----------|
| S01 (5/5) | E01–E05 | Fundamenty: pipeline, function calling, vision, API discovery | Niska–srednia |
| S02 (5/5) | E01–E05 | Kontekst: optymalizacja promptow, deterministyka, agent loops | Srednia |
| S03 (5/5) | E01–E05 | Narzedzia: hybrydowe przetwarzanie, multi-agent, knowledge base | Srednia–wysoka |
| S04 (0/5) | — | Przewidywane: RAG, embeddingi, bazy wektorowe, grafy | Wysoka |
| S05 (0/5) | — | Przewidywane: systemy produkcyjne, integracje, final | Bardzo wysoka |

### Os czasu zlozonosci

```
S01E01  CSV → filter → classify (Structured Output)
S01E02  API calls + Haversine (bez LLM)
S01E03  Function calling + agent loop + serwer HTTP
S01E04  Vision + Structured Output + dokumentacja
S01E05  API discovery + rate limit breaking (bez LLM)
  ──────────────────────────────────────────────────
S02E01  Iteracyjna optymalizacja promptu (33 tokeny, caching)
S02E02  Pixelowa detekcja kabli (bez LLM, deterministyka)
S02E03  Kompresja logow (regex + dedup, bez LLM)
S02E04  Agent loop z 6 narzedziami (mailbox search, Gemini Flash)
S02E05  Vision (gpt-5.4) + deterministyczna nawigacja drona
  ──────────────────────────────────────────────────
S03E01  Hybrydowa detekcja anomalii (9999 plikow, $0.04)
S03E02  Agent loop na VM (Claude Sonnet, 27 iteracji, firmware debug)
S03E03  Game loop z predykcja stanu (bez LLM)
S03E04  Guard LLM + normalizer + search pipeline (tool building)
S03E05  Multi-agent: discovery → knowledge base → route planner
```

**Obserwacja:** 5 z 15 zadan (33%) rozwiazanych bez zadnego wywolania LLM. To byl swiadomy wybor — "dobieraj narzedzia do problemu". Ale DL-023 (dodany pod koniec S03) wymusza zmiane filozofii: nawet gdy determinizm wystarczy, zadanie powinno demonstrowac uzycie LLM jako decydenta. Produktywne napiecie miedzy pragmatyzmem a celami dydaktycznymi kursu.

---

## 2. Ewolucja architektury

### Trzy fazy

**Faza 1 — Monolity i refaktoring (S01E01–E04)**
Pierwsze zadania napisane jako pojedyncze pliki, natychmiast zrefaktoryzowane do modularnej struktury (ADR-001). Kazdy modul eksportuje jedna funkcje, `main.ts` to czysta orkiestracja. Ten wzorzec przetrwal caly projekt bez zmian.

**Faza 2 — Monorepo kernel (S01E03–S02E05)**
Toolset rozrastal sie organicznie. ADR-002 wymusil ekstrakcje do `packages/`: ai-core (provider LLM), ai-devs-hub (komunikacja z Centrala). DL-009 zrefaktoryzowal wstecznie S01E01-E04. Powstal tez `@ai-devs/geo-utils` — caly pakiet Bun workspace dla jednej funkcji (haversineDistanceKm).

**Faza 3 — MCP i multi-agent (S03E04–E05)**
ADR-003: wspoldzielony serwer MCP z dwoma transportami (stdio + HTTP/SSE), implementacja reczna bez SDK. ADR-004: dwufazowa architektura agentowa z Knowledge Base jako interfejsem miedzy agentami.

### Co zadziałało

- **Modularna struktura zadan (ADR-001):** Kazde zadanie to czytelny pipeline. main.ts jako spis tresci rozwiazania. Debugging prosty — wiadomo ktory modul odpowiada za co.
- **createDefaultProvider():** Abstrakcja nad OpenRouter/OpenAI. Zmiana modelu = zmiana jednego stringa. Fallback na OpenAI gdy brak klucza OpenRouter.
- **loadFinalAnswer() / saveFinalAnswer():** Cross-episode dependencies dzialaja bezproblemowo (S01E02 laduje wyniki S01E01).
- **Decision log:** 23 wpisy dokumentuja mikro-decyzje. Umozliwily napisanie tego raportu bez odtwarzania kontekstu z pamieci.

### Co jest over-engineered

- **Serwer MCP (ADR-003):** 11 plikow TS, dwa transporty, reczna implementacja protokolu JSON-RPC 2.0. Uzyty w dokladnie 0 zadaniach po 15 epizodach. Zbudowany "na zapas" z przewidywaniem finalowego zadania. Moze sie oplacic w S04-S05 — ale na dzien dzisiejszy to martwy kod.
- **@ai-devs/geo-utils:** Caly pakiet Bun workspace (package.json, tsconfig path, index.ts) dla jednej funkcji 15-liniowej. Prosty plik `utils/haversine.ts` w ai-core wystarczylby.
- **EventBus + RunReporter (ai-core/obs):** 3 pliki infrastruktury obserwacyjnej. Niejasne ile zadan z nich faktycznie korzysta.
- **Session logging (DL-006):** Infrastruktura JSONL per session. Uzyta w 1 zadaniu (S01E03). 8 katalogow sesji z jednego zadania.
- **Refactoring starych zadan (DL-009):** Wyrownanie S01E01-E04 do nowej architektury. Zadania juz rozwiazane. Czy to nauka czy busy work?

---

## 3. Ewolucja uzycia LLM

### Modele i ich role

| Model | Uzyty w | Rola |
|-------|---------|------|
| gpt-5-nano | S03E01 | Tani klasyfikator binarny (notatki sensorow) |
| gpt-5-mini | S01E01, S01E03, S01E04, S03E05 | Domyslny: structured output, function calling, planowanie |
| gpt-5 | S02E03 (wzmianki) | Tokenizacja porownawcza |
| gpt-5.4 | S02E05 | Vision — analiza mapy z siatka |
| google/gemini-3-flash-preview | S02E04 | Agent loop (mailbox search, tani i szybki) |
| anthropic/claude-sonnet-4-6 | S02E01, S03E02 | Optymalizacja promptu, agentowy debugging VM |

### Progresja technik

```
Structured Output ──→ Function Calling ──→ Agent Loop ──→ Multi-Agent + Knowledge Base
    (S01E01)            (S01E03)           (S02E04)          (S03E05)
```

Kazda technika jest nadzbiorem poprzedniej. Structured Output uczy formatowania odpowiedzi, function calling dodaje interakcje ze swiatem, agent loop dodaje wielokrokowe rozumowanie, multi-agent dodaje specjalizacje i podział pracy.

### Koszty

| Zadanie | Model | Szacowany koszt |
|---------|-------|----------------|
| S01E01 | gpt-5-mini | ~$0.01 |
| S01E02 | brak | $0.00 |
| S01E03 | gpt-5-mini | ~$0.02 |
| S01E04 | gpt-5-mini | ~$0.01 |
| S01E05 | brak | $0.00 |
| S02E01 | claude-sonnet + hub | ~$0.05 |
| S02E02 | brak | $0.00 |
| S02E03 | brak | $0.00 |
| S02E04 | gemini-flash | ~$0.03 |
| S02E05 | gpt-5.4 | ~$0.08 |
| S03E01 | gpt-5-nano | ~$0.04 |
| S03E02 | claude-sonnet-4-6 | ~$0.20 |
| S03E03 | brak | $0.00 |
| S03E04 | gpt-5-nano + gpt-5-mini | ~$0.03 |
| S03E05 | gpt-5-mini x2 | ~$0.05 |
| **Razem** | | **~$0.52** |

Laczny koszt LLM za 15 zadan: ponizej $1. Najdrozsze zadanie (S03E02: $0.20) to 27-iteracyjny agent loop na VM. Najtansze z LLM (S03E01: $0.04) to 9999 plikow przetworzonych hybrydowo. Stosunek koszt/wartosc jest doskonaly.

---

## 4. Wzorce i antywzorce

### Wzorce ktore sie sprawdzily

| Wzorzec | Gdzie | Dlaczego dziala |
|---------|-------|----------------|
| **Deduplikuj przed LLM** | S02E03, S03E01 | 94% redukcja danych. 9953 pliki → 1993 unikalne notatki. Koszt 5x nizszy |
| **Discovery before action** | S01E05, S02E04, S03E02, S03E05 | `help`/`toolsearch` ujawnia mozliwosci API bez zgadywania. Oszczedza iteracje |
| **LLM jako sedzia, nie pracownik** | S02E03, S03E01, S03E04 | LLM klasyfikuje/decyduje, kod przetwarza. Najlepsza proporcja koszt/jakosc |
| **Cache expensive operations** | S02E05, S03E05 | Vision/discovery results w tmp/. Reruns bez kosztow LLM |
| **Guard LLM** | S03E04 | Tani model waliduje input. Fail-open vs fail-closed jako decyzja biznesowa |
| **Hardcoded override w toolach** | S01E03 | Model decyduje "co", system kontroluje "jak". Bezpieczenstwo bez ograniczania agenta |
| **Knowledge base jako interfejs** | S03E05 (ADR-004) | Agenci nie rozmawiaja — wiedza jest interfejsem. Debugowalne, testowalny, injectable |
| **Predykcja stanu > reakcja** | S03E03 | Nie "gdzie bloki SA" lecz "gdzie BEDA". Kluczowe dla dynamicznych srodowisk |

### Antywzorce i bledy

| Antywzorzec | Gdzie | Co poszlo nie tak |
|-------------|-------|------------------|
| **Premature abstraction** | geo-utils, MCP server | Caly pakiet dla 1 funkcji. Serwer MCP uzyty 0 razy |
| **Refactoring ukonczonych zadan** | DL-009 (S01E01-E04) | Zadania juz dzialaly. Czas spedzony na wyrownaniu do nowej architektury |
| **Over-documentation** | 23 DL + 4 ADR + compliance report | Dokumentacja pochlanela znaczacy czas. Czy proporcjonalna do wartosci? |
| **Feature flag one-off** | RAILWAY_FAST (S01E05) | Sprytne ale skrajnie specyficzne. Nie reuzyte |
| **Python w projekcie TS** | S03E01 analysis-tools/ | 3 skrypty Python w TypeScriptowym projekcie. Dzialaja ale lamia spojnosc |

---

## 5. Dokumentacja jako narzedzie

Projekt ma trzy warstwy dokumentacji:

1. **Architektura (.ai/):** architecture.md, ADRy, decision-log, tasks-index — mapa projektu
2. **Rozwiazania (solution.md):** Co, jak, dlaczego + "Wnioski z lekcji" z analogiami
3. **Kontekst AI (CLAUDE.md + rules/):** Instrukcje dla Claude Code — w praktyce "context injection"

### Meta-lekcja

Dokumentacja w tym projekcie pelni podwojna role. Oficjalnie: pomoc przyszlemu-sobie w zrozumieniu decyzji. Praktycznie: kontekst dla AI assistanta, ktory pisze wiekszosc kodu. CLAUDE.md + .ai/rules/general.md + .ai/architecture.md to nie dokumentacja w tradycyjnym sensie — to **programowanie AI przez tekst**.

Format "Wnioski z lekcji" w solution.md (analogia + przyklad zastosowania) jest wartosciowy. Najlepszy przyklad: S02E03 — analogia Marie Kondo do deduplikacji, triaz na izbie przyjec do priorytetowej degradacji. Te analogie sa zapamietywalne i przenoszalne.

Pytanie: czy solution.md pisane przez AI assistanta sa autentycznymi wnioskami uczestnika, czy raczej dobrze sformatowanym podsumowaniem sesji? Odpowiedz jest prawdopodobnie "cos pomiedzy" — i to jest normalne w 2026.

---

## 6. Extra flagi

| Flaga | Zadanie | Jak znaleziona |
|-------|---------|---------------|
| VIBECODER | S02E03 | Token count = ASCII code, metafora radiotelegrafii |
| BILBOBAGGINS | S03E03 | Eksploracja poza specyfikacja zadania |
| ABEAVER | S03E05 | Knowledge base agent rozumowal o bobrach |

Extra flagi nagradzaja ciekawosc i myslenie lateralne. Nie sa czescia oficjalnego zadania — wymagaja wyjscia poza schemat. VIBECODER (token count → ASCII) jest najciekawsza — wymaga polaczenia wiedzy o tokenizerach z kryptografia.

---

## 7. Samokrytyka

### Gdzie marnowano czas

- **Refaktoring ukonczonych zadan (DL-009):** S01E01-E04 dzialaly poprawnie. Wyrownanie do nowej architektury zabralo czas bez zmiany wynikow.
- **Budowa MCP server (ADR-003):** 11 plikow, dwa transporty, reczna implementacja. Po 15 zadaniach — 0 uzyc. Jesli S04-S05 go nie potrzebuja, to czysty over-engineering.
- **Compliance report + dependency structure:** Jednorazowe dokumenty audytowe dla 4 zadan. Wartosc diagnostyczna, ale koszt wytworzenia nieproporcjonalny.

### Co bylo over-engineered

- **geo-utils:** Bun workspace package dla jednej funkcji haversineDistanceKm. Moglby byc plik utility w ai-core.
- **Dwa transporty MCP (stdio + HTTP/SSE):** Stdio wystarczyloby. HTTP/SSE dodane "na wszelki wypadek".
- **EventBus + RunReporter:** Zbudowane dla obserwacyjnosci, ktora nie byla w pelni wykorzystana.
- **Session logging z osobnymi katalogami per restart:** 8 katalogow sesji z jednego zadania (S01E03).

### Co zrobiono dobrze

- **Swiadomosc kosztow:** $0.52 za 15 zadan. Kazdy plan mial szacunek kosztow (DL-016). W realnych projektach LLM to rzadka umiejetnosc.
- **Pragmatyczne wybory:** Pixelowa detekcja zamiast Vision w S02E02 ($0.00 vs ~$0.10). Determinizm gdzie wystarczal.
- **Progresywna zlozonosc:** Structured Output → Function Calling → Agent Loop → Multi-Agent. Kazdy krok budowal na poprzednim, nie skakano na glebokie wody.
- **3 extra flagi:** Dowod ciekawosci i myslenia poza schemat.
- **Konsekwentna struktura zadan:** Kazde z 15 zadan ma ta sama architekture modulowa. Czytelnosc i nawigacja bez wysilku.

### Uczciwe pytanie: kto pisal kod?

Projekt intensywnie korzysta z Claude Code (widoczne z CLAUDE.md, hooks, skills, pre-tool-use safety). Decision log entries czytaja sie jak podsumowania sesji z AI. Solution.md sa napisane jezykiem, ktory pasuje bardziej do LLM niz do czlowieka.

To nie jest zarzut — to obserwacja. W 2026 granica miedzy "napisalem kod" a "nakierowalem AI ktora napisala kod" jest rozmyta. Kluczowe pytanie: czy uczestnik rozumie DLACZEGO kod wyglada tak a nie inaczej? Jesli tak — sposob wytworzenia jest drugorzedny. Jesli nie — solution.md sa fikcja.

---

## 8. Gotowosc na S04-S05

### Co jest gotowe

- **Infrastruktura pakietow:** ai-core (provider, tools, prompts), ai-devs-hub (odpowiedzi, cross-episode). Gotowe i przetestowane.
- **Wzorzec agent loop:** Przecwiczony 4 razy (S01E03, S02E04, S03E02, S03E05). Rozny poziom zlozonosci i rozne modele.
- **Multi-agent z knowledge base (ADR-004):** Najdojrzalszy wzorzec architektoniczny. Reużywalny: zmien tools + prompts, zachowaj structure.
- **6 modeli w arsenale:** Od gpt-5-nano ($0.001/call) po gpt-5.4 ($0.08/call). Kazdy przetestowany w boju.
- **Nawyk dokumentowania:** solution.md, decision-log, ADR — workflow jest automatyczny.

### Czego brakuje (przewidywane luki)

- **Bazy wektorowe (Qdrant):** Env var `QDRANT_URL` wspomniany w architecture.md ale nigdy nie uzyty. Zero doswiadczenia z embeddings, chunking, semantic search.
- **Bazy grafowe (Neo4j):** Env var `NEO4J_URI` zarezerwowany. Brak doswiadczenia z traversal, Cypher queries.
- **RAG pipeline:** Brak: document loader → chunker → embedder → vector store → retriever → generator. To duzy gap.
- **Pamiec dlugoterminowa agenta:** Knowledge base (ADR-004) to krok w dobrym kierunku, ale dotyczy jednej sesji. Pamiec miedzy sesjami nie istnieje.
- **Produkcyjnosc:** Brak: error recovery, retry z backoff (poza S01E05), monitoring, rate limiting wlasnych endpointow.

### Prognoza

S04 prawdopodobnie wprowadzi embeddingi i bazy wektorowe — to naturalny nastepny krok po agent loops. S05 prawdopodobnie bedzie integracja wszystkiego: agent z narzedziami + RAG + graf + produkcyjne endpointy. Serwer MCP moze wreszcie sie przydac.

---

## 9. Kluczowe liczby

| Metryka | Wartosc |
|---------|---------|
| Zadania ukonczone | 15/25 (60%) |
| Pliki TS (implementacje zadan) | 118 |
| Pliki TS (pakiety wspoldzielone) | 34 |
| Srednia plikow TS na zadanie | ~7.9 |
| Zadania bez LLM | 5/15 (33%) |
| ADR | 4 |
| Wpisy decision-log | 23 |
| Pliki solution.md | 15/15 (100%) |
| Extra flagi | 3 |
| Modele LLM uzyte | 6 |
| Szacowany laczny koszt LLM | ~$0.52 |
| Najdrozsze zadanie | S03E02 (~$0.20) |
| Najtansze z LLM | S03E01 (~$0.04) |
| Pakiety wspoldzielone | 4 (ai-core, ai-devs-hub, geo-utils, mcp-tools) |

---

## 10. Wnioski

1. **Najtrudniejsza lekcja: kiedy NIE uzywac LLM — i kiedy mimo to uzyc.** 33% zadan rozwiazanych determinisycznie. Pragmatycznie sluszne, ale kurs uczy budowania systemow z LLM. DL-023 wymuszil przewartosciowanie: nawet gdy determinizm wystarczy, opakuj go jako tool dla agenta. Produktywne napiecie miedzy inzynieria a dydaktyka.

2. **Architektura ewoluowala reaktywnie i to jest OK.** Kazdy ADR byl odpowiedzia na bol odczuty w poprzedniej fazie. YAGNI respektowane — z wyjatkiem MCP servera (proaktywny, 0 uzyc). W projekcie dydaktycznym reactive architecture > premature abstraction.

3. **Dokumentacja to jednoczesnie najwieksza sila i najwiekszy kosztochlon.** 23 decision-log entries + 4 ADRy + 15 solution.md + tasks-index + compliance report. Umozliwiaja ten raport. Ale czas spedzony na dokumentacji mogl isc na dodatkowe eksperymenty z kodem. Balans wymaga kalibracji.

4. **Swiadomosc kosztow LLM to prawdziwa umiejetnosc.** $0.52 za 15 zadan przy zachowaniu jakosci. Wzorce "deduplikuj przed LLM", "najtanszy model ktory dziala", "cache expensive operations" to nie optymalizacja przedwczesna — to higiena produkcyjna.

5. **Przejscie od "rozwiaz problem" do "zbuduj system rozwiazujacy problem" nastapilo w S03.** S01-S02 to pojedyncze skrypty z pipeline. S03 to systemy: guard + normalizer + search (E04), discovery + knowledge base + planner (E05). Pozostale 10 zadan prawdopodobnie bedzie wymagac myslenia systemowego, nie skryptowego.
