import type { CallToolResult, Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeGitHub } from "./helpers/fake-github";
import {
	ERAS,
	TEST_GITHUB_TOKEN,
	TEST_MCP_TOKEN,
	connectMcp,
	fakeNotesRepo,
	testEnv,
	toolText,
} from "./helpers/worker";

// Claude may speak either protocol era, so every behavior is checked with both.
describe.each(ERAS)("list_notes, for a %s client", (era) => {
	let github: FakeGitHub;
	let client: Client | undefined;

	beforeEach(async () => {
		github = fakeNotesRepo();
		vi.spyOn(globalThis, "fetch").mockImplementation(github.fetch);
		client = await connectMcp({ era });
	});

	afterEach(async () => {
		await client?.close();
		client = undefined;
		vi.restoreAllMocks();
	});

	function connected(): Client {
		if (!client) throw new Error("The MCP client didn't connect");
		return client;
	}

	function listNotes(args: { prefix?: string } = {}): Promise<CallToolResult> {
		return connected().callTool({ name: "list_notes", arguments: args });
	}

	/** The note paths in a result, in alphabetical order (the order itself isn't part of the contract). */
	function paths(result: CallToolResult): string[] {
		return toolText(result).split("\n").toSorted();
	}

	it("lists the path of every Markdown note on the branch, in any folder", async () => {
		github.addFile("README.md");
		github.addFile("decisoes/aprovaoab.md");
		github.addFile("decisoes/aprovaoab-mcp.md");
		github.addFile("estudos/aws/cloud-practitioner.md");
		github.addFile("imagens/diagrama.png");
		github.addFile("projetos/rascunho.txt");

		const result = await listNotes();

		expect(result.isError).toBeFalsy();
		expect(paths(result)).toEqual([
			"README.md",
			"decisoes/aprovaoab-mcp.md",
			"decisoes/aprovaoab.md",
			"estudos/aws/cloud-practitioner.md",
		]);
	});

	it("lists only the notes under a folder", async () => {
		github.addFile("decisoes/aprovaoab.md");
		github.addFile("decisoes/aprovaoab-mcp.md");
		github.addFile("projetos/cerebro-mcp.md");

		const result = await listNotes({ prefix: "decisoes/" });

		expect(paths(result)).toEqual(["decisoes/aprovaoab-mcp.md", "decisoes/aprovaoab.md"]);
	});

	it("matches the prefix as text, so it can be the start of a file name", async () => {
		github.addFile("ideias/2026-11-25-cerebro.md");
		github.addFile("ideias/2026-12-01-outra.md");

		const result = await listNotes({ prefix: "ideias/2026-11" });

		expect(paths(result)).toEqual(["ideias/2026-11-25-cerebro.md"]);
	});

	it("says so when no note matches the prefix, without an error", async () => {
		github.addFile("decisoes/aprovaoab.md");

		const result = await listNotes({ prefix: "estudos/" });

		expect(result.isError).toBeFalsy();
		expect(toolText(result)).toContain("estudos/");
		expect(toolText(result)).not.toContain("decisoes/aprovaoab.md");
	});

	it("says which repo has no notes yet, without an error", async () => {
		github.addFile("imagens/diagrama.png");

		const result = await listNotes();

		expect(result.isError).toBeFalsy();
		expect(toolText(result)).toContain("test-owner/test-notes");
		expect(toolText(result)).not.toContain("diagrama.png");
	});

	it("reads NOTES_REPO at NOTES_BRANCH with a single GitHub call", async () => {
		github.addFile("decisoes/aprovaoab.md");

		await listNotes();

		expect(github.requests).toHaveLength(1);
		const [request] = github.requests;
		expect(request?.method).toBe("GET");
		expect(new URL(request?.url ?? "").pathname).toBe("/repos/test-owner/test-notes/git/trees/test-branch");
	});

	it.each([401, 404, 500])("turns a %i from GitHub into a tool error that names it, with no secret in it", async (status) => {
		github.addFile("decisoes/aprovaoab.md");
		github.failWith = status;

		const result = await listNotes();

		expect(result.isError).toBe(true);
		expect(toolText(result)).toContain(String(status));
		expect(toolText(result)).not.toContain(TEST_GITHUB_TOKEN);
		expect(toolText(result)).not.toContain(TEST_MCP_TOKEN);
	});

	it("says GITHUB_TOKEN is missing, without calling GitHub", async () => {
		const clientWithoutToken = await connectMcp({ era, env: { ...testEnv, GITHUB_TOKEN: undefined } });

		const result = await clientWithoutToken.callTool({ name: "list_notes", arguments: {} });

		expect(result.isError).toBe(true);
		expect(toolText(result)).toContain("GITHUB_TOKEN");
		expect(github.requests).toHaveLength(0);
		await clientWithoutToken.close();
	});

	it("tells clients it only reads, and only from the notes", async () => {
		const { tools } = await connected().listTools();
		const listNotesTool = tools.find((tool) => tool.name === "list_notes");

		expect(listNotesTool?.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: false });
	});
});
