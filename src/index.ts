import { createMcpHandler } from "agents/mcp/server";
import type { Env } from "./env";
import { bearerToken, isSameSecret } from "./secrets";
import { createServer } from "./server";

/** The only route. Clients send MCP_TOKEN in the header `Authorization: Bearer <MCP_TOKEN>` (ADR 010). */
const MCP_PATH = "/mcp";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { pathname } = new URL(request.url);
		const token = bearerToken(request);

		// The path isn't a secret, so a plain comparison will do; the token is compared in constant time.
		// Fail closed: while MCP_TOKEN isn't set (before `wrangler secret put`), no request gets in.
		if (pathname !== MCP_PATH || token === undefined || !env.MCP_TOKEN || !isSameSecret(token, env.MCP_TOKEN)) {
			return notFound();
		}

		// The MCP SDK passes the whole request, headers included, on to the server's code. Nothing there
		// needs the token, so the request handed on doesn't carry it.
		const headers = new Headers(request.headers);
		headers.delete("Authorization");
		// A handler per request, so the tools get this request's env (the secrets and the vars).
		// `route` is the handler's default, set here so its own path check uses the same constant as ours.
		const handler = createMcpHandler(() => createServer(env), { route: MCP_PATH });
		return handler(new Request(request, { headers }), env, ctx);
	},
} satisfies ExportedHandler<Env>;

/** One answer for every request that doesn't get in, so the server looks like it doesn't exist. */
function notFound(): Response {
	return new Response("Not Found", { status: 404 });
}
