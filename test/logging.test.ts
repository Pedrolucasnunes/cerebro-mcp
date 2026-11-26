import { afterEach, describe, expect, it, vi } from "vitest";
import { connectMcp, fakeNotesRepo, fetchWorker, mcpInitialize } from "./helpers/worker";

afterEach(() => {
	vi.restoreAllMocks();
});

// The MCP URL carries MCP_TOKEN, and Cloudflare's docs don't say whether a log line keeps the
// request's path. So the MCP route writes no logs at all (spec §7; PRD, NFR7).
describe("the logs", () => {
	it("get nothing while the Worker serves, rejects or fails a request", async () => {
		const github = fakeNotesRepo();
		github.addFile("decisoes/aprovaoab.md");
		vi.spyOn(globalThis, "fetch").mockImplementation(github.fetch);
		const consoleMethods = ["log", "info", "warn", "error", "debug"] as const;
		const spies = consoleMethods.map((method) => vi.spyOn(console, method));

		const client = await connectMcp();
		await client.callTool({ name: "list_notes", arguments: {} });
		await fetchWorker(`/${"f".repeat(48)}/mcp`, mcpInitialize());
		github.failWith = 500;
		await client.callTool({ name: "list_notes", arguments: {} });
		github.networkDown = true;
		await client.callTool({ name: "list_notes", arguments: {} });
		await client.close();

		for (const spy of spies) {
			expect(spy).not.toHaveBeenCalled();
		}
	});
});
