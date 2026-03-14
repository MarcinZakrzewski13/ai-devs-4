## Zadanie

Pobierz listę osób, które przeżyły 'Wielką Korektę' i które współpracują z systemem. Znajdziesz ją pod linkiem:
[https://hub.ag3nts.org/data/tutaj-twój-klucz/people.csv](https://hub.ag3nts.org/data/tutaj-tw%C3%B3j-klucz/people.csv)
- znajdziesz ten plik w katalogu `./lessons/ts/resources` 

Wiemy, że do organizacji transportów między elektrowniami angażowani są ludzie, którzy:

- są mężczyznami, którzy teraz w 2026 roku mają między 20, a 40 lat
- urodzonych w Grudziądzu
- pracują w branży transportowej

Każdą z potencjalnych osób musisz odpowiednio otagować. Mamy do dyspozycji następujące tagi:

- IT
- transport
- edukacja
- medycyna
- praca z ludźmi
- praca z pojazdami
- praca fizyczna

Jedna osoba może mieć wiele tagów. Nas interesują tylko ludzie pracujący w transporcie, którzy spełniają też poprzednie warunki.

Prześlij nam listę osób, którymi powinniśmy się zainteresować. Oczekujemy formatu odpowiedzi jak poniżej, wysłanego na adres https://hub.ag3nts.org/verify

Nazwa zadania to: **people**.

```json
{
       "apikey": "tutaj-twój-klucz-api",
       "task": "people",
       "answer": [
         {
           "name": "Jan",
           "surname": "Kowalski",
           "gender": "M",
           "born": 1987,
           "city": "Warszawa",
           "tags": ["tag1", "tag2"]
         },
         {
           "name": "Anna",
           "surname": "Nowak",
           "gender": "F",
           "born": 1993,
           "city": "Grudziądz",
           "tags": ["tagA", "tagB", "tagC"]
         }
       ]
     }
```

### Co należy zrobić w zadaniu?

1. **Pobierz dane z hubu** - plik `people.csv` dostępny pod linkiem z treści zadania (wstaw swój klucz API z https://hub.ag3nts.org/). Plik zawiera dane osobowe wraz z opisem stanowiska pracy (`job`).
2. **Przefiltruj dane** - zostaw wyłącznie osoby spełniające wszystkie kryteria: płeć, miejsce urodzenia, wiek.
3. **Otaguj zawody modelem językowym** - wyślij opisy stanowisk (`job`) do LLM i poproś o przypisanie tagów z listy dostępnej w zadaniu. Użyj mechanizmu Structured Output, aby wymusić odpowiedź modelu w określonym formacie JSON. Szczegóły we Wskazówkach.
4. **Wybierz odpowiednie osoby** - z otagowanych rekordów wybierz wyłącznie te z tagiem `transport`.
5. **Wyślij odpowiedź** - prześlij tablicę obiektów na adres `https://hub.ag3nts.org/verify` w formacie pokazanym powyżej (nazwa zadania: `people`).
6. **Zdobycie flagi** - jeśli wysłane dane będą poprawne, Hub w odpowiedzi odeśle flagę w formacie {FLG:JAKIES_SLOWO} - flagę należy wpisać pod adresem: https://hub.ag3nts.org/ (wejdź na tą stronę w swojej przeglądarce, zaloguj się kontem którym robiłeś zakup kursu i wpisz flagę w odpowiednie pole na stronie)