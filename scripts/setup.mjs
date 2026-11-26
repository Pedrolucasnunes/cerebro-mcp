// Checks what the deployed Worker still needs and prints the steps only you can do.
// It changes nothing, so it's safe to run again at any time:
//
//   node scripts/setup.mjs
//
// A Node script instead of a shell one, so it runs the same in PowerShell on Windows and in CI
// (ADR 008). From PR 3 it also creates the Vectorize index when it's missing.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** The secrets the Worker reads, and how to set each one. Values are typed at a prompt, never in a command. */
const SECRETS = [
	{
		name: "MCP_TOKEN",
		steps: [
			"Generate 48 random hex characters (192 bits) and keep them in your password manager:",
			`  node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"`,
			"Then paste them at the prompt of:",
			"  npx wrangler secret put MCP_TOKEN",
		],
	},
	{
		name: "GITHUB_TOKEN",
		steps: [
			"Use a fine-grained GitHub token for the notes repo only, with Contents access and an expiry date.",
			"Paste it at the prompt of:",
			"  npx wrangler secret put GITHUB_TOKEN",
		],
	},
];

// Wrangler from this repo's node_modules, run by this same Node, with no shell in between:
// that is what makes the script behave the same on Windows and on Linux.
const wranglerBin = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));

function wrangler(...args) {
	return spawnSync(process.execPath, [wranglerBin, ...args], { encoding: "utf8" });
}

// 1. Logged in to Cloudflare? (`whoami --json` exits with an error when you aren't.)
if (wrangler("whoami", "--json").status !== 0) {
	console.log("Log in to Cloudflare first: npx wrangler login");
	process.exit(1);
}

// 2. Which secrets does the deployed Worker have? Only their names come back, never their values.
const listed = wrangler("secret", "list", "--format", "json");
if (listed.status !== 0) {
	console.log("Couldn't list the Worker's secrets. If it isn't deployed yet: merge the PR,");
	console.log("wait for the deploy job in GitHub Actions to finish, and run this again.");
	console.log(`Wrangler said: ${listed.stderr.trim() || listed.stdout.trim()}`);
	process.exit(1);
}
const existing = new Set(JSON.parse(listed.stdout).map((secret) => secret.name));

const missing = SECRETS.filter((secret) => !existing.has(secret.name));
for (const secret of SECRETS) {
	if (existing.has(secret.name)) {
		console.log(`[ok] ${secret.name} is set`);
	} else {
		console.log(`[missing] ${secret.name}`);
		for (const step of secret.steps) {
			console.log(`    ${step}`);
		}
	}
}

// 3. How to connect a client, once nothing is missing.
console.log("");
if (missing.length > 0) {
	console.log("Set the missing secrets, then run this again.");
	process.exit(1);
}
console.log("Everything is set. To connect the Claude app, add a custom connector with the URL");
console.log("the deploy job printed, followed by /<MCP_TOKEN>/mcp:");
console.log("  https://cerebro-mcp.<your-subdomain>.workers.dev/<MCP_TOKEN>/mcp");
console.log("That URL carries the token: paste it only into the connector settings.");
