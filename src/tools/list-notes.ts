import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Env } from "../env";
import { GitHubError, listFiles } from "../github";

export function registerListNotes(server: McpServer, env: Env): void {
	server.registerTool(
		"list_notes",
		{
			title: "List notes",
			description:
				"Lists the paths of my Markdown notes. Pass a prefix to list only some of them: a folder such as 'decisoes/', or the start of a path such as 'ideias/2026-11'. Use it to find a note's path, or to see which projects already have a decision log.",
			inputSchema: z.object({
				prefix: z
					.string()
					.max(200)
					.optional()
					.describe("Only notes whose path starts with this text, e.g. 'decisoes/'. Leave it out to list every note."),
			}),
			// Hints for clients (spec §3), not a security control: it only reads, and only the notes repo.
			annotations: { readOnlyHint: true, openWorldHint: false },
		},
		async ({ prefix = "" }) => {
			// Unset until `wrangler secret put GITHUB_TOKEN`: say so instead of sending GitHub an empty token.
			if (!env.GITHUB_TOKEN) {
				return toolError("The GITHUB_TOKEN secret isn't set. Set it with `npx wrangler secret put GITHUB_TOKEN`.");
			}

			let files: string[];
			try {
				files = await listFiles({ repo: env.NOTES_REPO, branch: env.NOTES_BRANCH, token: env.GITHUB_TOKEN });
			} catch (error) {
				if (error instanceof GitHubError) {
					return toolError(`Couldn't list the notes: ${error.message}. ${hint(error.status)}`);
				}
				// Anything else, such as a network failure, goes up to the MCP SDK, which answers the client
				// with a tool error carrying the error's message. Nothing is logged.
				throw error;
			}

			const notes = files.filter((path) => path.endsWith(".md") && path.startsWith(prefix));
			if (notes.length > 0) {
				return text(notes.join("\n"));
			}
			return text(prefix ? `No note's path starts with "${prefix}".` : `${env.NOTES_REPO} has no notes yet.`);
		},
	);
}

/** What to check, for the GitHub errors a setup mistake causes. */
function hint(status: number): string {
	if (status === 401) return "The GITHUB_TOKEN secret is wrong or expired.";
	if (status === 403) return "The GITHUB_TOKEN secret may lack Contents access to NOTES_REPO.";
	if (status === 404) return "Check NOTES_REPO and NOTES_BRANCH in wrangler.jsonc, and that the token can read that repo.";
	if (status === 409) return "The notes repo may be empty: GitHub has no files to list until its first commit.";
	return "Try again in a moment.";
}

function text(message: string) {
	return { content: [{ type: "text" as const, text: message }] };
}

function toolError(message: string) {
	return { content: [{ type: "text" as const, text: message }], isError: true };
}
