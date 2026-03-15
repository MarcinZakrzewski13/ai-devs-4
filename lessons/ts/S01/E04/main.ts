// Modele użyte w zadaniu:
//   - gpt-5-mini → Vision: odczyt kodu trasy z obrazu trasy-wylaczone.png

import chalk from "chalk";
import { config } from "dotenv";
import { loadDocs } from "./loadDocs.ts";
import { extractRouteCode } from "./extractRouteCode.ts";
import { buildDeclaration } from "./buildDeclaration.ts";
import { verifyAnswer } from "./verifyAnswer.ts";

config();

// 1. Pobierz dokumentację (w tym trasy-wylaczone.png)
console.log(chalk.blue("[main] Pobieranie dokumentacji SPK..."));
await loadDocs();

// 2. Odczytaj kod trasy Gdańsk–Żarnowiec z obrazu
const routeCode = await extractRouteCode();
console.log(chalk.blue(`[main] Kod trasy: ${routeCode}`));

// 3. Zbuduj deklarację
const today = new Date().toISOString().slice(0, 10);
const declaration = buildDeclaration({
  senderId: "450202122",
  origin: "Gdańsk",
  destination: "Żarnowiec",
  weightKg: 2800,
  category: "A",
  contentDescription: "kasety z paliwem do reaktora",
  wdp: 4,
  specialNotes: "",
  amountPp: 0,
  routeCode,
  date: today,
});

console.log(chalk.yellow("\n[main] Deklaracja:"));
console.log(chalk.gray("---"));
console.log(declaration);
console.log(chalk.gray("---"));

// 4. Wyślij do Hub
await verifyAnswer(declaration);
