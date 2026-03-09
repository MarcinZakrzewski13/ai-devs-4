# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

This workspace is used for solving tasks from the AI_Devs 4 Builder training course. Tasks involve LLM-related challenges with solutions submitted to https://centrala.ag3nts.org.

## Technology Stack

- **Runtime:** Bun (not npm/node)
- **Primary language:** TypeScript
- Additional technologies will be specified per lesson

## Build & Development Commands

```bash
bun install              # Install dependencies
bun run <file.ts>        # Run a TypeScript file directly
bun test                 # Run tests
```

## Project Structure

```
lessons/
├── ts/                  # TypeScript solutions (main)
│   ├── S01E01-*.ts      # Individual lesson solutions (Season/Episode naming)
│   ├── toolset/         # Shared libraries and utilities
│   │   ├── prompts/     # Prompt templates
│   │   └── scripts/     # Helper scripts
│   └── resources/       # Lesson-specific data files
├── py/                  # Python solutions (if needed)
└── txt/                 # Text resources per season
```

## Coding Conventions

- **Files:** kebab-case (`my-component.ts`)
- **Variables/functions:** camelCase
- **Types/Classes:** PascalCase
- **Constants:** ALL_CAPS
- Prefer functions over classes
- Prefer types over interfaces
- Use JSDoc for documentation
- Add trace logs with chalk for debugging

## Key Patterns

- Lesson solutions follow naming: `S{season}E{episode}-{description}.ts`
- Reusable utilities go in `lessons/ts/toolset/`
- Use existing toolset wrappers (OpenAI, Qdrant, Neo4j) when available
- Environment variables in `.env` file (API keys for OpenAI, AI_DEVS, etc.)

## Environment Variables

Required in `.env`:
```
API_KEY_AI_DEVS4=...
OPENAI_API_KEY=...
```

Additional keys added as needed per lesson (Qdrant, Neo4j, etc.)
