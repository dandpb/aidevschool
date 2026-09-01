# Intent: enforce the SDLC guardrails in CI (runtime-agnostic)

Author: Paperclip AID-537 (audit AID-400, Registro #4; owner FPE, scope accepted by CEO) · Change-id: AID-537-ci-sdlc-guards · Status: accepted (issue gate passed)

> One source of truth: the AID-537 issue body records the audit finding and
> the CEO-accepted scope. Summary quote: "os hooks do AID-394 … são
> PreToolUse/PostToolUse **do Claude Code apenas** … Adapter de todos os
> agentes da empresa é `opencode_local` → **nenhum runtime ativo executa
> esses guardrails**." Proposed action: "job/step de CI que executa
> `protect-paths.sh`, `protect-tests.sh` e `guard-commands.sh` em modo check
> sobre o diff do PR (falha em violação), + documentar no
> `docs/sdlc/README.md` que o override declarativo continua exigindo aceite
> do owner."

## Problem

The deterministic guardrails shipped by AID-394 only execute inside Claude
Code sessions. Every company agent runs on another runtime, so protected-path
edits, mid-fix test weakening, and committed credentials were enforced only
by discipline and manual disclosure (exactly what audit AID-400 Registro #4
found: declarative-only on the live wave).

## Proposed outcome

The same three canonical hook scripts also check every PR's committed diff in
CI, so a violation fails the build regardless of the producing runtime. The
enforcement path is continuously self-proven (synthetic violations in CI) and
the owner-approved override becomes an auditable commit trailer.

## Affected users and systems

`.github/workflows/ci.yml` (new job), `scripts/sdlc_guard_check.sh` (new),
`docs/sdlc/README.md` (§Guardrails), `intent/AID-537-ci-sdlc-guards/`. No
engine runtime, learner state, or curriculum content changes.

## Constraints

- No new dependencies beyond bash + git + jq (jq already required by the
  hooks and present on ubuntu-latest).
- The canonical logic stays in `.claude/hooks/*.sh` — the CI checker only
  synthesizes their stdin contract (no duplicated policy).
- `.mavis/` and `.loops/` are tracked derived paths with legitimate
  regeneration flows, so the CI check must keep an owner-gated override.
- Credential findings get no override; the force-push rule cannot be
  re-checked from a diff and stays runtime-intercepted.
