import { toolOk, toolErr, type AiTool } from "@ai-devs/ai-core";
import { saveTmpAnswer, saveFinalAnswer } from "@ai-devs/ai-devs-hub";
import chalk from "chalk";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const API_KEY = process.env.API_KEY_AI_DEVS4!;
const HUB_URL = "https://hub.ag3nts.org/verify";
const OKO_BASE = "https://oko.ag3nts.org";
const TASK_NAME = "okoeditor";
const EPISODE_ID = "S04E01";
const TMP_DIR = join(import.meta.dir, "../../resources/S04E01/tmp");
const MAX_PAGE_FETCHES = 20;

const okoApiCallTool: AiTool = {
  name: "oko_api_call",
  description:
    "Send a request to the OKO Operational Center API. " +
    "You MUST start by calling this with answer={\"action\":\"help\"} to discover available operations. " +
    "The 'answer' parameter is the FULL answer object sent to the API — include ALL fields " +
    "(action, page, id, content, etc.) as specified by the API documentation from help.",
  inputSchema: {
    type: "object",
    properties: {
      answer: {
        type: "object",
        description:
          "The complete answer object to send to the API. " +
          "Must always contain an 'action' field. " +
          "For help: {\"action\": \"help\"}. " +
          "For other actions: include all required fields as documented by the help response.",
      },
    },
    required: ["answer"],
    additionalProperties: false,
  },
  async execute(args: { answer: Record<string, unknown> }) {
    try {
      const answer = args.answer;
      console.log(chalk.gray(`  [oko_api] ${JSON.stringify(answer)}`));

      const res = await fetch(HUB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: API_KEY, task: TASK_NAME, answer }),
      });

      if (!res.ok) {
        // Retry once after 1s on network error
        await new Promise((r) => setTimeout(r, 1000));
        const retry = await fetch(HUB_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apikey: API_KEY, task: TASK_NAME, answer }),
        });
        const data = await retry.json();
        return toolOk(data);
      }

      const data = await res.json();
      return toolOk(data);
    } catch (e) {
      return toolErr(`API call failed: ${e}`);
    }
  },
};

// ─── fetch_oko_page: Web panel reader with anti-trap protections ───

let okoCookies: string | null = null;
let pageFetchCount = 0;
const visitedPages = new Map<string, string>(); // path → parsed content cache

const loginToOko = async (): Promise<string> => {
  if (okoCookies) return okoCookies;

  const body = new URLSearchParams({
    action: "login",
    login: "Zofia",
    password: "Zofia2026!",
    access_key: API_KEY,
  });

  // Step 1: POST login — capture Set-Cookie from response
  const res = await fetch(OKO_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    redirect: "manual",
  });

  // Server returns 2 Set-Cookie headers: pre-login + post-login session.
  // We need the LAST one (the authenticated session).
  let cookies = "";
  if (typeof res.headers.getSetCookie === "function") {
    const arr = res.headers.getSetCookie();
    if (arr.length > 0) {
      // Use the last cookie (post-login session)
      cookies = arr[arr.length - 1].split(";")[0];
    }
  } else {
    const setCookieHeader = res.headers.get("set-cookie");
    if (setCookieHeader) {
      // Fallback: split multiple cookies and take the last one
      const parts = setCookieHeader.split(/,(?=\s*\w+=)/);
      cookies = parts[parts.length - 1].split(";")[0].trim();
    }
  }

  if (!cookies) {
    console.log(chalk.red("  [oko_page] WARNING: No cookies received from login!"));
    console.log(chalk.gray(`  [oko_page] Status: ${res.status}, Headers:`));
    res.headers.forEach((v, k) => console.log(chalk.gray(`    ${k}: ${v}`)));
  }

  okoCookies = cookies;
  console.log(chalk.gray(`  [oko_page] logged in, cookies: ${okoCookies?.slice(0, 80)}`));

  // Step 2: Follow redirect if present to establish session
  const location = res.headers.get("location");
  if (location) {
    const redirectUrl = location.startsWith("http") ? location : `${OKO_BASE}${location}`;
    await fetch(redirectUrl, { headers: { Cookie: okoCookies } });
    console.log(chalk.gray(`  [oko_page] followed redirect to ${location}`));
  }

  return okoCookies;
};

