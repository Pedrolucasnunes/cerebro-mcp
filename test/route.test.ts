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

	it("serves MCP at /mcp to requests with Authorization: Bearer <MCP_TOKEN>", async () => {
		const client = await connectMcp();

		const { tools } = await client.listTools();

		expect(tools.map((tool) => tool.name)).toEqual(["list_notes"]);
		await client.close();
	});

	// HTTP says the scheme's case doesn't matter, and allows more than one space before the token.
	it.each([
		["the scheme in lower case", `bearer ${TEST_MCP_TOKEN}`],
		["the scheme in upper case", `BEARER ${TEST_MCP_TOKEN}`],
		["more than one space before the token", `Bearer   ${TEST_MCP_TOKEN}`],
	])("accepts %s", async (_case, authorization) => {
		const response = await fetchWorker("/mcp", mcpInitialize(authorization));

		expect(response.status).toBe(200);
	});

	// Anything but the right token at /mcp must look like a server that doesn't exist (PRD, NFR1).
	it.each([
		["no Authorization header", "/mcp", undefined],
		["a wrong token of the same length", "/mcp", `Bearer ${"f".repeat(48)}`],
		["a token of another length", "/mcp", "Bearer 0123456789abcdef"],
		["the token in upper case", "/mcp", `Bearer ${TEST_MCP_TOKEN.toUpperCase()}`],
		// Claude sends a request header exactly as typed, so the word Bearer can be left out by mistake.
		["the token without the Bearer scheme", "/mcp", TEST_MCP_TOKEN],
		["the token under another scheme", "/mcp", `Basic ${TEST_MCP_TOKEN}`],
		["the Bearer scheme with no token", "/mcp", "Bearer"],
		["the token followed by more text", "/mcp", `Bearer ${TEST_MCP_TOKEN} extra`],
		["the old URL, with the token in the path", `/${TEST_MCP_TOKEN}/mcp`, undefined],
		["the token in the query string", `/mcp?token=${TEST_MCP_TOKEN}`, undefined],
		["the right header at the old URL", `/${TEST_MCP_TOKEN}/mcp`, `Bearer ${TEST_MCP_TOKEN}`],
		["the right header at another path", "/no-such-route", `Bearer ${TEST_MCP_TOKEN}`],
		["the right header with a trailing slash", "/mcp/", `Bearer ${TEST_MCP_TOKEN}`],
		["the right header below /mcp", "/mcp/extra", `Bearer ${TEST_MCP_TOKEN}`],
	])("answers %s exactly like a route that doesn't exist", async (_case, path, authorization) => {
		const unknown = await fetchWorker("/no-such-route", mcpInitialize());

		const response = await fetchWorker(path, mcpInitialize(authorization));

		expect(response.status).toBe(404);
		expect([...response.headers]).toEqual([...unknown.headers]);
		expect(await response.text()).toBe(await unknown.text());
		expect(github.requests).toHaveLength(0);
	});

	// Before `wrangler secret put MCP_TOKEN`, the deployed Worker must not serve anyone.
	it.each([
		["unset", undefined],
		["empty", ""],
	])("answers 404 to every request while MCP_TOKEN is %s", async (_case, token) => {
		const envWithoutToken = { ...testEnv, MCP_TOKEN: token };

		for (const authorization of [undefined, "Bearer ", "Bearer undefined", `Bearer ${TEST_MCP_TOKEN}`]) {
			const response = await fetchWorker("/mcp", mcpInitialize(authorization), envWithoutToken);
			expect(response.status, String(authorization)).toBe(404);
		}
	});
});
