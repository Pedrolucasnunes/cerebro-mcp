# ADR 008: Scripts in Node instead of shell

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-25 |

## Context

The spec planned `scripts/setup.sh` and `scripts/reindex.sh`. I work on Windows with PowerShell 5.1, where a shell script needs Git Bash or WSL, and CI runs on Linux. Node.js is already required by everything else (npm, Wrangler, the tests).

## Decision

Write the scripts as Node ES modules, `scripts/setup.mjs` and `scripts/reindex.mjs`, run with `node scripts/<name>.mjs`. A script calls Wrangler from `node_modules` with the same Node binary and no shell in between, so arguments and paths behave the same on Windows and on Linux.

## Alternatives considered

- **Bash**: the original plan. It needs Git Bash or WSL on Windows.
- **PowerShell**: native here, but CI would need `pwsh`, and it's one more language in the repo.
- **Commands inside npm scripts**: their shell syntax differs between Windows and Linux.
- **TypeScript**: matches `src`, but needs a runner or type stripping. Plain `.mjs` runs on any Node.

## Consequences

- One language for the code and the scripts, and no extra tools to install.
- The scripts are plain JavaScript, so `tsc` doesn't check them. They stay small.
- `scripts/eval.ts` and `scripts/measure.ts` (PR 5) are already planned in TypeScript; PR 5 decides how they run.

## Revisit when

A script grows enough to want types.
