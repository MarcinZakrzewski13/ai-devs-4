---
name: init-project
description: This skill should be used when the user asks to "initialize project", "init project", "zainicjalizuj projekt", "co to za projekt", "zapoznaj się z projektem", "what is this project", or wants a project overview at the start of a session. Reads CLAUDE.md and .ai/ directory to provide a concise project briefing.
version: 1.0.0
---

# Init Project

To initialize work in the AI Devs 4 project, read the key documentation files and provide a concise briefing.

## Initialization Steps

1. Read `CLAUDE.md` in the project root (already in context as system instructions).
2. Read all files in the `.ai/` directory:
   - Use Glob pattern `.ai/**/*.md` to discover files
   - Read each file found
3. Scan current lesson directories to understand progress:
   - Use Glob pattern `lessons/ts/S*/E*/main.ts` to list completed lessons
   - Check `.ai/tasks-index.md` for task/solution status overview
4. Provide a briefing (see format below).

## Briefing Format

Present a concise summary in the language the user used (Polish or English), covering:

**Project overview** (1-2 sentences)
- What AI Devs 4 Builder is and how tasks work

**Architecture highlights** (bullet list)
- Monorepo packages: `@ai-devs/ai-core` (model, prompts, tools), `@ai-devs/ai-devs-hub` (sendAnswer, saveFinalAnswer)
- Tech stack: Bun + TypeScript, key dependencies
- How to run solutions: `bun run lessons/ts/S{XX}/E{YY}/main.ts`

**Current progress**
- List discovered lesson files (S01E01, S01E02, etc.) with their descriptive names

**Ready to work**
- Confirm environment is understood and offer to help with the next lesson or current task

## Notes

- Keep the briefing short — under 20 lines total
- Do not repeat information the user already knows
- If `.ai/` contains multiple files, summarize their combined content rather than listing each file separately
