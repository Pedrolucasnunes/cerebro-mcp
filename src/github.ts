/**
 * Calls to GitHub's REST API. The notes repo is the source of truth (ADR 002), so tools read it
 * here, when they run, and keep nothing between requests.
 */

/** Where the notes live, and the token that can read them. */
export interface NotesRepo {
	/** "owner/name", from NOTES_REPO in wrangler.jsonc. */
	repo: string;
	/** From NOTES_BRANCH in wrangler.jsonc. */
	branch: string;
	/** The GITHUB_TOKEN secret. */
	token: string;
}

/** GitHub answered with an error status. The message names the status, never the token. */
export class GitHubError extends Error {
	constructor(readonly status: number) {
		super(`GitHub answered ${status}`);
	}
}

/**
 * The path of every file on the branch, in one call: the branch's tree, read recursively.
 * Past 100,000 entries or 7 MB GitHub cuts the list short, and this reads what it got (spec §10).
 */
export async function listFiles(notes: NotesRepo): Promise<string[]> {
	const url = `https://api.github.com/repos/${notes.repo}/git/trees/${encodeURIComponent(notes.branch)}?recursive=1`;
	const response = await fetch(url, { headers: headers(notes.token) });
	if (!response.ok) {
		throw new GitHubError(response.status);
	}
	const body = (await response.json()) as { tree: { path: string; type: string }[] };
	// A "blob" is a file; a "tree" is a folder.
	return body.tree.filter((entry) => entry.type === "blob").map((entry) => entry.path);
}

function headers(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		// Pinned, so a newer API version can't change the answers without a code change.
		"X-GitHub-Api-Version": "2026-03-10",
		// GitHub rejects requests without a User-Agent.
		"User-Agent": "cerebro-mcp",
	};
}
