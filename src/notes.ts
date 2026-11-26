/**
 * Whether a file in the notes repo is a note: a Markdown file (`.md`) with no part of its path
 * starting with a dot. That leaves out Obsidian's settings (.obsidian/) and trash (.trash/),
 * GitHub's own files (.github/), and hidden files.
 * It's the one place that decides it, so the list and, from PR 3, the index always agree.
 */
export function isNote(path: string): boolean {
	return path.endsWith(".md") && !path.split("/").some((segment) => segment.startsWith("."));
}
