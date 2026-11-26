import { createMcpHandler } from "agents/mcp/server";
import type { Env } from "./env";
import { isSameSecret } from "./secrets";
import { createServer } from "./server";

/** The only route: /<MCP_TOKEN>/mcp. The token is the first path segment. */
const MCP_ROUTE = /^\/([^/]+)\/mcp$/;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const token = MCP_ROUTE.exec(url.pathname)?.[1];

		// Fail closed: while MCP_TOKEN isn't set (before `wrangler secret put`), no URL matches.
		if (token === undefined || !env.MCP_TOKEN || !isSameSecret(token, env.MCP_TOKEN)) {
			return notFound();
		}

		// The handler serves a fixed /mcp path. Checking the token here, in constant time, keeps it out
		// of the handler's `route` option, which compares paths with a plain `!==`.
		url.pathname = "/mcp";
		// A handler per request, so the tools get this request's env (the secrets and the vars).
		const handler = createMcpHandler(() => createServer(env));
		return handler(new Request(url, request), env, ctx);
	},
} satisfies ExportedHandler<Env>;

/** One answer for every URL that isn't the MCP one, so the server looks like it doesn't exist. */
function notFound(): Response {
	return new Response("Not Found", { status: 404 });
}
