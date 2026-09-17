# Plan — rtk for all agent CLIs (collapsed: small bounded change)

Scope: machine-level agent config + one AGENTS.md bullet. No engine code.

## Files that change

| # | Path | Via |
|---|------|-----|
| 1 | `~/.claude/settings.json` + `~/.claude/RTK.md` + `@RTK.md` in `CLAUDE.md` | `rtk init -g --auto-patch` |
| 2 | `~/.codex/AGENTS.md` + `~/.codex/RTK.md` | `rtk init --codex -g` |
| 3 | `~/.omp/agent/extensions/rtk.ts` | `rtk init --agent omp -g --auto-patch` |
| 4 | `~/.gemini/hooks/rtk-hook-gemini.sh` + `~/.gemini/GEMINI.md` | `rtk init --gemini -g --auto-patch` |
| 5 | `~/.copilot/copilot-instructions.md` + `~/.copilot/hooks/rtk-rewrite.json` | `rtk init --copilot -g --auto-patch` |
| 6 | `~/.config/opencode/plugins/rtk.ts` | `rtk init --opencode -g --auto-patch` |
| 7 | repo `AGENTS.md:121-122` | manual edit (convention widened to all agents) |

## Order

Per-agent installs sequential (avoid racing rtk's own state), then the repo
doc line, then verification.

## Proof

- `rtk init --show` reports Hook / RTK.md / settings.json / OpenCode `[ok]`.
- Every artifact path above exists on disk.
- `rtk rewrite 'git status'` → `rtk git status` (rewrite is the hooks'
  single source of truth).
- `grep rtk AGENTS.md` shows the all-agents bullet.
- `git diff AGENTS.md` touches only that bullet.

## Risks / deliberately not done

- Codex has no command-hook API → instruction-only ("full awareness": the
  model prefixes `rtk` itself); compliance is best-effort by design.
- Pre-existing working-tree deletions under `.agents/skills/` are unrelated
  user work — untouched.
- `engines/codexDojo/ecosystem/MANIFEST.md` untouched: machine-level
  tooling convention, not a product-facing prompt/contract change.
