# PLAN slice — `01_rate_limiter` (Agent Quest: Rate Limiter)

> PLAN slice for `/threejs-dojo 01_rate_limiter`. The slug's catalog concept is
> "Token bucket algorithm, concurrency primitives, atomic refills, shared state" — the algorithm
> itself. The current pixel-quest lab teaches it through a **sequence-flow** encounter called
> *Agent Quest: Rate Limiter* (per the curriculum pack author's pedagogical frame: the algorithm
> is the verification object, the agent orchestration is the playable surface).
>
> **Path A (accepted)**: this slice is the canonical plan for the slug as it exists. The
> worked-example "Gatekeeper" game in `../../engines/pixelDojo/PLAN.md` is the **template** for a
> direct token-bucket mechanic; the actual implementation chose the orchestration wrapper instead.
> A future run with path B (replace) would re-author the implementation to match Gatekeeper.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/01_rate_limiter/`
- **One concept this lab teaches:** the agent-orchestration protocol (PLAN → ACT → OBSERVE →
  VERIFY) used to prove **token-bucket robustness** end-to-end. The token-bucket algorithm is the
  *target under verification*, not the direct arcade mechanic.
- **Slug:** `01_rate_limiter`
- **Region id:** `lab-01_rate_limiter`
- **Unit id:** `U0-sonda-rate-limiter-robustness`
- **Encounter id:** `encounter-agent-quest-01`
- **Mechanic in pack:** `sequence_flow` (see `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts:48`)

## 2. Player goal

You are the Maestro of an agent team (Sonda, Mestre-Conteúdo, Prometor) running the
plan-act-observe-verify loop against a token-bucket rate limiter. Admit the orchestration steps
that move the loop forward; block the traps that would skip the evidence (Socrates giving the
solution before the learner's attempt, implementer coding before the criterion, producer verifying
their own patch, metrics celebrating a score without an executed command, memory marking
`DOMINADO` before the gate).

## 3. Concept → mechanic mapping

| Concept element | Arcade mechanic | What "playing it right" proves |
| --- | --- | --- |
| Token-bucket robustness must be **proven**, not assumed | Sequence of 5 `advance` steps (PLAN: Sonda, PLAN: Mestre-Conteúdo, ACT: Implementador, OBSERVE: Testes, VERIFY: Prometor) | The learner walks the full protocol instead of skipping to a result |
| Each transition has a guard against premature shortcuts | 5 `guard` traps between the advance steps (Socrates before attempt, implementer before criterion, producer self-verify, metrics without command, memory before gate) | The learner learns the **order of evidence** and the specific shortcuts that break it |
| Token-bucket is the algorithmic target, not the playable surface | Concept text in the briefing names "token bucket"; the resource meter in HUD reads "Gates" (the gate to the next lab, opened only after evidence PASS) | The learner associates "token-bucket" with "I had to run the full protocol to clear the gate" |
| Evidence is the proof artifact | The encounter emits `EVIDENCE {...}` with `pass: true` only when all 5 advance steps fire and no guard is missed | The learner sees the contract between play and proof |

## 4. Main loop

- Player enters `lab-01_rate_limiter` → phase = `Mapa` (overworld with MENTOR 1 NPC).
- Player presses **E** at the NPC → phase = `Briefing` → `Treino` (`Simulação de orquestração`).
- Player presses **Enter** → phase = `Duelo` (the actual encounter).
- Encounter exposes 10 sequence steps; player cycles `Z` (Acionar / advance) and `X`
  (Bloquear / guard) for 10 inputs.
- `Duelo` ends with `Evidência PASS emitida` (visible HUD chip) and emits one
  `EVIDENCE {...}` console record + populates `window.__pixelQuestEvidence`.
- Phase advances to `Evidência` → `Revisão`; player can return to `Mapa` and the next region's
  gate opens.
- Total cycle ≈ 25–40 s (per the catalog's "25–40 min sessions, 4-5x/week" cadence at the lesson
  level; this is the per-encounter micro-loop).

## 5. Inputs & controls

- `←` `→` `↑` `↓` — move learner sprite on the overworld / region map (arrow keys).
- `E` — interact with the MENTOR NPC (open the Briefing).
- `Enter` — advance Briefing → Treino → Duelo.
- `Z` — Acionar (advance step; spend 1 token of the orchestration budget).
- `X` — Bloquear (reject a guard trap; equivalent to a defensive action).
- `J` — open the Revisão (spaced-review) panel.
- ≤ 3 distinct duel actions (`Z`, `X`, plus the implicit cadence) keeps the NES-pad feel.

## 6. Win / fail states

- **Win the encounter** when all 5 `advance` steps fire and no `guard` is missed:
  - `evidence.pass === true`
  - `metrics.kind === "pixelquest-sequence-flow"`
  - `metrics.advanced === 5`
  - `metrics.guards_missed === 0`
  - HUD chip shows `Evidência PASS emitida`
  - Status strip on the map shows `Evidência PASS`
  - Gate to `lab-02_key_value_store` opens (`button[Lab bloqueado]` becomes enabled)
- **Fail the encounter** when any `guard` is missed (a trap is `advance`'d instead of `reject`'d):
  - `evidence.pass === false`
  - Gate stays locked (`button[Lab bloqueado]` remains disabled)
  - The next duel replay can re-attempt; no mastery is written.

Both win and fail are **direct readouts of the protocol discipline** — the token-bucket
robustness is only "proven" when the full plan-act-observe-verify sequence is walked.

## 11. Learning-gate hooks

- **Active unit:** `U0-sonda-rate-limiter-robustness` (project `01_rate_limiter`).
  See `learner/learning_state.yaml` and `src/content/curriculumPack.ts:626-630` for the
  `unitId(module)` function that derives it.
- **Encounter id wired:** `encounter-agent-quest-01` (see
  `src/content/curriculumPack.ts:632-637`).
- **Evidence contract** (single source of truth, anti-drift invariant
  `TECH_DEBT_AUDIT_2026-06-28.md` D10):
  `SEQUENCE_CONTRACT` in `src/content/types.ts:98-101`
  (`{ minAdvanced: 0, maxGuardsMissed: 0 }`) plus the module-derived thresholds:
  `minAdvanced = steps.filter(s => s.type === "advance").length` (5),
  `maxGuardsMissed = 0` (see `evidenceContractFor` in
  `src/content/curriculumPack.ts:526-533`).
- **Evidence record fields** (defined in `src/game/evidence/types.ts`, built in
  `src/game/encounters/sequenceFlow.ts:buildEvidence`):
  ```json
  {
    "source": "pixelquest",
    "unit_id": "U0-sonda-rate-limiter-robustness",
    "project": "01_rate_limiter",
    "encounter_id": "encounter-agent-quest-01",
    "game": "PixelDojo Quest",
    "ts": "<iso8601>",
    "pass": true,
    "metrics": {
      "kind": "pixelquest-sequence-flow",
      "advanced": 5,
      "guards_missed": 0,
      "advances_total": 5,
      "guards_total": 5
    },
    "curriculum_context": {
      "concept": "Orquestracao agentica para provar robustez de token bucket",
      "mechanic": "Agent Quest",
      "accepted_signal": "acao agentica correta",
      "rejected_trap": "atalho sem evidencia"
    },
    "review_context": {
      "scheduled_review": true,
      "streak_candidate": true,
      "scheduler_source": "learner-substrate",
      "verifier_required": true
    }
  }
  ```
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.advanced === 5` AND
  `metrics.guards_missed === 0`. Anything else keeps the gate locked.
- **Side-effect contract** (already asserted by the existing smoke spec at
  `playwright/pixel-quest.spec.ts:169-176`):
  - `window.__pixelQuestLearningState` is **not** published
  - `localStorage` does **not** contain `learning_state`, `units_log`, or `mastered`
  - The game never marks mastery — `learner/substrate/` owns that transition.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts (this
  plan, the smoke spec, the `EVIDENCE` console record, the screenshot) and judges against the
  done-rule: **"the sequence-flow Agent Quest lab emits a valid `EVIDENCE {...}` with
  `pass: true` for project `01_rate_limiter`, unit `U0-sonda-rate-limiter-robustness`, and the
  didactic chain (5 advance / 0 guards-missed) is evidence-backed end-to-end under Playwright."**
