import chalk from "chalk";
import type { City, Item, Connection, CsvData } from "./types.ts";

const BASE_URL = "https://hub.ag3nts.org/dane/s03e04_csv";

function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseCsv<T>(raw: string, mapper: (cols: string[]) => T): T[] {
  const lines = raw.trim().split("\n");
  const rows = lines.slice(1); // skip header
  return rows.filter((l) => l.trim()).map((line) => mapper(line.split(",")));
}

async function fetchCsv(filename: string): Promise<string> {
  const url = `${BASE_URL}/${filename}`;
  console.log(chalk.cyan(`[load] Fetching ${url}`));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

export async function loadCsvData(): Promise<CsvData> {
  const [citiesRaw, itemsRaw, connectionsRaw] = await Promise.all([
    fetchCsv("cities.csv"),
    fetchCsv("items.csv"),
    fetchCsv("connections.csv"),
  ]);

  const cities = parseCsv<City>(citiesRaw, (cols) => ({
    name: cols[0].trim(),
    code: cols[1].trim(),
  }));

  const items = parseCsv<Item>(itemsRaw, (cols) => {
    const name = cols[0].trim();
    return {
      name,
      code: cols[1].trim(),
      nameNormalized: removeDiacritics(name).toLowerCase(),
    };
  });

  const connections = parseCsv<Connection>(connectionsRaw, (cols) => ({
    itemCode: cols[0].trim(),
    cityCode: cols[1].trim(),
  }));

  // Build indexes
  const cityByCode = new Map<string, string>();
  for (const c of cities) cityByCode.set(c.code, c.name);

  const itemByCode = new Map<string, Item>();
  for (const i of items) itemByCode.set(i.code, i);

  const connectionsByItem = new Map<string, string[]>();
  for (const conn of connections) {
    const list = connectionsByItem.get(conn.itemCode) ?? [];
    list.push(conn.cityCode);
    connectionsByItem.set(conn.itemCode, list);
  }

  console.log(
    chalk.green(
      `[load] Loaded ${cities.length} cities, ${items.length} items, ${connections.length} connections`,
    ),
  );

  return {
    cities,
    items,
    connections,
    cityByCode,
    itemByCode,
    itemsByName: items,
    connectionsByItem,
  };
}
