# PLAN slice — `01_rate_limiter` (Token Bucket)

> PLAN slice for `/threejs-dojo 01_rate_limiter`. The slug's catalog concept is
> "Token bucket algorithm, concurrency primitives, atomic refills, shared state".
> The pixel-quest lab teaches it through a **token-bucket** encounter whose playable
> surface *is* the algorithm: the player admits/rejects requests against a refilling
> capacity budget.
>
> **Rebuilt 2026-07-07.** An earlier version of this lab dispatched a `sequence_flow`
> "Agent Quest" orchestration duel where token-bucket was only narrative framing. That
> was a deliberate-but-partial choice; a fresh-context verifier correctly failed it on
> didactic fit (the player never touched capacity-vs-refill). The lab now dispatches the
> `token_bucket` encounter directly, so the mechanic and the concept are the same thing.

## 1. Subject & concept

- **Curriculum project:** `../../curriculum/01_rate_limiter/`
- **One concept this lab teaches:** the **token-bucket algorithm** — a capacity of tokens
  refills at a fixed rate; each admitted request consumes one token; when the bucket is
  empty the request is rejected. The player feels capacity vs refill rate directly.
- **Slug:** `01_rate_limiter`
- **Region id:** `lab-01_rate_limiter`
- **Unit id:** `U0-sonda-rate-limiter-robustness`
- **Encounter id:** `encounter-agent-quest-01`
- **Mechanic in pack:** `token_bucket` (see
  `engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts`; `encounterKind: "token_bucket"`,
  which falls through the default path to the `tokenBucket` factory + the
  `pixelquest-token-bucket` evidence contract).

## 2. Player goal

You are the gatekeeper of a rate-limited service. A token bucket holds a bounded capacity
(`capacity = 6`) that refills continuously (`refillRate = 1.5` tokens/sec). Requests arrive
in a stream — some **legitimate** (`requisição legítima`), some **abusive bursts**
(`rajada abusiva`). **Admit** the legitimate requests (each costs one token); **reject** the
abusive ones before they drain the bucket. Keep the observed admit rate at/below the refill
rate so the bucket never overheats.

## 3. Concept → mechanic mapping

| Concept element | Arcade mechanic | What "playing it right" proves |
| --- | --- | --- |
| **Capacity bounds burst** | Bucket starts full at `capacity`; admits consume 1 token each | The learner feels that a full bucket absorbs a burst but a drained one cannot |
| **Refill rate bounds sustained rate** | `tokens = min(capacity, tokens + elapsed * refillRate)` per tick | The learner sees that long-run admit rate is capped by refill, not by capacity |
| **Admit vs reject decision** | `Z` = Admitir (consume 1 token), `X` = Rejeitar; correct action is `legit → admit, abusive → reject` | The learner exercises the core rate-limiter verdict per request |
| **Auto-reject when empty** | When `tokens < 1`, an admit auto-rejects (no token to spend) | The learner observes the bucket enforcing the limit even if they over-admit |
| **Burst measurement** | `max_burst_1s` = max admits in any 1s sliding window over `admitTimes` | The learner sees the difference between instantaneous burst and average rate |

## 4. Main loop

- Player enters `lab-01_rate_limiter` → phase = `Mapa` (overworld with MENTOR 1 NPC).
- Player presses **E** at the NPC → phase = `Briefing` → `Treino`.
- Player presses **Enter** → phase = `Duelo` (the token-bucket encounter).
- The encounter streams **12 requests**; for each the player presses `Z` (Admitir) or
  `X` (Rejeitar). The correct play is `legit → Z`, `abusive → X`.
- `Duelo` ends with `Evidência PASS emitida` (HUD chip) and emits one
  `EVIDENCE {...}` console record (`metrics.kind === "pixelquest-token-bucket"`) +
  populates `window.__pixelQuestEvidence`.
- Phase advances to `Evidência` → `Revisão`; the next region's gate opens on PASS.
- Total cycle ≈ 20–35 s.

