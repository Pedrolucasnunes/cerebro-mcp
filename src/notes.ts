/**
 * Whether a file in the notes repo is a note: a Markdown file (`.md`).
 * It's the one place that decides it, so the list and, from PR 3, the index always agree.
 */
export function isNote(path: string): boolean {
	return path.endsWith(".md");
}
