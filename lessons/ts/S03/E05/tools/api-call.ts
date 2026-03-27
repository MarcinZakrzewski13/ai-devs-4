import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import chalk from "chalk";

const API_KEY = "faef93a0-8e63-4185-837b-a3634ae37a86";
const BASE_URL = "https://hub.ag3nts.org/api";

export const apiCallTool: AiTool = {
  name: "api_call",
  description:
    "Call a hub.ag3nts.org API endpoint. " +
    "Start with endpoint='toolsearch' to discover available tools. " +
    "All endpoints accept a natural-language 'query' parameter and return JSON. " +
    "Most endpoints return at most 3 best-matching results per query, " +
    "so make multiple queries with different keywords for full coverage.",
  inputSchema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        description:
          "API endpoint name, e.g. 'toolsearch'. " +
          "Discovered endpoints will have their own names.",
      },
      query: {
        type: "string",
        description: "Natural language query or keywords to send",
      },
    },
    required: ["endpoint", "query"],
    additionalProperties: false,
  },
  async execute(args: { endpoint: string; query: string }) {
    try {
      console.log(
        chalk.gray(`  [api_call] ${args.endpoint}: "${args.query}"`)
      );

      const res = await fetch(`${BASE_URL}/${args.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: API_KEY, query: args.query }),
      });

      const data = await res.json();
      return toolOk(data);
    } catch (e) {
      return toolErr(`API call failed: ${e}`);
    }
  },
};
