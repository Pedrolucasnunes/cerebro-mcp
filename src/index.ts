import type { Env } from "./env";

export default {
	async fetch(_request, _env, _ctx): Promise<Response> {
		return new Response("Not Found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;
