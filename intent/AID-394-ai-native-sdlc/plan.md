# Plan: adopt the AI-Native SDLC playbook as the repo's engineering loop

Change-id: AID-394-ai-native-sdlc · From: intent/AID-394-ai-native-sdlc/spec.md · Status: approved (retroactively ratified via AID-399 rework; original build shipped unversioned — see intent.md disclosure)

## Files that change

- `.claude/skills/ai-native-sdlc/SKILL.md` (new)
- `.claude/settings.json` (new)
- `.claude/hooks/protect-paths.sh` (new)
- `.claude/hooks/protect-tests.sh` (new)
- `.claude/hooks/guard-commands.sh` (new)
- `.claude/hooks/verify-nudge.sh` (new)
- `docs/sdlc/README.md` (new)
- `docs/sdlc/templates/intent.md`, `docs/sdlc/templates/spec.md`, `docs/sdlc/templates/plan.md` (new)
- `REVIEW.md` (new, root)
- `intent/README.md` (new)
- `AGENTS.md` (modified: +1 WHERE TO LOOK row, +1 CONVENTIONS bullet)
- `CLAUDE.md` (modified: +1 Como trabalhar bullet)
- `intent/AID-394-ai-native-sdlc/{intent,spec,plan}.md` (new — retroactive chain, AID-399)

## Order of work

1. Author skill, hooks, settings wiring (AID-394 build).
2. Author process docs, templates, REVIEW.md, intent home (AID-394 build).
3. Wire AGENTS.md + CLAUDE.md (AID-394 build).
4. Verify hooks (syntax + functional exit-code probes) (AID-394 build).
5. Rework (AID-399): rebase artifacts onto current `origin/main`, author the
   retroactive intent chain, commit surgically on branch `aid-399/sdlc-artifacts`
   (only the paths above), push, open PR.
6. Independent review by a non-producer (QA Lead) against this plan + spec;
   verdict with severities per `REVIEW.md`; founder merges the PR.

## Risks

- `.claude/settings.json` hooks only bind Claude Code sessions — other engines
  rely on convention + audit; acceptable (hooks are the floor, not the ceiling).
- Wiring lines could drift if `AGENTS.md`/`CLAUDE.md` move sections — mitigated
  by rebasing on current `origin/main` in step 5.
- Retroactive chain could legitimize skipping the loop — mitigated by explicit
  disclosure headers and the audit record (AID-395 verdict) kept verbatim.
- Alternative NOT chosen: rewriting history to fake in-order commits — rejected
  (playbook: no history rewrite; honesty over cosmetics).

## Proof

- `bash -n .claude/hooks/*.sh` → no output, exit 0 (all four scripts).
- `python3 -m json.tool .claude/settings.json` → valid JSON.
- `python3 -c "import tomllib,..."` frontmatter parse of `SKILL.md` → name
  `ai-native-sdlc`.
- Functional probes (exit codes): edit under `.mavis/` → blocked (2); edit
  existing `*.test.ts` → blocked (2); new test file → allowed (0);
  `git push --force` → blocked (2); `git add .env.local` → blocked (2);
  plain source edit → allowed (0).
- `git show --stat HEAD` on the rework branch → exactly the files listed above,
  nothing else (surgical commit).
- PR diff against `origin/main` shows only these paths.

## Verification split

- Build self-verification: recorded above (AID-394 build + AID-399 rework, run
  by the producer session — does NOT count as the independent verdict).
- Independent verifier: QA Lead agent (non-producer, fresh context) reviews the
  branch/PR diff against this plan + `spec.md` using the four `REVIEW.md`
  passes and posts a verdict with severities; tracked as a child of AID-399.
