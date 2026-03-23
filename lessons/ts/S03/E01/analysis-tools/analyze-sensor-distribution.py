#!/usr/bin/env python3
"""
Analiza rozkladu danych sensorowych - eksploracja przed implementacja.

Skrypt uzyty do zrozumienia struktury 9999 plikow JSON z sensorami:
- Jakie sa unikalne sensor_type i ich czestotliwosc
- Ile jest unikalnych notatek operatora
- Jakie notatki powtarzaja sie najczesciej

Wynik: 25 unikalnych typow sensorow (wszystkie kombinacje 5 bazowych),
       2032 unikalnych notatek (wiekszosc to parafrazy "wszystko OK").
"""

import os
import json
import collections

SENSORS_DIR = "../../resources/S03E01/sensors"

notes = collections.Counter()
types = collections.Counter()

for f in sorted(os.listdir(SENSORS_DIR)):
    if not f.endswith(".json"):
        continue
    d = json.load(open(os.path.join(SENSORS_DIR, f)))
    notes[d["operator_notes"]] += 1
    types[d["sensor_type"]] += 1

print("=== UNIQUE SENSOR TYPES ===")
for t, c in types.most_common():
    print(f"  {t}: {c}")

print(f"\n=== UNIQUE NOTES: {len(notes)} ===")
for n, c in notes.most_common(30):
    print(f"  [{c}x] {n[:100]}")

print(f"\n... total unique notes: {len(notes)}")
print(f"Total files: {sum(types.values())}")
