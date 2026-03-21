import chalk from "chalk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import type { Product } from "./types.ts";

const CSV_URL = "https://hub.ag3nts.org/data";
const RESOURCES_DIR = "lessons/ts/resources/S02E01";
const ALL_FILE = `${RESOURCES_DIR}/all-products.csv`;
const CURRENT_FILE = `${RESOURCES_DIR}/current-batch.csv`;

function parseCSV(text: string): Product[] {
  const lines = text.trim().split("\n");
  return lines.slice(1).map((line) => {
    const match = line.match(/^(\w+),"(.+)"$/);
    if (!match) throw new Error(`Cannot parse CSV line: ${line}`);
    return { code: match[1], description: match[2] };
  });
}

function toCSVLine(p: Product): string {
  return `${p.code},"${p.description}"`;
}

export async function fetchProducts(): Promise<Product[]> {
  const apikey = process.env.API_KEY_AI_DEVS4;
  if (!apikey) throw new Error("API_KEY_AI_DEVS4 is not set in .env");

  const res = await fetch(`${CSV_URL}/${apikey}/categorize.csv`);
  const text = await res.text();
  const products = parseCSV(text);

  // Save current batch
  writeFileSync(CURRENT_FILE, "code,description\n" + products.map(toCSVLine).join("\n") + "\n");

  // Append to all-products (deduplicate by code)
  let allProducts: Product[] = [];
  if (existsSync(ALL_FILE)) {
    const existing = readFileSync(ALL_FILE, "utf-8");
    allProducts = parseCSV(existing);
  }
  const knownCodes = new Set(allProducts.map((p) => p.code));
  let newCount = 0;
  for (const p of products) {
    if (!knownCodes.has(p.code)) {
      allProducts.push(p);
      knownCodes.add(p.code);
      newCount++;
    }
  }
  writeFileSync(ALL_FILE, "code,description\n" + allProducts.map(toCSVLine).join("\n") + "\n");

  console.log(chalk.blue(`[fetch] ${products.length} products, ${newCount} new (${allProducts.length} total known)`));

  return products;
}

export function loadAllProducts(): Product[] {
  if (!existsSync(ALL_FILE)) return [];
  return parseCSV(readFileSync(ALL_FILE, "utf-8"));
}
