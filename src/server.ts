import { McpServer } from "@modelcontextprotocol/server";
import type { Env } from "./env";
import { registerListNotes } from "./tools/list-notes";

/**
 * Builds the MCP server for one request, with every tool. A new one per request keeps the Worker
 * stateless: two requests at the same time never share a server, and nothing survives a request.
 */
export function createServer(env: Env): McpServer {
	const server = new McpServer({ name: "cerebro-mcp", version: "0.1.0" });
	registerListNotes(server, env);
	return server;
}
