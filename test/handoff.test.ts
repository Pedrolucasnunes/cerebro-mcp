import { describe, expect, it, vi } from "vitest";
import { TEST_MCP_TOKEN, connectMcp } from "./helpers/worker";

/** Every request the Worker hands to the MCP handler, recorded by the wrapper below. */
const handedOver = vi.hoisted((): Request[] => []);

// Wraps the MCP handler from `agents` to record each request the Worker hands it. The real handler
// still serves every request: the test only looks at what reaches it.
vi.mock("agents/mcp/server", async (importOriginal) => {
	const agents = await importOriginal<typeof import("agents/mcp/server")>();
	return {
		...agents,
		createMcpHandler: (...args: Parameters<typeof agents.createMcpHandler>) => {
			const handler = agents.createMcpHandler(...args);
			return (request: Request, env: unknown, ctx: ExecutionContext) => {
				handedOver.push(request);
				return handler(request, env, ctx);
			};
		},
	};
});

// The MCP SDK passes the whole request, headers included, on to the server's code. Nothing there
// needs the token, so it stops at the Worker (ADR 010).
describe("the request the MCP handler gets", () => {
	it("doesn't carry the token", async () => {
		const client = await connectMcp();
		await client.listTools();
		await client.close();

		// The client's requests reached the handler...
		expect(handedOver.length).toBeGreaterThan(0);
		for (const request of handedOver) {
			// ...without the Authorization header, and with the token nowhere in their URL or headers.
			expect(request.headers.has("Authorization")).toBe(false);
			expect(request.url).not.toContain(TEST_MCP_TOKEN);
			expect(JSON.stringify([...request.headers])).not.toContain(TEST_MCP_TOKEN);
		}
	});
});
