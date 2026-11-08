# Paperclip board archive — AiDevSchool (final snapshot)

This directory preserves the complete operating record of the AiDevSchool agent
company as run on Paperclip (2026-07 → 2026-11), exported before the instance
was deleted at the founder's direction (AID-6509, 2026-11-08).

**Mission preserved:** democratize AI knowledge through short, practical lessons
with a Duolingo-like rhythm — serving both non-programmers and developers
building robust software with AI.

## What is here

| Path | Content |
|---|---|
| `data/*.jsonl.gz` | Raw tables exported from the instance database (one JSON object per line, gzipped). See `data/manifest.json` for row counts, sizes and SHA-256 of each file. Complete snapshot 2026-11-08T14:49:52Z. |
| `board-index.csv` | Every issue: identifier, status, priority, origin, assignee, dates, title. |
| `threads/` | 247 high-value threads rendered as readable Markdown: every thread the founder participated in (199), plus curated protocol/decision issues (`threads/INDEX.md`). |
| `knowledge/founder-directives.md` | All 578 founder comments, chronological — the canonical record of human direction. |
| `knowledge/operating-history.md` | Monthly volume, critical/high-priority issue timeline. |
| `knowledge/ops-protocols.md` | Distilled operating protocols and engine lessons (liveness, standing channels, monitors, supersede pattern, known bugs). |
| `documents/` | The 195 substantive board documents rendered as navigable Markdown, named `AID-*__key.md` (plans, specs, briefs, runbooks, decisions, lesson drafts). |
| `skills/` | The 14 shared company skills (incl. the `paperclip` skill governing assignment/mention/handoff). |
| `protocols/` | CEO-curated consolidation: platform lessons (`licoes-plataforma-paperclip.md`) and history/statistics (`historico-e-estatisticas.md`) from the first export pass. |
| `issue-documents.csv`, `issue-relations.csv`, `work-products.csv` | Document metadata, issue blocking relations, and the 107 work products (PRs, deploys, evidence) with review state. |
| `data/governance-agent-config-revisions.jsonl` | 52 agent-config governance revisions (instruction evolution, before/after). |
| `instance/` | Instance config (scrubbed), agent instruction files (`agents-org/`), storage manifests — delivered by the Storage Engineer (AID-6508, PR #776). |

## Snapshot facts

- Snapshot taken: **2026-11-08T14:49:52Z**
- Issues: **5,785** · Comments: **62,678** · Documents: **5,854** · Thread interactions: **550** · Attachments metadata: **303** · Work products: **107** · Agents: **25**
- Final board state: everything closed except the consolidation task itself and its delegation.
- Last major delivery before archive: 22 PRs merged to `main` (PR #740–#764 era), two launch URLs live (LiteracyDojo — 14 no-code AI missions; CodexDojo OS — guided dev track with Engine Hub allowlist).

## Data schema notes

- `issues.jsonl.gz` — one row per issue with all workflow fields (`execution_state`, `monitor_*`, `origin_*`, `watchdog`).
- `issue_comments.jsonl.gz` — `author_user_id` non-null identifies the founder; `author_agent_id` maps to `agents.jsonl.gz`.
- `documents.jsonl.gz` — `latest_body` holds the current Markdown body (plans, briefs, roadmaps, pitches).
- `document_revisions_meta.jsonl.gz` — revision metadata with `body_md5`/`body_len` (full historical bodies omitted to bound repo size).
- Secrets were scrubbed at export time (JWTs, GitHub/Netlify tokens, AWS keys, generic credentials → `[REDACTED:*]`).
- Excluded on purpose: session/auth tables, API keys, secret vaults, heartbeat run telemetry (1.2 GB), activity log telemetry (377 MB), binary quarantine/worktrees (369 MB).

## How to search

```bash
zcat data/issues.jsonl.gz | jq -r 'select(.status=="done") | .identifier + " " + .title' | head
zcat data/issue_comments.jsonl.gz | grep -c '"author_user_id":"W4VteLICaS4CdmYf0hXsMqadjsBjSOhX"'
```

## Provenance

Two complementary CEO export passes, unified here (deduplicated: superseding the
first pass's partial `raw/` dumps, `issues-index.csv`, `agents.csv`/`agents/`,
`company.json` with the complete equivalents above):

1. **Pass 1** (AID-6506, PR #775 v1): SQL-backup snapshot 2026-11-08T13:35Z +
   live-API delta to ~14:20Z — 5,784 issues, 62,540 comments, 5,848 documents,
   25 agent instruction sets, 14 skills, governance revisions, curated protocols.
2. **Pass 2** (final, this commit): read-only dump of the embedded instance
   database at **2026-11-08T14:49:52Z** — 5,785 issues, 62,678 comments, 5,854
   documents with current bodies, 550 interactions, plus ops tables
   (watchdogs, recovery actions, routines, cost events).

Storage-side artifacts (instance config, agent instructions copy, storage
manifests) delivered by the Storage Engineer (AID-6508, PR #776). Export run
c6e124f0 as directed by the founder (AID-6506/AID-6509).