## 5. Inputs & controls

- Arrow keys — move on the overworld / region map.
- `E` — interact with the MENTOR NPC (open the Briefing).
- `Enter` — advance Briefing → Treino → Duelo.
- `Z` — **Admitir** (admit the current request; spends 1 token).
- `X` — **Rejeitar** (reject the current request; no token spent).
- `J` — open the Revisão (spaced-review) panel.
- Two duel actions (`Z`, `X`) keep the NES-pad feel.

## 6. Win / fail states

- **Win the encounter** when the stream is played correctly (8 legit admitted, 4 abusive
  rejected, none over-admitted):
  - `evidence.pass === true`
  - `metrics.kind === "pixelquest-token-bucket"`
  - `metrics.good_admits === 8`
  - `metrics.abusive_admitted === 0`
  - `metrics.abusive_rejected === 4`
  - `metrics.overheated === false`
  - HUD chip shows `Evidência PASS emitida`; gate to `lab-02_key_value_store` opens.
- **Fail the encounter** when an abusive request is admitted or the bucket overheats:
  - `evidence.pass === false`
  - Gate stays locked; the duel can be replayed. No mastery is written.

Both win and fail are **direct readouts of the token-bucket verdicts** — the concept
(capacity vs refill, admit/reject) is the playable surface, not just framing.

## 11. Learning-gate hooks

- **Active unit:** `U0-sonda-rate-limiter-robustness` (project `01_rate_limiter`).
  See `learner/learning_state.yaml` and the `unitId(module)` function in
  `src/content/curriculumPack.ts`.
- **Encounter id wired:** `encounter-agent-quest-01` (special-cased in `curriculumPack.ts`).
- **Evidence contract:** the `token_bucket` kind routes to `TOKEN_BUCKET_CONTRACT`
  (pass rule driven by `good_admits`, `abusive_admitted`, `overheated`); see the encounter
  factory in `src/game/encounters/registry.ts` and `src/game/encounters/tokenBucket.ts`.
- **Evidence record fields** (built in `src/game/encounters/tokenBucket.ts`):
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
      "kind": "pixelquest-token-bucket",
      "target_rate": 1.5,
      "observed_admit_rate": 0.73,
      "max_burst_1s": 2,
      "good_admits": 8,
      "abusive_admitted": 0,
      "abusive_rejected": 4,
      "heat_peak": 56,
      "overheated": false
    },
    "curriculum_context": {
      "concept": "token bucket: capacidade vs reposicao",
      "mechanic": "Token Bucket",
      "accepted_signal": "admitir requisicao legitima",
      "rejected_trap": "rejeitar rajada abusiva"
    },
    "review_context": {
      "scheduled_review": true,
      "streak_candidate": true,
      "scheduler_source": "learner-substrate",
      "verifier_required": true
    }
  }
  ```
  (Metric values above are from the 2026-07-07 rebuild smoke; the exact numbers are
  re-emitted on every playthrough.)
- **Pass rule (gate):** `evidence.pass === true` AND `metrics.kind === "pixelquest-token-bucket"`
  AND `metrics.abusive_admitted === 0` AND `metrics.overheated === false`. Anything else
  keeps the gate locked.
- **Side-effect contract:** the smoke spec asserts
  - `window.__pixelQuestLearningState` is **not** published
  - `localStorage` does **not** contain `learning_state`, `units_log`, or `mastered`
  - The game never marks mastery — `learner/substrate/` owns that transition.
- **Verifier handoff:** the fresh-context verifier subagent receives the four artifacts
  (this plan, the smoke spec, the `EVIDENCE` console record, the screenshot) and judges
  against the done-rule: **"the token-bucket lab's playable surface exercises
  capacity-vs-refill admit/reject and emits a valid `EVIDENCE {...}` with `pass: true`,
  `metrics.kind === 'pixelquest-token-bucket'`, for project `01_rate_limiter`, unit
  `U0-sonda-rate-limiter-robustness`, evidence-backed end-to-end under Playwright."**
