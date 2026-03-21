# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

Workspace do rozwiazywania zadan z kursu **AI_Devs 4 Builder**. Kazde zadanie to skrypt TypeScript przetwarzajacy dane z pomoca LLM, z odpowiedzia wysylana do Centrali (`https://hub.ag3nts.org`).

## AI Assistant Rules

> **IMPORTANT:** At the start of every session, read the following files before proceeding with any task:
> - `.ai/rules/general.md` — rules for AI assistants (models, answer saving, secrets)
> - `.ai/architecture.md` — project architecture decisions and guidelines
> - `.ai/tasks-index.md` — index of all course tasks and solutions

## Technology Stack

- **Runtime:** Bun (not npm/node)
- **Language:** TypeScript (strict mode)
- **Monorepo:** Bun workspaces, packages in `packages/`

## Build & Development Commands

```bash
bun install              # Install dependencies
bun run <file.ts>        # Run a TypeScript file directly
bun test                 # Run tests
```

## Project Structure

```
.ai/                     # Architecture docs, ADRs, rules, task index
packages/                # Reusable packages (@ai-devs/*)
│   ├── ai-core/         # ModelProvider, prompts, tools, observability
│   ├── ai-devs-hub/     # Hub communication + answer persistence
│   ├── geo-utils/       # Haversine distance calculations
│   └── mcp-tools/       # Shared MCP server
lessons/
├── ts/                  # TypeScript solutions
│   ├── S01/E01/         # Modular task solutions (one dir per episode)
│   ├── toolset/         # [DEPRECATED] — do not extend, use @ai-devs/* instead
│   └── resources/       # Lesson-specific data files
├── py/                  # Python solutions (if needed)
└── txt/                 # Lesson materials per season (gitignored symlink)
```

## Coding Conventions

- **Files:** kebab-case (`my-component.ts`)
- **Variables/functions:** camelCase
- **Types/Classes:** PascalCase
- **Constants:** ALL_CAPS
- Prefer functions over classes, types over interfaces
- Add trace logs with chalk for debugging

## Key Patterns

- One task = one directory `lessons/ts/S{XX}/E{YY}/` with modular files (ADR-001)
- `main.ts` = orchestration only, zero business logic
- Import from `@ai-devs/ai-core` and `@ai-devs/ai-devs-hub` — not from `toolset/`
- Default AI provider: `createDefaultProvider()` (OpenRouter with OpenAI fallback)
- Allowed models only — see `architecture.md` section "Dozwolone modele OpenAI"
- After solving: create `solution.md` in task directory

## Environment Variables

Required in `.env`:
```
API_KEY_AI_DEVS4=...
OPENAI_API_KEY=...
OPEN_ROUTER_API_KEY=...
```

Additional keys added as needed per lesson (Qdrant, Neo4j, etc.)
