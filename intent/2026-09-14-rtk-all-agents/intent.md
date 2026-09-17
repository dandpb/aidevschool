# Intent — rtk for all agent CLIs

## Problem

`rtk` (token-compacting CLI proxy) was installed ad hoc; only the Codex
convention referenced it (`AGENTS.md:121`). The other agent CLIs on this
workstation (Claude Code, omp, OpenCode, Gemini, Copilot) ran raw commands
and paid full token cost for noisy tool output.

## Proposed outcome

Every agent CLI installed on this workstation routes shell command output
through rtk, globally (user-scoped, all projects), via rtk's native
per-agent integration. The repo convention line reflects "all agents",
not Codex only.

## Affected

- Machine: `~/.claude`, `~/.codex`, `~/.omp`, `~/.config/opencode`,
  `~/.gemini`, `~/.copilot`.
- Repo: `AGENTS.md` CONVENTIONS (one bullet), `intent/` (this artifact).
- No engine code, no learner/curriculum contract change.

## Constraints

- Global (user) scope, not per-project files inside this repo.
- Must not clobber existing hooks: `herdr-agent-state.sh` SessionStart in
  `~/.claude/settings.json`; repo-local `.claude/settings.json` guard hooks
  stay project-local and untouched.
- Backups kept for any patched config (`settings.json.bak` written by rtk).

## Open questions

None carried.
