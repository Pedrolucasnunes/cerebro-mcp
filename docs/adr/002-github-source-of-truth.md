# ADR 002: A private GitHub repo as the source of truth

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-25 |

## Context

No note may ever be lost, and every change must be visible and reversible (PRD, G4). The notes must stay editable outside MCP too, in Obsidian or on GitHub (story 4).

## Decision

The notes are Markdown files in the private repo `cerebro-notas`, on branch `main`. Tools read GitHub when they run and keep nothing between requests. Every write is one commit (NFR2). The search index is derived from the repo and can be rebuilt from it (NFR3).

## Alternatives considered

- **A database** (D1 or KV): fast to query, but it has no history or diffs, and Obsidian can't open it.
- **Files in R2**: plain files again, but still no history.
- **A folder synced from my computer**: the phone couldn't reach it.

## Consequences

- History, diffs and undo come with Git, and Obsidian and GitHub edit the same files MCP does.
- Every tool call is a GitHub API call. The limit, 5,000 requests an hour per token, is far above one person's use.
- The Worker holds a fine-grained token for this repo only. It expires on purpose, so it has to be replaced before it does.
- A change made outside MCP reaches search through the push webhook (PR 3, ADR 005).

## Revisit when

GitHub's latency or rate limits show up in real use, or the notes outgrow one repo.
