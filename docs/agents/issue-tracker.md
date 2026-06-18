# Issue tracker

This repo has no `git remote`, so the primary issue tracker is **local markdown** files under `.scratch/`. A **GitHub mirror** is supported as an optional secondary tracker — opt in once a remote is configured and the `gh` CLI is available.

## Primary: Local Markdown

Issues and PRDs live as markdown files in `.scratch/`.

### Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- Triage state is recorded as a `Status:` line near the top of each issue file (see `triage-labels.md` for the role strings)
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

### When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

### When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

## Optional: GitHub mirror

When a `git remote` points at GitHub and the `gh` CLI is available, issues can be mirrored to GitHub Issues as a public-facing counterpart of the local files.

### When to mirror

Mirror when the issue represents work that should be visible to the public (e.g. an open-source contribution, a portfolio piece). Skip mirroring for purely local / private work.

### How to mirror

The local markdown file is the **source of truth**. Publishing to GitHub is a one-way export:

1. Create the GitHub issue: `gh issue create --title "..." --body "..."`
2. Note the GitHub issue number in the local file's frontmatter (e.g. `github: 42`).
3. From this point on, edits flow back to the local file. The GitHub issue is read-only history.

### When a skill says "publish to the issue tracker (GitHub)"

Use `gh issue create` only if (a) a GitHub remote exists and (b) the user has explicitly asked for a mirror for that issue. Otherwise, fall back to the local markdown conventions above.
