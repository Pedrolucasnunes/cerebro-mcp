import { describe, expect, it } from "vitest";
import { isNote } from "../src/notes";

// The one rule for what a note is. list_notes uses it, and so will indexing (PR 3).
describe("isNote", () => {
	it.each([
		["decisoes/aprovaoab.md", true],
		["README.md", true],
		["estudos/aws/cloud-practitioner.md", true],
		// A dot inside a name is fine; only a name that starts with one is hidden.
		["ideias/v1.2-plano.md", true],
		["imagens/diagrama.png", false],
		// Obsidian's settings and trash, and GitHub's own files, aren't notes.
		[".obsidian/templates/diaria.md", false],
		[".trash/ideia-velha.md", false],
		[".github/PULL_REQUEST_TEMPLATE.md", false],
		// Nor is anything in a dot-folder further down, or a hidden file.
		["estudos/.cache/resumo.md", false],
		["projetos/.rascunho.md", false],
	])("%s is a note: %s", (path, expected) => {
		expect(isNote(path)).toBe(expected);
	});
});
