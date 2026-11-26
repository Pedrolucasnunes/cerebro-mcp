# ADR 004: A secret in the URL for /mcp

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-25 |

## Context

Only I may use the tools. The Claude app's custom connector takes just a URL: it can't send a custom header. MCP's standard way to authenticate is OAuth, which v1 leaves out on purpose (PRD, non-goals). The webhook and the admin route have other callers (GitHub, and my own scripts).

## Decision

Serve MCP only at `/<MCP_TOKEN>/mcp`, where `MCP_TOKEN` is 48 hex characters (192 random bits). Every other URL gets the same `404` as a route that doesn't exist (NFR1), and so does every URL while `MCP_TOKEN` isn't set.

The Worker compares the token in constant time, with `crypto.subtle.timingSafeEqual` as in Cloudflare's docs, and then passes the request to the MCP handler as `/mcp`. The webhook and the admin route get their own secrets (PR 3), so the MCP token never ends up in GitHub's webhook settings or delivery logs.

## Alternatives considered

- **OAuth**: the standard, with an identity per client and revocation. It needs an authorization server, a consent page and storage: too much for one user in v1. It's the plan for v2.
- **A token in an `Authorization` header**: cleaner, but the Claude app's connector can't send one.
- **The handler's own `route` option set to `/<token>/mcp`**: less code, but the handler compares paths with a plain `!==`, which isn't constant time.

## Consequences

- Whoever has the URL can read, change and delete every note. It's pasted into every client, and rotating the token means reconnecting all of them.
- The URL lands wherever URLs are logged. So Cloudflare's invocation logs and traces stay off, and the MCP route writes no logs (spec §7).
- A wrong token gets the same answer as a made-up route, so a scanner can't tell the server is there.

## Revisit when

The token leaks, or v2 brings OAuth.
