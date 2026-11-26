import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeGitHub } from "./helpers/fake-github";
import { TEST_MCP_TOKEN, connectMcp, fakeNotesRepo, fetchWorker, mcpInitialize, testEnv } from "./helpers/worker";

describe("the MCP route", () => {
	let github: FakeGitHub;

	beforeEach(() => {
		github = fakeNotesRepo();
		vi.spyOn(globalThis, "fetch").mockImplementation(github.fetch);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("serves MCP at /<MCP_TOKEN>/mcp", async () => {
		const client = await connectMcp();

		const { tools } = await client.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(["list_notes"]);
		await client.close();
	});

	// Anything but the exact URL must look like a server that doesn't exist (PRD, NFR1).
	it.each([
		["/mcp without a token", "/mcp"],
		["a wrong token of the same length", `/${"f".repeat(48)}/mcp`],
		["a token of another length", "/0123456789abcdef/mcp"],
		["the token in upper case", `/${TEST_MCP_TOKEN.toUpperCase()}/mcp`],
		["the token without /mcp", `/${TEST_MCP_TOKEN}`],
		["the token with a trailing slash", `/${TEST_MCP_TOKEN}/mcp/`],
		["a path below the MCP route", `/${TEST_MCP_TOKEN}/mcp/extra`],
		["the token one folder deeper", `/x/${TEST_MCP_TOKEN}/mcp`],
		["an encoded slash after the token", `/${TEST_MCP_TOKEN}%2Fmcp`],
	])("answers %s exactly like a route that doesn't exist", async (_case, path) => {
		const unknown = await fetchWorker("/no-such-route", mcpInitialize());

		const response = await fetchWorker(path, mcpInitialize());

		expect(response.status).toBe(404);
		expect([...response.headers]).toEqual([...unknown.headers]);
		expect(await response.text()).toBe(await unknown.text());
		expect(github.requests).toHaveLength(0);
	});

	// Before `wrangler secret put MCP_TOKEN`, the deployed Worker must not be reachable at any URL.
	it.each([
		["unset", undefined],
		["empty", ""],
	])("answers 404 to every request while MCP_TOKEN is %s", async (_case, token) => {
		const envWithoutToken = { ...testEnv, MCP_TOKEN: token };

		for (const path of ["/mcp", "//mcp", "/undefined/mcp", `/${TEST_MCP_TOKEN}/mcp`]) {
			const response = await fetchWorker(path, mcpInitialize(), envWithoutToken);
			expect(response.status, path).toBe(404);
		}
	});
});
