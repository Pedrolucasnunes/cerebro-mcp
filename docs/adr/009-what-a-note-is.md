# ADR 009: What a note is

| | |
|---|---|
| **Status** | Proposed |
| **Date** | 2026-11-26 |

## Context

The notes repo is also an Obsidian vault and a GitHub repo, so it can hold Markdown files that aren't notes: Obsidian's settings (`.obsidian/`) and its trash (`.trash/`), GitHub's own files (`.github/`), and hidden files. `list_notes` lists the notes now, and from PR 3 search indexes them. If the two disagreed on what a note is, search could return a file the list never shows, or the other way round.

## Decision

A note is a `.md` file with no path segment starting with `.`. One function, `isNote` in `src/notes.ts`, decides it. `list_notes` uses it, and PR 3's indexing will use it too.

## Alternatives considered

- **Every `.md` file**, the spec's first wording: the simplest rule, but Obsidian's trash and templates would show up in the list and in search.
- **A fixed list of folders to hide** (`.obsidian/`, `.trash/`, `.github/`): it misses a renamed Obsidian config folder and the hidden folders of any other tool.
- **A list of the folders that hold notes** (`ideias/`, `decisoes/`, …): every new folder would need a code change, while §4.1 allows any folder.
- **Obsidian's "Excluded files" setting, or an ignore file in the repo**: one more file to read on every call, and a second place to configure.

## Consequences

- Moving a note to Obsidian's trash takes it out of the list, and from PR 3 out of search.
- A note can't live in a folder whose name starts with a dot: it would exist in the repo but never be listed or found.
- The path rules for reads and writes (§3, PR 2) still accept such paths. PR 2 decides whether to align them with this rule.

## Revisit when

A real note gets hidden, or a file that isn't a note shows up in the list or in search.
