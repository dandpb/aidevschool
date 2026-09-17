# Review — 2026-09-14-rtk-all-agents

## Fresh-context verification (Stage 4)

PASS on all acceptance items — verifier `RtkVerifier` (scout, read-only,
duration 1m30s):

- All 10 machine-level artifacts exist and are non-empty (8–4835 bytes);
  `~/.claude/CLAUDE.md` = `@RTK.md`; `~/.codex/AGENTS.md` references
  `~/.codex/RTK.md`; omp/OpenCode plugins delegate to `rtk rewrite`;
  Gemini hook = `exec rtk hook gemini`; Copilot hook = `rtk hook copilot`.
- `~/.claude/settings.json` gained PreToolUse(Bash) → `rtk hook claude`
  while preserving the pre-existing SessionStart `herdr-agent-state.sh`.
- `git diff AGENTS.md` is a single hunk touching only the rtk bullet,
  now covering all six agents with their init commands.

Full payload: `agent://RtkVerifier`

## REVIEW.md passes (advisory)

- **Correctness vs plan:** all 7 plan rows landed; proof criteria met
  (`rtk init --show` all `[ok]`, artifacts on disk,
  `rtk rewrite 'git status'` → `rtk git status`).
- **Tests/evidence:** docs-only repo change — no suite applicable;
  machine-side evidence recorded above.
- **Conventions:** one AGENTS.md bullet updated; `MANIFEST.md`
  intentionally untouched (machine-level tooling, not a product-facing
  prompt/contract change).
- **Security:** install script reviewed before execution (checksum-gated
  release binary, path-traversal-checked tar, no sudo, `$HOME`-scoped);
  telemetry is opt-in and OFF; existing hooks preserved;
  `settings.json.bak` kept by rtk init.

## Ship

Commit: `docs(agents): route all agent CLIs through rtk`