const sanitizeHtml = (html: string): string => {
  // Remove <script> and <style> blocks entirely
  let clean = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  clean = clean.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Remove hidden elements (display:none, visibility:hidden, opacity:0)
  clean = clean.replace(/<[^>]+(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");

  // Remove elements with copy-trap or oncopy/onpaste attributes
  clean = clean.replace(/<[^>]+(?:oncopy|onpaste|oncut|class="[^"]*copy)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");

  return clean;
};

const htmlToText = (html: string): string => {
  // Extract <main> if present, otherwise <body>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = mainMatch?.[1] ?? bodyMatch?.[1] ?? html;

  content = sanitizeHtml(content);

  // Convert links to markdown-style, preserving href for ID extraction
  content = content.replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
    const cleanText = text.replace(/<[^>]+>/g, "").trim();
    return `[${cleanText}](${href})`;
  });

  // Convert headings
  content = content.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) => {
    const cleanText = text.replace(/<[^>]+>/g, "").trim();
    return `${"#".repeat(Number(level))} ${cleanText}\n`;
  });

  // Convert paragraphs and divs to newlines
  content = content.replace(/<\/?(p|div|li|tr|br\s*\/?)[^>]*>/gi, "\n");

  // Convert spans with classes to preserve pill/badge info
  content = content.replace(/<span[^>]*class="([^"]*pill[^"]*)"[^>]*>([\s\S]*?)<\/span>/gi, (_, cls, text) => {
    return `[${text.replace(/<[^>]+>/g, "").trim()}]`;
  });

  // Strip remaining HTML tags
  content = content.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  content = content.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ");

  // Collapse whitespace
  content = content.replace(/[ \t]+/g, " ");
  content = content.replace(/\n{3,}/g, "\n\n");
  content = content.trim();

  // Limit length
  if (content.length > 8000) {
    content = content.slice(0, 8000) + "\n\n[...truncated at 8000 chars]";
  }

  return content;
};

const persistPage = async (path: string, content: string) => {
  await mkdir(TMP_DIR, { recursive: true });
  const safePath = path.replace(/^\//, "").replace(/\//g, "-") || "root";
  const filename = `page-${Date.now()}-${safePath}.txt`;
  const fullContent = `URL: ${OKO_BASE}${path}\nTimestamp: ${new Date().toISOString()}\n\n${content}`;
  await writeFile(join(TMP_DIR, filename), fullContent, "utf-8");
  console.log(chalk.gray(`  [oko_page] saved to ${filename}`));
};

const fetchOkoPageTool: AiTool = {
  name: "fetch_oko_page",
  description:
    "Fetch and parse a page from the OKO web panel (https://oko.ag3nts.org). " +
    "Use this to discover entry IDs, classification codes, current state, and verify changes. " +
    "The tool handles login automatically. HTML is sanitized (hidden elements, scripts, prompt injections removed). " +
    "Links are preserved as [text](/path) for ID extraction. " +
    "Limit: max 20 page fetches per session. " +
    "Set force_refresh=true to bypass cache and re-fetch a previously visited page (use this to verify changes after API updates).",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Path to fetch, e.g. '/' for dashboard, '/incydenty' for incidents list, " +
          "'/notatki' for notes, '/zadania' for tasks, or '/incydenty/{id}' for details.",
      },
      force_refresh: {
        type: "boolean",
        description:
          "Set to true to bypass cache and re-fetch a previously visited page. " +
          "Use this after making API changes to verify they were applied.",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  async execute(args: { path: string; force_refresh?: boolean }) {
    try {
      // Fail-safe: enforce page fetch limit
      if (pageFetchCount >= MAX_PAGE_FETCHES) {
        return toolErr(
          `Page fetch limit reached (${MAX_PAGE_FETCHES}). ` +
          `Already fetched ${pageFetchCount} pages. Use cached results or finish your task.`
        );
      }

      const path = args.path.startsWith("/") ? args.path : `/${args.path}`;

      // Check visited cache (cycle detection) — unless force_refresh
      if (visitedPages.has(path) && !args.force_refresh) {
        console.log(chalk.yellow(`  [oko_page] CACHE HIT (already visited): ${path}`));
        return toolOk({
          path,
          content: visitedPages.get(path),
          cached: true,
          warning: "This page was already fetched. Returning cached result. Use force_refresh=true to re-fetch.",
          fetchCount: pageFetchCount,
        });
      }

      pageFetchCount++;
      console.log(chalk.gray(`  [oko_page] fetching ${path} (${pageFetchCount}/${MAX_PAGE_FETCHES})`));

      const cookies = await loginToOko();
      const url = `${OKO_BASE}${path}`;
      const res = await fetch(url, {
        headers: { Cookie: cookies },
      });

      if (!res.ok) {
        return toolErr(`HTTP ${res.status} for ${path}`);
      }

      const html = await res.text();
      const content = htmlToText(html);

      // Persist to tmp
      await persistPage(path, content);

      // Cache for cycle detection
      visitedPages.set(path, content);

      return toolOk({
        path,
        content,
        cached: false,
        fetchCount: pageFetchCount,
        remainingFetches: MAX_PAGE_FETCHES - pageFetchCount,
      });
    } catch (e) {
      return toolErr(`Failed to fetch OKO page: ${e}`);
    }
  },
};

// ─── Helper: rapid API call ───

const rapidApiCall = async (answer: Record<string, unknown>) => {
  const res = await fetch(HUB_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apikey: API_KEY, task: TASK_NAME, answer }),
  });
  return res.json();
};

