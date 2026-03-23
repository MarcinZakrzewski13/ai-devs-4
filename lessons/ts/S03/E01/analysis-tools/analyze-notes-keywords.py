#!/usr/bin/env python3
"""
Analiza notatek operatora - proba keyword matching i odkrycie limitacji.

Skrypt przeszukuje notatki plikow z POPRAWNYMI danymi (po odrzuceniu 46 anomalii danych)
szukajac notatek ktore falszywie raportuja bledy.

Problem: proste keyword matching generuje false positives z powodu negacji:
  - "nothing suggests a fault" zawiera "fault" ale mowi OK
  - "no concerning drift" zawiera "concern" ale mowi OK
  - "no sign of abnormal activity" zawiera "abnormal" ale mowi OK

Wynik: ~5 notatek w validnych plikach ktore faktycznie raportuja bledy.
Wniosek: potrzebny LLM do poprawnej klasyfikacji notatek (negacje sa zbyt zlozone
         dla prostego keyword matching). Ale LLM potrzebny tylko dla tych ~1993
         unikalnych notatek z validnych plikow, nie dla wszystkich 9999 plikow.
"""

import os
import json
import collections

SENSORS_DIR = "../../resources/S03E01/sensors"

RANGES = {
    "temperature_K": (553, 873),
    "pressure_bar": (60, 160),
    "water_level_meters": (5.0, 15.0),
    "voltage_supply_v": (229.0, 231.0),
    "humidity_percent": (40.0, 80.0),
}
FIELD_MAP = {
    "temperature": "temperature_K",
    "pressure": "pressure_bar",
    "water": "water_level_meters",
    "voltage": "voltage_supply_v",
    "humidity": "humidity_percent",
}

# Krok 1: odfiltruj pliki z anomaliami danych
valid_notes = collections.Counter()
data_anomaly_ids = set()

for f in sorted(os.listdir(SENSORS_DIR)):
    if not f.endswith(".json"):
        continue
    fid = f.replace(".json", "")
    d = json.load(open(os.path.join(SENSORS_DIR, f)))

    active_types = d["sensor_type"].split("/")
    active_fields = set(FIELD_MAP[t] for t in active_types)

    has_anomaly = False
    for field in active_fields:
        val = d[field]
        lo, hi = RANGES[field]
        if val < lo or val > hi:
            has_anomaly = True
    for field in set(RANGES.keys()) - active_fields:
        if d[field] != 0:
            has_anomaly = True

    if has_anomaly:
        data_anomaly_ids.add(fid)
    else:
        valid_notes[d["operator_notes"]] += 1

print(f"Valid data files: {9999 - len(data_anomaly_ids)}")
print(f"Unique notes in valid-data files: {len(valid_notes)}")

# Krok 2: keyword matching z uwzglednieniem negacji
PROBLEM_KEYWORDS = [
    "unstable", "error", "fault", "concern", "suspicious", "irregul",
    "unusual", "anomal", "doubt", "compromis", "malfunction", "unreliable",
    "questionable", "not normal", "investigation", "serious", "attention",
    "risky", "not healthy", "not right", "not comfortable", "not the pattern",
]
NEGATION_PHRASES = [
    "nothing suggests a fault",
    "no concerning",
    "no sign of abnormal",
    "no irregular",
    "no deviations",
]

print("\n=== Notes with problem keywords (after negation filtering) ===")
problem_notes = []
for note, cnt in valid_notes.most_common():
    lower = note.lower()
    # Filtruj negacje
    if any(neg in lower for neg in NEGATION_PHRASES):
        continue
    if any(kw in lower for kw in PROBLEM_KEYWORDS):
        problem_notes.append((note, cnt))

print(f"Likely problem notes: {len(problem_notes)}")
for n, c in problem_notes:
    print(f"  [{c}x] {n}")

# Krok 3: pokaz ktore pliki maja te notatki
print("\n=== Files with valid data but problem-reporting notes ===")
for f in sorted(os.listdir(SENSORS_DIR)):
    if not f.endswith(".json"):
        continue
    fid = f.replace(".json", "")
    if fid in data_anomaly_ids:
        continue
    d = json.load(open(os.path.join(SENSORS_DIR, f)))
    if d["operator_notes"] in [n for n, _ in problem_notes]:
        print(f"  {fid}: sensor_type={d['sensor_type']}")
        print(f"        note: \"{d['operator_notes']}\"")

# Krok 4: pokaz false positives - notatki z negacjami (mowia OK ale zawieraja problem keywords)
print("\n=== False positives (negation phrases with problem keywords) ===")
fp_count = 0
for note, cnt in valid_notes.most_common():
    lower = note.lower()
    if any(neg in lower for neg in NEGATION_PHRASES):
        if any(kw in lower for kw in PROBLEM_KEYWORDS):
            fp_count += cnt
            if cnt >= 5:
                print(f"  [{cnt}x] {note[:120]}")
print(f"\nTotal false positive occurrences: {fp_count}")
print(">>> Wniosek: keyword matching nie wystarcza, potrzebny LLM do klasyfikacji notatek")
