import { config } from "dotenv";
config();

import chalk from "chalk";
import { createDefaultProvider } from "@ai-devs/ai-core";
import { sendAnswer } from "@ai-devs/ai-devs-hub";
import { loadCsvData } from "./load-data.ts";
import { handleSearchItems } from "./handle-search.ts";
import { handleFindCities } from "./handle-cities.ts";
import type { ToolRequest, ToolResponse } from "./types.ts";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_URL = process.env.PUBLIC_URL;

// ── Boot ──

console.log(chalk.cyan("[main] Loading CSV data..."));
const data = await loadCsvData();
const provider = createDefaultProvider();

// ── HTTP Server ──

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let body: ToolRequest;
    try {
      body = (await req.json()) as ToolRequest;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (!body.params || typeof body.params !== "string") {
      return jsonResponse({ output: "Missing or invalid 'params' field" });
    }

    let result: ToolResponse;

    if (url.pathname === "/search-items") {
      result = await handleSearchItems(body, provider, data);
    } else if (url.pathname === "/find-cities") {
      result = await handleFindCities(body, provider, data);
    } else {
      result = { output: "Unknown endpoint. Use /search-items or /find-cities." };
    }

    // Enforce byte limits
    const outputBytes = Buffer.byteLength(result.output, "utf-8");
    if (outputBytes > 500) {
      result.output = result.output.slice(0, 490) + "...";
      console.log(chalk.yellow(`[main] Response truncated from ${outputBytes}B`));
    }

    return jsonResponse(result);
  },
});

function jsonResponse(data: ToolResponse): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}

console.log(chalk.green(`[main] Server running on http://localhost:${PORT}`));

// ── Register tools with Centrala ──

if (!PUBLIC_URL) {
  console.log(chalk.yellow("[main] PUBLIC_URL not set — skipping registration"));
  console.log(chalk.yellow("[main] Set PUBLIC_URL and restart, or register manually"));
} else {
  const baseUrl = PUBLIC_URL.replace(/\/$/, "");

  const toolsDef = {
    tools: [
      {
        URL: `${baseUrl}/search-items`,
        description:
          "Searches the product catalog by name or description. Send a product name, type, or technical specification in the 'params' field (e.g. 'copper cable 10m' or 'resistor 100 ohm'). Returns matching product names with their codes. Use these codes with the find-cities tool.",
      },
      {
        URL: `${baseUrl}/find-cities`,
        description:
          "Finds cities where a specific product is available for purchase. Send a product code (e.g. 'BWST28') obtained from search-items in the 'params' field. Returns a list of city names where this product can be bought.",
      },
    ],
  };

  console.log(chalk.cyan("[main] Registering tools with Centrala..."));
  console.log(chalk.dim(JSON.stringify(toolsDef, null, 2)));

  try {
    const regResponse = await sendAnswer("negotiations", toolsDef);
    console.log(chalk.green(`[main] Registration response: ${JSON.stringify(regResponse)}`));

    // Async check loop
    console.log(chalk.cyan("[main] Waiting for agent to process (30s)..."));
    await Bun.sleep(30_000);

    for (let attempt = 1; attempt <= 6; attempt++) {
      console.log(chalk.cyan(`[main] Check attempt ${attempt}/6...`));
      try {
        const checkResponse = await sendAnswer("negotiations", { action: "check" });
        console.log(chalk.green(`[main] Check response: ${JSON.stringify(checkResponse)}`));

        if (checkResponse.flag || checkResponse.message?.includes("{FLG:")) {
          console.log(chalk.bgGreen.black(`\n 🏁 FLAG FOUND: ${checkResponse.flag ?? checkResponse.message} \n`));
          break;
        }
      } catch (err) {
        console.log(chalk.yellow(`[main] Check attempt ${attempt} failed: ${err}`));
      }

      if (attempt < 6) {
        console.log(chalk.dim(`[main] Waiting 15s before next check...`));
        await Bun.sleep(15_000);
      }
    }
  } catch (err) {
    console.error(chalk.red(`[main] Registration failed: ${err}`));
  }
}

// Keep server alive
console.log(chalk.dim("[main] Server listening for incoming requests..."));
