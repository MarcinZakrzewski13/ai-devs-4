#!/usr/bin/env python3
"""
Deterministyczna detekcja anomalii danych sensorowych.

Skrypt wykrywa dwa typy anomalii bez uzycia LLM:
1. Aktywny sensor zwraca wartosc poza dozwolonym zakresem
2. Nieaktywny sensor (nie wymieniony w sensor_type) zwraca wartosc != 0

Mapowanie sensor_type -> pole danych:
  temperature -> temperature_K (553-873)
  pressure    -> pressure_bar (60-160)
  water       -> water_level_meters (5.0-15.0)
  voltage     -> voltage_supply_v (229.0-231.0)
  humidity    -> humidity_percent (40.0-80.0)

Wynik: 46 plikow z anomaliami danych (dane poza zakresem lub nieaktywny sensor != 0).
"""

import os
import json

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

data_anomalies = []

for f in sorted(os.listdir(SENSORS_DIR)):
    if not f.endswith(".json"):
        continue
    fid = f.replace(".json", "")
    d = json.load(open(os.path.join(SENSORS_DIR, f)))

    active_types = d["sensor_type"].split("/")
    active_fields = set(FIELD_MAP[t] for t in active_types)

    reasons = []

    # Sprawdz aktywne sensory - czy w zakresie
    for field in active_fields:
        val = d[field]
        lo, hi = RANGES[field]
        if val < lo or val > hi:
            reasons.append(f"{field}={val} out of [{lo},{hi}]")

    # Sprawdz nieaktywne sensory - czy == 0
    all_fields = set(RANGES.keys())
    inactive_fields = all_fields - active_fields
    for field in inactive_fields:
        if d[field] != 0:
            reasons.append(f"{field}={d[field]} but sensor inactive")

    if reasons:
        data_anomalies.append((fid, reasons, d["operator_notes"][:80]))

print(f"Data anomalies found: {len(data_anomalies)}")
for fid, reasons, note in data_anomalies:
    print(f"  {fid}: {reasons}")
    print(f"        note: \"{note}\"")