// ─── batch_update_and_done: Execute multiple updates then immediately call done ───
// CRITICAL: OKO API updates expire quickly. All changes MUST be made in rapid
// succession and "done" called immediately after. This tool handles that.

const batchUpdateAndDoneTool: AiTool = {
  name: "batch_update_and_done",
  description:
    "Execute multiple API updates in rapid succession, then immediately call 'done'. " +
    "IMPORTANT: OKO API updates expire quickly — you MUST use this tool instead of making " +
    "individual oko_api_call updates followed by a separate submit_done. " +
    "Provide ALL required updates as an array, and this tool will execute them sequentially " +
    "as fast as possible, then immediately check for completion.",
  inputSchema: {
    type: "object",
    properties: {
      updates: {
        type: "array",
        description:
          "Array of update objects. Each object is a full 'answer' payload for the API " +
          "(e.g., {page:'incydenty', id:'...', action:'update', title:'...', content:'...'})",
        items: { type: "object" },
      },
      summary: {
        type: "string",
        description: "Brief summary of all changes being made",
      },
    },
    required: ["updates", "summary"],
    additionalProperties: false,
  },
  async execute(args: { updates: Record<string, unknown>[]; summary: string }) {
    try {
      console.log(chalk.cyan(`  [batch] Executing ${args.updates.length} updates + done`));
      console.log(chalk.cyan(`  [batch] Summary: ${args.summary}`));

      const results: { step: string; result: any }[] = [];

      // Execute all updates rapidly
      for (let i = 0; i < args.updates.length; i++) {
        const update = args.updates[i];
        console.log(chalk.gray(`  [batch] update ${i + 1}/${args.updates.length}: ${update.page}/${(update.id as string)?.slice(0, 8)}...`));
        const result = await rapidApiCall(update);
        results.push({ step: `update_${i + 1}`, result });

        if (result.code !== 110) {
          console.log(chalk.red(`  [batch] update ${i + 1} FAILED:`, JSON.stringify(result)));
          return toolOk({
            success: false,
            failedAt: `update_${i + 1}`,
            results,
            message: `Update ${i + 1} failed: ${result.message}`,
          });
        }
        console.log(chalk.green(`  [batch] update ${i + 1} OK`));
      }

      // Immediately call done
      console.log(chalk.cyan("  [batch] All updates done, calling 'done' immediately..."));
      const doneResult = await rapidApiCall({ action: "done" });
      results.push({ step: "done", result: doneResult });

      // Check for flag
      if (doneResult.code === 0 || doneResult.message?.includes("{FLG:")) {
        console.log(chalk.bgGreen.black(`\n FLAG: ${doneResult.message} \n`));
        await saveFinalAnswer(EPISODE_ID, TASK_NAME, { updates: args.updates, summary: args.summary }, doneResult);
      } else {
        console.log(chalk.yellow(`  [batch] done returned: ${doneResult.message}`));
      }

      await saveTmpAnswer(EPISODE_ID, TASK_NAME, { updates: args.updates, summary: args.summary, results });

      return toolOk({
        success: doneResult.code === 0,
        doneResult,
        results,
      });
    } catch (e) {
      return toolErr(`Batch update failed: ${e}`);
    }
  },
};

const submitDoneTool: AiTool = {
  name: "submit_done",
  description:
    "Execute the 'done' action to finalize all changes in OKO. " +
    "WARNING: Prefer using batch_update_and_done instead — OKO API updates expire quickly. " +
    "Only use this if you already just called oko_api_call for all updates in the same turn.",
  inputSchema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Brief summary of all changes made",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: { summary: string }) {
    try {
      const answer = { action: "done" };
      console.log(chalk.cyan(`  [submit_done] ${args.summary}`));

      await saveTmpAnswer(EPISODE_ID, TASK_NAME, { answer, summary: args.summary });

      const res = await fetch(HUB_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: API_KEY, task: TASK_NAME, answer }),
      });

      const data = await res.json();

      if (data.code === 0 || data.message?.includes("{FLG:")) {
        await saveFinalAnswer(EPISODE_ID, TASK_NAME, { answer, summary: args.summary }, data);
      }

      return toolOk(data);
    } catch (e) {
      return toolErr(`Submit done failed: ${e}`);
    }
  },
};

const finishTool: AiTool = {
  name: "finish",
  description: "Signal that the agent has completed its mission. Call this after receiving the flag.",
  inputSchema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Final summary of the mission outcome",
      },
    },
    required: ["summary"],
    additionalProperties: false,
  },
  async execute(args: { summary: string }) {
    return toolOk({ summary: args.summary });
  },
};

export const allTools: AiTool[] = [
  okoApiCallTool,
  fetchOkoPageTool,
  batchUpdateAndDoneTool,
  submitDoneTool,
  finishTool,
];
