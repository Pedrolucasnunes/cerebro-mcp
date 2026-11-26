import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Tests run inside workerd, the same runtime as production, with the Worker from wrangler.jsonc.
export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: "./wrangler.jsonc" },
			// Tests never reach the network (spec §9), so no binding may connect to Cloudflare.
			remoteBindings: false,
			miniflare: {
				// Test values only. They take precedence over wrangler.jsonc and any local .dev.vars,
				// so a test never sees a real secret, and the tests can tell these values apart from
				// the real ones (a hard-coded "main" branch, say, would fail them).
				bindings: {
					MCP_TOKEN: "0123456789abcdef0123456789abcdef0123456789abcdef",
					GITHUB_TOKEN: "github-token-for-tests",
					NOTES_REPO: "test-owner/test-notes",
					NOTES_BRANCH: "test-branch",
				},
			},
		}),
	],
});
