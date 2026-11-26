# CLAUDE.md

Cérebro MCP is a remote MCP server that gives all my AI clients the same Markdown notes. I'm building it to learn: you write the code, and I review every PR.

- What and why: [docs/prd/v1.md](docs/prd/v1.md)
- How: [docs/spec/v1.md](docs/spec/v1.md), the source of truth for v1. Build in the order of its §12.

## How we work

1. **One PR per item of the build plan** (spec §12). Small and focused; nothing outside its scope.
2. **Tests first.** One commit with the failing tests, then the commit that makes them pass. `npm test` and `npm run typecheck` are green before you ask for review.
3. **A fresh review before mine.** Before asking me, have a separate agent with a clean context (a subagent or a new session) review the diff against the spec and this file. Fix what it finds, and say in the PR what changed because of it.
4. **The spec decides.** If something isn't in it, or you think it's wrong, stop and ask in the PR instead of deciding silently. Once we decide, update the spec in the same PR.
5. **Every design decision is an ADR** in `docs/adr/NNN-short-title.md` (template below), written in the PR that implements it. You draft it; I rewrite the reasoning in my own words.
6. **Keep v1 simple on purpose.** The known limitations in spec §10 are deliberate: I want to hit each one in real use before fixing it in v2. In v1, don't add retries, queues, version checks, OAuth or keyword search. If you spot a new limitation, add it to §10 instead of fixing it.
7. **Don't copy code from [YudiG12/second-brain-mcp](https://github.com/YudiG12/second-brain-mcp).** It's the inspiration, not the source. Build from the spec and the official docs (Cloudflare, the MCP SDK, GitHub's API). Its MIT license would require keeping its copyright notice on anything copied, and the point of this project is that the code is mine.
8. **Explain, don't impress.** I'm learning: prefer clear code to clever code, and add a short comment wherever the reason isn't obvious from the code itself.

## Every PR description

```markdown
## What
## Why
## How to test
## Risks and limitations
## Questions for the reviewer
3 to 5 questions I must be able to answer before merging: why it's designed this way,
what breaks if a piece fails, and how the tests prove it works. I answer them in a PR
comment; if I can't, explain before I merge.
## Read more
1 or 2 links to the official docs behind this PR.
```

## Secrets

- Never in the repo, a PR, a log or a command argument. Local values go in `.dev.vars`, which is gitignored.
- I set production secrets myself with `npx wrangler secret put <NAME>`. Never ask me to paste one in the chat.
- Never log request headers or URLs: every MCP request carries the token in its `Authorization` header.

## Conventions

- TypeScript in strict mode, ES modules; `zod` for tool inputs.
- English for code, docs, commit messages and tool descriptions. The notes themselves are in Portuguese.
- Deployment-specific values live in `wrangler.jsonc`; don't hard-code them anywhere else.
- Scripts are Node ES modules (`scripts/*.mjs`), not shell scripts, so they run the same in PowerShell on Windows and on Linux, where CI runs (ADR 008).
- Commit messages in the imperative, under 72 characters (`Add record_decision`).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Vitest, inside workerd |
| `npm run typecheck` | Generates the Worker's types (`wrangler types`), then `tsc --noEmit` on `src` and `test` |
| `npx wrangler dev` | Local server, reading `.dev.vars` |
| `node scripts/setup.mjs` | Lists the secrets the Worker still lacks and, from PR 3, creates any missing Cloudflare resource (safe to re-run) |
| `node scripts/reindex.mjs` | Calls `/admin/reindex` page by page until it's done |

Deploys run in CI when a PR is merged into `main`.

## ADR template

```markdown
# ADR NNN: <the decision in a few words>

| | |
|---|---|
| **Status** | Proposed / Accepted / Superseded by ADR NNN |
| **Date** | YYYY-MM-DD |

## Context
## Decision
## Alternatives considered
## Consequences
## Revisit when
```
