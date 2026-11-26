/**
 * An in-memory stand-in for the part of GitHub's REST API the Worker calls. Tests put its `fetch`
 * in place of the global one, so the Worker talks to it instead of the network.
 *
 * It behaves like the real API where the Worker depends on it: a request without the right token
 * gets 401, one without a User-Agent gets 403, and a tree read without `recursive` lists only the
 * top level. Anything that isn't api.github.com throws, so a test fails if the Worker tries to
 * reach another host.
 */
export class FakeGitHub {
	/** Every request the Worker sent, in order. */
	readonly requests: Request[] = [];
	/** When set, every request gets this status, as during an outage or with a revoked token. */
	failWith: number | undefined;
	/** Files on the branch, path to content, in the order they were added. */
	private readonly files = new Map<string, string>();

	constructor(private readonly repo: { name: string; branch: string; token: string }) {}

	/** Puts a file on the branch. */
	addFile(path: string, content = "# Nota\n"): void {
		this.files.set(path, content);
	}

	readonly fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const request = new Request(input, init);
		this.requests.push(request);
		const url = new URL(request.url);

		if (url.origin !== "https://api.github.com") {
			throw new Error(`The Worker tried to reach ${url.origin}, and tests never reach the network`);
		}
		if (request.headers.get("Authorization") !== `Bearer ${this.repo.token}`) {
			return errorResponse(401, "Bad credentials");
		}
		if (!request.headers.get("User-Agent")) {
			return errorResponse(403, "Request forbidden by administrative rules. Please make sure your request has a User-Agent header");
		}
		if (this.failWith !== undefined) {
			return errorResponse(this.failWith, "Simulated failure");
		}
		if (request.method === "GET" && url.pathname === `/repos/${this.repo.name}/git/trees/${this.repo.branch}`) {
			// GitHub treats any value of `recursive` as "yes", even 0 or false.
			return Response.json(this.tree(url.searchParams.has("recursive")));
		}
		return errorResponse(404, "Not Found");
	};

	/** The body of GET /repos/{owner}/{repo}/git/trees/{branch}, as GitHub documents it. */
	private tree(recursive: boolean) {
		const entries: TreeEntry[] = [];
		const folders = new Set<string>();
		for (const [path, content] of this.files) {
			// A recursive tree lists each folder ("tree") before the files in it ("blob").
			const parts = path.split("/");
			for (let depth = 1; depth < parts.length; depth++) {
				const folder = parts.slice(0, depth).join("/");
				if (!folders.has(folder)) {
					folders.add(folder);
					entries.push(this.entry(folder, "tree"));
				}
			}
			entries.push(this.entry(path, "blob", content.length));
		}
		return {
			sha: fakeSha(0),
			url: `https://api.github.com/repos/${this.repo.name}/git/trees/${fakeSha(0)}`,
			// Without `recursive`, GitHub lists only the entries at the top of the tree.
			tree: recursive ? entries : entries.filter((entry) => !entry.path.includes("/")),
			truncated: false,
		};
	}

	private entry(path: string, type: "blob" | "tree", size?: number): TreeEntry {
		const sha = fakeSha(path.length + (size ?? 0));
		const kind = type === "blob" ? "blobs" : "trees";
		return {
			path,
			mode: type === "blob" ? "100644" : "040000",
			type,
			sha,
			...(size === undefined ? {} : { size }),
			url: `https://api.github.com/repos/${this.repo.name}/git/${kind}/${sha}`,
		};
	}
}

interface TreeEntry {
	path: string;
	mode: string;
	type: "blob" | "tree";
	sha: string;
	size?: number;
	url: string;
}

/** A 40-character hex string shaped like a Git SHA. */
function fakeSha(seed: number): string {
	return seed.toString(16).padStart(40, "0");
}

/** GitHub's error body: a message and a link to the docs. */
function errorResponse(status: number, message: string): Response {
	return Response.json({ message, documentation_url: "https://docs.github.com/rest", status: String(status) }, { status });
}
