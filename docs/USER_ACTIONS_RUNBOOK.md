# User Actions Runbook

Actions that require the repo owner (not an agent) to execute. These are either
irreversible (history rewrite), require human judgment, or are policy decisions.

Generated 2026-07-11 as part of the recommendations implementation.

## 1. Git housekeeping (reclaim ~150 MB)

Earlier commits pushed ~35 MB of compiled Go binaries under
`curriculum/*/go-impl/`. They were removed from the index (TECH_DEBT item 3), but
the blob history remains. Repository maintenance can reclaim objects that are no
longer reachable, but pruning is destructive for local recovery.

Before collecting garbage:

1. Make sure the worktree is clean and no branch, tag, or worktree still needs
   the objects.
2. Keep an external backup. A mirror clone or bundle protects reachable refs;
   copy the repository's `.git` directory as well if dangling objects may need
   to be recovered.
3. Check the configured retention and inspect candidates before deleting them:

```bash
git status --short
git config --get gc.pruneExpire || echo "Git's default prune retention applies"
git fsck --unreachable
```

Start with the retention-aware default; it preserves the normal recovery window
(`gc.pruneExpire`) instead of deleting unreachable objects immediately:

```bash
git gc
```

Only use `git gc --prune=<retention>` after confirming the unreachable objects
are disposable. `git gc --prune=now` removes eligible unreachable objects without
waiting for the retention window, so it is **not** a no-risk operation; once
deleted, reflogs and local recovery paths may no longer restore them. Coordinate
with other repository users before choosing a shorter retention period.

If the goal is to remove the blobs from history so future clones are smaller, use
`git filter-repo` only as a separately reviewed, backed-up history rewrite; it is
irreversible and rewrites commit SHAs.

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

- **Current state:** do not copy counts here. Read `active_unit`, `next_action`
  and `units_log` in `learner/learning_state.yaml`. At the 2026-07-19 review,
  U2 was `evaluating`, only U0 was mastered, and the next action required fresh
  KV WAREHOUSE evidence plus a separate Prometor receipt.
- **Recommendation:** if Daniel adopts the freeze, prioritize the canonical
  active unit and then follow `curriculum/catalog.md` dependencies before
  building new engines or expanding platform surface.
- **How to enforce:** Add a note to `AGENTS.md` or `CLAUDE.md` instructing agents to
  decline new engine work and prioritize curriculum advancement.

## 4. Curriculum advancement procedure

Use the unit named by canonical learner state. Each programming unit follows the
same 4-step gate cycle:

1. **Present:** Cartógrafo selects the next unit, writes a diagnostic.
2. **Attempt:** Learner writes an attempt file in `learner/attempts/`.
3. **Evidence:** Run the corresponding game's Playwright smoke to produce NDJSON evidence.
4. **Gate:** Run `python3 -m learner.gate --evidence <path>` to verify + promote.

Select later units from `curriculum/catalog.md`; do not maintain a second order
in this runbook. Level 0 no-code units follow ADR-0004 rather than the game/code
gate above.

**Per-unit rubric requirement:** before running a game gate, verify that the
current `metrics.kind` has an explicit branch in
`curriculum/_shared/evidence.py > independently_verified_pass()`. Do not infer
support from an old list in this runbook.

## 5. Monitor doc drift

The substrate now enforces drift detection (BACKLOG_STATUS ↔ dashboard counts), but
free-form docs (README, catalog prose, pipeline_status) can still go stale. The drift
tests in `learner/substrate/tests/` are the early-warning system — fix them when they
fail, don't ignore them.
