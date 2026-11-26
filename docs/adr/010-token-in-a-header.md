# ADR 010: The MCP token in an Authorization header

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-26 |

## Context

[ADR 004](004-secret-in-the-url.md) put the MCP token in the URL, `/<MCP_TOKEN>/mcp`, because the Claude app's custom connector took only a URL. It now takes request headers too: Claude stores each value and sends it, exactly as typed, on every request to the server (a beta, which this account has). Claude Code sends headers as well (`--header`, or `headers` in `.mcp.json`). ChatGPT doesn't: its custom MCP servers offer OAuth or no authentication, nothing else.

A token in a URL gets saved and logged wherever URLs do. HTTP has a header for credentials: `Authorization`.

## Decision

Serve MCP only at `/mcp`, to requests with `Authorization: Bearer <MCP_TOKEN>`. As HTTP defines it, the scheme's case doesn't matter, and one or more spaces come before the token. This replaces ADR 004.

Every other request gets the same `404` as a route that doesn't exist (NFR1): no header, a wrong token, the token without `Bearer`, any other path (the old `/<MCP_TOKEN>/mcp` included), and every request while `MCP_TOKEN` isn't set. The Worker compares the token in constant time, as before. Then it deletes the header and hands the request to the MCP SDK, which passes the whole request on to the server's code, where nothing needs the token.

Kept from ADR 004: the webhook and the admin route get their own secrets (PR 3). Cloudflare's invocation logs, traces and Issues stay off, and the MCP route writes no logs.

## Alternatives considered

- **Keep the token in the URL (ADR 004):** every client can connect, ChatGPT included, but the token stays wherever URLs are saved or logged.
- **The header or the URL:** keeps ChatGPT possible, but the token still travels in a URL, and the route gets two ways in to test and explain.
- **`401` with a `WWW-Authenticate` header when the token is missing**, as MCP's authorization spec asks of servers that use OAuth: clients could tell a wrong token from a wrong URL, but a `401` tells any scanner that a server is there (NFR1).
- **OAuth:** the plan for v2 (PRD, non-goals).

## Consequences

- ChatGPT can't connect in v1: it has no way to send the token (spec §10; PRD, open question 3).
- When the connector is added, Claude reports that no server answered the URL, since without the header the Worker answers `404`. "Continue anyway" leads to the manual settings, where the header goes. In Claude Code, a wrong token looks like a wrong URL ("MCP endpoint not found").
- A connector can't be edited: a new token means removing the connector and adding it again, in every client.
- A browser page can't connect directly: its CORS preflight carries no `Authorization` header and gets the `404`. None of my clients is one: Claude connects from Anthropic's cloud, and Claude Code from my computer.
- The move is also when the token gets replaced: the old one was saved in the old connector, as part of its URL.

## Revisit when

The token leaks, Claude's request headers change or go away, or v2 brings OAuth.
