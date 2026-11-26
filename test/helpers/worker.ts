import { Client, StreamableHTTPClientTransport, type CallToolResult } from "@modelcontextprotocol/client";
import { createExecutionContext } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import type { Env } from "../../src/env";
import worker from "../../src/index";
import { FakeGitHub } from "./fake-github";

/** The env from vitest.config.ts, typed with the secrets the Worker expects. */
export const testEnv = env as Env;

/** The test token from vitest.config.ts. */
export const TEST_MCP_TOKEN = required(testEnv.MCP_TOKEN, "MCP_TOKEN");
/** The test GitHub token from vitest.config.ts. */
export const TEST_GITHUB_TOKEN = required(testEnv.GITHUB_TOKEN, "GITHUB_TOKEN");

/** Where the tests pretend the Worker runs. Any host works: requests never leave the process. */
const ORIGIN = "https://cerebro.test";

/** How the Worker's fetch handler types its request: one that came through Cloudflare's edge. */
type IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

/** A fake GitHub for the repo, branch and token in vitest.config.ts, with no files yet. */
export function fakeNotesRepo(): FakeGitHub {
	return new FakeGitHub({ name: "test-owner/test-notes", branch: "test-branch", token: TEST_GITHUB_TOKEN });
}

/**
 * Sends a request to the Worker's fetch handler, in-process. With `envOverride`, the handler gets
 * that env instead of the one from vitest.config.ts (to test a missing secret, say).
 */
export function fetchWorker(pathOrUrl: string, init?: RequestInit, envOverride?: Env): Promise<Response> {
	// The cast stands in for the edge: in tests nothing fills in `request.cf`, and the Worker never reads it.
	const request = new Request(new URL(pathOrUrl, ORIGIN), init) as IncomingRequest;
	if (envOverride) {
		return worker.fetch(request, envOverride, createExecutionContext());
	}
	return exports.default.fetch(request);
}

/** A well-formed MCP request (a 2025-era `initialize`): even a valid MCP call gets 404 at a wrong URL. */
export function mcpInitialize(): RequestInit {
	return {
		method: "POST",
		headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 1,
			method: "initialize",
			params: {
				protocolVersion: "2025-11-25",
				capabilities: {},
				clientInfo: { name: "cerebro-tests", version: "1.0.0" },
			},
		}),
	};
}

/** The MCP protocol eras the Worker serves at the same URL: the 2025 handshake, and 2026-07-28. */
export const ERAS = ["2025", "2026-07-28"] as const;
export type Era = (typeof ERAS)[number];

/**
 * Connects the official MCP client to the Worker the way Claude would, but in-process: the client's
 * HTTP requests go straight to the Worker's fetch handler.
 */
export async function connectMcp(options: { era?: Era; env?: Env } = {}): Promise<Client> {
	const client = new Client(
		{ name: "cerebro-tests", version: "1.0.0" },
		// The client speaks the 2025 protocol unless it's pinned to the 2026-07-28 one.
		options.era === "2026-07-28" ? { versionNegotiation: { mode: { pin: "2026-07-28" } } } : {},
	);
	const token = (options.env ?? testEnv).MCP_TOKEN;
	const transport = new StreamableHTTPClientTransport(new URL(`/${token}/mcp`, ORIGIN), {
		fetch: (url, init) => fetchWorker(String(url), init, options.env),
	});
	await client.connect(transport);
	return client;
}

/** The text of a tool result. Every tool here answers with one text block. */
export function toolText(result: CallToolResult): string {
	const [block] = result.content;
	if (block?.type !== "text") {
		throw new Error(`Expected one text block, got ${JSON.stringify(result.content)}`);
	}
	return block.text;
}

function required(value: string | undefined, name: string): string {
	if (!value) {
		throw new Error(`vitest.config.ts must set ${name} for the tests`);
	}
	return value;
}
