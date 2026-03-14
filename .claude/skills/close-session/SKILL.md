---
name: close-session
description: This skill should be used when the user asks to "close session", "end session", "zakończ sesję", "zamknij sesję", "koniec sesji", "close-session", or invokes "/close-session". Performs a session-closing checklist: reviews ADR/decision-log for needed updates, then commits all pending changes.
version: 1.0.0
---

# Close Session

To close a working session, run a checklist in order. Do not skip steps.

## Step 1: Review ADR and Decision Log

Read the following files to understand current state:
- `.ai/adr/README.md` (ADR index)
- `.ai/decision-log/decisions.md`
- `.ai/architecture.md`

Then run `git diff HEAD` and `git status` to see all changes made during the session.

Based on what was done this session, answer:

1. **New ADR needed?**
   - Was a significant architectural decision made (new pattern, major structural change, tech choice)?
   - If yes: create `.ai/adr/ADR-NNN-short-name.md`, update the index table in `.ai/adr/README.md`.

2. **Decision log entry needed?**
   - Was a smaller meta-decision made (tool choice, naming convention, process decision)?
   - If yes: append a new `DL-NNN` entry to `.ai/decision-log/decisions.md`.

3. **Architecture doc update needed?**
   - Were new files, modules, or patterns introduced that aren't reflected in `.ai/architecture.md`?
   - If yes: update the relevant sections.

If nothing significant was decided — state that explicitly and move on.

## Step 2: Stage and Commit

Run `git status` to see what's pending. Then:

1. Stage all modified and new files relevant to the session work (avoid staging `.env`, `answers/tmp/`, or other gitignored paths).
2. Draft a commit message following the style of recent commits (`git log --oneline -5`).
3. Commit with the standard Co-Authored-By footer.

If there is nothing to commit, state that and finish.

## Step 3: Summary

Report to the user:
- What was updated in ADR / decision-log (or that nothing was needed)
- What was committed (or that there was nothing to commit)
- One-line "Session closed." confirmation
