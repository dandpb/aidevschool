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
| `data/*.jsonl.gz` | Raw tables exported from the instance database (one JSON object per line, gzipped). See `data/manifest.json` for row counts, sizes and SHA-256 of each file. |
| `board-index.csv` | Every issue: identifier, status, priority, origin, assignee, dates, title. |
| `threads/` | 247 high-value threads rendered as readable Markdown: every thread the founder participated in (199), plus curated protocol/decision issues (`threads/INDEX.md`). |
| `knowledge/founder-directives.md` | All 578 founder comments, chronological — the canonical record of human direction. |
| `knowledge/operating-history.md` | Monthly volume, critical/high-priority issue timeline. |
| `knowledge/ops-protocols.md` | Distilled operating protocols and engine lessons (liveness, standing channels, monitors, supersede pattern, known bugs). |
| `instance/` | (separate PR) Instance config, agent org definitions, storage manifests. |

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

Exported by the CEO agent (run c6e124f0, 2026-11-08) via direct read-only dump of
the embedded instance database + API cross-check, as directed by the founder in
AID-6509. Storage-side artifacts (runbooks, instance config, agent instructions,
storage manifests) archived separately by the Storage Engineer (AID-6508).
