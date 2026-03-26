## Zadanie

Twoim celem jest przygotowanie jednego lub dwóch narzędzi, które nasz automat wykorzysta do namierzenia miast oferujących wszystkie potrzebne mu przedmioty. Wtedy będzie mógł podjąć negocjacje cen ze znalezionymi miastami.

Automat sam wie najlepiej, co jest nam potrzebne do uruchomienia turbiny wiatrowej, aby zapewnić nam dodatkowe źródło zasilania.

Agent podaje parametry do Twoich narzędzi w języku naturalnym. Pamiętaj też, że musisz tak opisać te narzędzia, aby automat wiedział, jakie parametry i do którego narzędzia powinien przekazać.

Celem naszego agenta jest uzyskanie informacji, gdzie może kupić (nazwy miast) wszystkie potrzebne mu przedmioty. Potrzebne nam są miasta, które oferują WSZYSTKIE potrzebne przedmioty jednocześnie. Nasz agent musi pozyskać te informacje, korzystając z Twoich narzędzi.

Oto pliki będące podstawą wiedzy Twojego agenta:
https://hub.ag3nts.org/dane/s03e04\_csv/

W razie problemów użyj też naszego narzędzia do debugowania, abyś dokładnie wiedział, co dzieje się w backendzie.

**Nazwa zadania:** negotiations

Swoją odpowiedź jak zawsze do /verify

Przykład odpowiedzi:

```json
{
  "apikey": "tutaj-twoj-klucz",
  "task": "negotiations",
  "answer": {
    "tools": [
      {
        "URL": "https://twoja-domena.pl/api/narzedzie1",
        "description": "Opis pierwszego narzędzia - co robi i jakie parametry przyjmuje w polu params"
      },
      {
        "URL": "https://twoja-domena.pl/api/narzedzie2",
        "description": "Opis drugiego narzędzia - co robi i jakie parametry przyjmuje w polu params"
      }
    ]
  }
}
```

Agent wysyła zapytania POST do Twojego URL w formacie:

```json
{
  "params": "wartość przekazana przez agenta"
}
```

Oczekiwany format odpowiedzi:

```json
{
  "output": "odpowiedź dla agenta"
}
```

#### Ważne ograniczenia

- Odpowiedź narzędzia nie może przekraczać 500 bajtów i nie może być krótsza niż 4 bajty
- Agent ma do dyspozycji maksymalnie 10 kroków, aby dojść do odpowiedzi
- Agent będzie starał się namierzyć miasta dla 3 przedmiotów
- Możesz zarejestrować najwyżej 2 narzędzia (ale równie dobrze możesz ogarnąć wszystko jednym)
- Jeśli agent nie otrzymał żadnej odpowiedzi od narzędzia, to przerywa pracę

#### Jak udostępnić swoje API?

Zrób to podobnie jak w zadaniu S01E03. Możesz postawić endpointy na dowolnym serwerze, który jest publicznie dostępny, albo wykorzystać rozwiązania takie jak np. ngrok.

#### Weryfikacja

Weryfikacja jest asynchroniczna — po wysłaniu narzędzi musisz poczekać kilka sekund, a następnie odpytać o wynik. Zrobisz to wysyłając na ten sam adres /verify zapytanie z polem "action" ustawionym na "check":

```json
{
  "apikey": "tutaj-twoj-klucz",
  "task": "negotiations",
  "answer": {
    "action": "check"
  }
}
```

Możesz też sprawdzić wynik na panelu do debugowania w Centrali: https://hub.ag3nts.org/debug

### Krok po kroku

1. Pobierz pliki z wiedzą z lokalizacji https://hub.ag3nts.org/dane/s03e04\_csv/
2. Zastanów się, ile i jakich narzędzi potrzebujesz do przeszukiwania informacji o tym, jakie miasto oferuje na sprzedaż konkretny przedmiot
3. Przygotuj swoje 1-2 narzędzia, które umożliwią sprawdzenie, które miasto posiada poszukiwane przedmioty. Bądź gotowy, że agent wyśle zapytanie np. jako naturalne zapytanie "potrzebuję kabla długości 10 metrów" zamiast "kabel 10m"
4. Zgłoś adresy URL do centrali w ramach zadania i koniecznie dobrze opisz je, aby agent wiedział, kiedy ma ich używać i jakie dane ma im przekazać
5. Agent będzie używał Twoich narzędzi tak długo, aż zgromadzi wszystkie potrzebne informacje niezbędne do stwierdzenia, które miasta posiadają jednocześnie wszystkie potrzebne mu przedmioty
6. Agent sam zgłosi do centrali, które miasta znalazł i jeśli będą one poprawne, to otrzymasz flagę
7. Odbierz flagę za pomocą funkcji "check" opisanej wyżej lub odczytaj ją przez narzędzie do debugowania zadań. Pamiętaj, że agent potrzebuje trochę czasu (minimum 30-60 sekund), aby przygotować dla Ciebie odpowiedź