# User Actions Runbook

Actions that require the repo owner (not an agent) to execute. These are either
irreversible (history rewrite), require human judgment, or are policy decisions.

Generated 2026-07-11 as part of the recommendations implementation.

## 1. Git housekeeping (reclaim ~150 MB)

```bash
# Remove unreachable objects from history (compiled Go binaries pushed earlier).
# SAFE: only removes objects not referenced by any branch/tag.
git gc --prune=now
```

**Why:** Earlier commits pushed ~35 MB of compiled Go binaries under
`curriculum/*/go-impl/`. They were removed from the index (TECH_DEBT item 3) but
the blob history remains. `git gc --prune=now` reclaims the space.

**Risk:** None — this only affects unreachable objects. If you also want to rewrite
history to remove the blobs entirely (making the repo smaller for new clones), use
`git filter-repo` — that IS irreversible and rewrites SHAs.

## 2. Prune dead branches

```bash
# Delete the local 'master' branch if it exists and is unused.
git branch -d master  # safe: refuses if not merged

# List and optionally prune merged remote bot branches.
git branch -r --merged main | grep -E 'origin/(bolt-|palette-|sentinel-)'
# To delete a specific merged remote tracking branch:
git push origin --delete <branch-name>
```

**Why:** Parallel agent runs (bolt-*, palette-*, sentinel-*) created remote branches
that have been merged into `main` but not deleted. They clutter `git branch -r`.

## 3. Policy decision: freeze new engines

The analysis recommended temporarily freezing new engine development until the
curriculum reaches ≥6 mastered units. This is a policy call, not code:

- **Current state:** 8 engines built, 2/18 units mastered (after this session: U0 + U2).
- **Recommendation:** Focus on advancing units 03-18 through the learning gate before
  building new engines or expanding platform surface.
- **How to enforce:** Add a note to `AGENTS.md` or `CLAUDE.md` instructing agents to
  decline new engine work and prioritize curriculum advancement.

## 4. Curriculum advancement roadmap (units 03-18)

The next 16 units each require the same 4-step gate cycle:

1. **Present:** Cartógrafo selects the next unit, writes a diagnostic.
2. **Attempt:** Learner writes an attempt file in `learner/attempts/`.
3. **Evidence:** Run the corresponding game's Playwright smoke to produce NDJSON evidence.
4. **Gate:** Run `python3 -m learner.gate --evidence <path>` to verify + promote.

**Suggested order** (following curriculum dependencies):
- U3 (url-shortener) → game-03-wormhole
- U5 (websocket-chat) → game-05-relay-station
- U6 (file-upload) → game-06-pipeline-plant
- U7 (rest-api-auth) → game-07-checkpoint-city
- ... through U18

**Per-unit rubric requirement:** each game's `metrics.kind` must have an entry in
`curriculum/_shared/evidence.py > independently_verified_pass()`. The KV warehouse
rubric (`voxeldoj-kv-warehouse`) was added in this session; the others (wormhole,
relay, etc.) need rubrics added before their gates can run. Check the function's
`kind ==` branches — only `pixelquest-*` kinds and `voxeldoj-kv-warehouse` have
rubrics today.

## 5. Monitor doc drift

The substrate now enforces drift detection (BACKLOG_STATUS ↔ dashboard counts), but
free-form docs (README, catalog prose, pipeline_status) can still go stale. The drift
tests in `learner/substrate/tests/` are the early-warning system — fix them when they
fail, don't ignore them.
