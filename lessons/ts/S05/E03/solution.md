# S05E03 — shellaccess

## Podejście

Zadanie nie wymagało pisania kodu — tylko eksploracji zdalnego serwera przez API.

Endpoint `https://hub.ag3nts.org/verify` przyjmuje pole `answer.cmd` z komendą powłoki i zwraca jej output. Pliki danych w `/data/`:

- `time_logs.csv` — zdarzenia historyczne: `date;description;location_id;entry_id`
- `locations.json` — mapowanie `location_id → nazwa miasta`
- `gps.json` — mapowanie `entry_id → latitude, longitude, type`

## Kroki

1. `ls /data` — odkrycie trzech plików
2. `grep -i "cia\|znalezion\|odnalezion" /data/time_logs.csv` — szukanie wpisu o znalezieniu ciała → `2024-11-13;W jaskini znaleziono ciało mężczyzny...;219;954634`
3. `grep -A1 "location_id: 219" /data/locations.json` → **Grudziądz**
4. `grep -B5 "954634" /data/gps.json` → lat `53.432303`, lon `18.968774`
5. Data odpowiedzi = dzień PRZED znalezieniem = **2024-11-12**

## Odpowiedź

```json
{"date":"2024-11-12","city":"Grudziądz","longitude":18.968774,"latitude":53.432303}
```

## Wnioski z lekcji

- **Shell jako interfejs agenta** — zamiast pisać kod pobierający dane, sam serwer jest narzędziem. To jak dać agentowi terminal zamiast API klienta.
- **grep + jq to wystarczą** — przy dużych plikach (gps.json ~500 KB) nie można ich wypisać w całości (limit 4096 bajtów). `grep -B5 "entry_id"` i `grep -A1 "location_id"` pozwoliły wyciągnąć dokładnie to, co potrzeba.
- **Relacyjne dane w plikach** — trzy pliki działały jak JOIN w bazie: CSV → locations.json → gps.json. Warto rozpoznać ten wzorzec i prześledzić klucze obcne.
