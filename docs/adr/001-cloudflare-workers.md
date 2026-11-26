# ADR 001: Cloudflare Workers as the runtime

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-25 |

## Context

Cérebro MCP needs a public HTTPS endpoint that every MCP client can reach, the phone included (PRD, G1 and G2). Search by meaning needs embeddings and a vector index (G3). It has to cost nothing (G5), for one user and little traffic.

## Decision

Run the server as a Cloudflare Worker on the Workers Free plan. Workers AI makes the embeddings and Vectorize holds the index, both reached through bindings declared in `wrangler.jsonc`.

## Alternatives considered

- **A server or container** (a VPS, Fly.io, Railway, a machine at home): it runs all the time, so it costs money or upkeep, and TLS and updates are mine to manage.
- **Functions on another provider** (AWS Lambda, Vercel): they have free tiers, but embeddings and vectors would come from other services, each with its own API key and bill.
- **A local MCP server over stdio**: simple, but the phone and the Claude app can't reach it.

## Consequences

- Embeddings and vectors need no extra API keys, and one file describes the whole deployment.
- The Free plan's limits apply, the main one being about 50 outside calls per request. That is why a push indexes at most 20 notes (spec §5.2).
- The runtime is workerd, not Node.js. Node.js APIs come only through the `nodejs_compat` flag, which the `agents` MCP handler needs.
- Tests run inside workerd too (`@cloudflare/vitest-plugin`), so they exercise the same runtime as production.

## Revisit when

The Free plan's limits get in the way in real use (spec §10), or v2 needs something a Worker can't do.
