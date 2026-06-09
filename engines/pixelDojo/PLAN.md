# PLAN.md — pixelDojo game definition

> Fill this **before** scaffolding. A game with a vague plan teaches nothing measurable.
> One file per game; keep each game in its own subfolder. Sections 1–12 are the template;
> Section "WORKED EXAMPLE" shows all of them filled for the Rate Limiter subject.

---

## TEMPLATE (copy this block for a new game)

**1. Subject & concept**
Curriculum project: `../../curriculum/<NN_subject>/`. The ONE concept this game teaches: `<concept>`.
(Out of scope: everything else in that project. One game = one concept.)

**2. Player goal**
What the player is trying to do, in one sentence a 10-year-old understands.

**3. Concept → mechanic mapping** (the pedagogical core)

| Concept element | Arcade mechanic | What "playing it right" proves |
| --- | --- | --- |
| `<e.g. token refill rate R>` | `<e.g. energy meter that fills R/sec>` | `<player paced admits to R>` |

**4. Main loop** — the 10–30s cycle the player repeats.

**5. Inputs & controls** — keys/buttons; keep it ≤3 actions for an 8-bit feel.

**6. Win / fail states** — both must be a direct consequence of using the concept correctly/incorrectly.

**7. Progression / difficulty** — levels that each deepen ONE facet of the concept.

**8. Visual direction** — palette (≤16 colors), sprite grid (8×8 / 16×16), CRT/scanlines? Reference `.prompts/8bit-style.md`.

**9. Audio direction** — chiptune BGM mood, key SFX. (MiniMax `music_generation` / `text_to_audio`.)

**10. Stack & hosting** — Vite+Phaser by default; backend only if the concept demands shared state.

**11. Learning-gate hooks**

- Targets `active_unit` `<id>` in `../../learner/learning_state.yaml`.
- On level clear, emit evidence (NDJSON) → `../../learner/<discover real path>`: fields
  `{unit_id, ts, level, metrics{...}, pass}`.
- Verifier (separate context) checks vs `empirical_gate`, then appends to `units_log`. **Game never does this.**

**12. Milestones** — M0 plan → M1 core loop → M2 art pass → M3 levels → M4 evidence emit → M5 polish → M6 verify (Playwright playthrough + screenshots).

---

## WORKED EXAMPLE — Game 01: "GATEKEEPER" (Token-Bucket Rate Limiter)

**1. Subject & concept**
Curriculum project: `../../curriculum/01_rate_limiter/`. Concept: **the token-bucket algorithm** —
a bucket of capacity `C` refills at `R` tokens/sec; each request spends one token; no token ⇒ reject
(HTTP 429). Out of scope: Redis internals, the Go/Rust/Node comparison (that's the curriculum's job).

**2. Player goal**
You are an 8-bit bouncer-bot at the door of a server. Let in as much *legit* traffic as you can
**without overheating the server**, by spending tokens you only get back over time.

**3. Concept → mechanic mapping**

| Concept element | Arcade mechanic | What "playing it right" proves |
| --- | --- | --- |
| Bucket capacity `C` | Row of `C` glowing token-cells at the top | Player understands burst budget |
| Refill rate `R`/sec | Cells refill one pip every `1/R`s (a dripping meter) | Player paces sustained admits ≈ `R` |
| Spend 1 token / request | Press **Z** to admit the request at the door (−1 token) | Player links "admit" to "cost" |
| No token ⇒ 429 reject | If you admit with 0 tokens the server **overheats**; the safe move is to let it bounce (flash red "429") | Player rejects when the budget is empty |
| Burst vs sustained | Traffic arrives in bursts; bucket absorbs a burst up to `C`, then only `R`/sec gets through | Player uses the bucket to *smooth* bursts |

**4. Main loop**
Pixel "request" sprites run toward the door in lanes. A wave mixes legit (green) and abusive (red)
traffic. The player moves to a lane and presses **Z** to admit (spends a token) or lets the
auto-bouncer reject. Tokens refill on the meter. Server-heat rises when over-admitting and cools when
paced. Loop length ≈ 20s per wave.

**5. Inputs & controls**
← → move bouncer between lanes · **Z** admit (spend token) · **X** inspect (briefly tags a sprite
legit/abusive). Three actions, NES-pad friendly.

**6. Win / fail states**
*Win a wave:* server-heat stayed below max AND legit-admit-rate ≥ target (you didn't needlessly bounce
good traffic). *Fail:* server overheats (you spent tokens you didn't have / over-admitted) or too many
legit requests were rejected. Both are direct readouts of bucket discipline.

**7. Progression / difficulty**

- **L1 — First Tokens:** single lane, fixed slow rate. Learn admit = spend.
- **L2 — Flash Crowd:** a burst arrives. The bucket (`C`) absorbs it, then only `R`/sec passes. Learn capacity vs rate.
- **L3 — Many Clients:** per-lane (per-key) buckets; one noisy client must not starve others (fairness).
- **L4 — Two Doors:** two bouncers share one bucket (a "Redis" cell in the middle) — admits must stay
  consistent across doors. Mirrors the distributed token-bucket in the curriculum.

**8. Visual direction**
NES-style ≤16-color palette; 16×16 character sprites, 8×8 tiles; the token meter is the HUD hero
element; subtle CRT scanline overlay (toggleable). See `.prompts/8bit-style.md` for the master style block.

**9. Audio direction**
Looping chiptune that **speeds up as server-heat rises**; SFX: a coin "ching" on admit, a buzzer on
429, a rising alarm near overheat. Generate via MiniMax `music_generation` (BGM) and `text_to_audio` (SFX).

**10. Stack & hosting**
Vite + Phaser 3, `pixelArt: true`, integer zoom. No backend for L1–L3. L4 can **simulate** the shared
bucket in-memory first; only add a tiny shared-state server if you want true two-window play.

**11. Learning-gate hooks**

- Targets `active_unit: U0-sonda-rate-limiter-robustness` (project `01_rate_limiter`) in
  `../../learner/learning_state.yaml` — the `presenting → practicing` stage, made playable.
- On each wave clear, emit one NDJSON line to `../../learner/` (confirm the real evidence file first):
  `{"unit_id":"U0-sonda-rate-limiter-robustness","ts":"<iso>","level":2,"metrics":{"target_rate":5,"observed_admit_rate":5.2,"burst_absorbed":10,"overheats":0,"legit_rejected":1},"pass":true}`.
- A **separate verifier** checks this against `empirical_gate` (executable evidence required) and, if it
  holds, appends `{id, mastered_at, evidence}` to `units_log` and may add a `journal.md` generalization.
  The game emits evidence only — it never marks mastery. This is how the first real learning loop closes.

**12. Milestones**

- **M0** this plan (done).
- **M1** core loop: one lane, token meter, admit/reject, heat. Verify with Playwright (key inputs + screenshot).
- **M2** art pass: bouncer, request sprites, token HUD, door — via MiniMax; prompts saved to `.prompts/`.
- **M3** levels L1–L4 + difficulty curve.
- **M4** evidence emit + verifier handoff doc (close the gate loop on L2).
- **M5** polish: chiptune that reacts to heat, screen-shake on overheat, 429 juice.
- **M6** verify: full Playwright playthrough of L1–L2, screenshots as evidence artifacts in `.logs/`.

**Asset list (→ `.prompts/8bit-style.md`)**
bouncer-bot (idle/walk/admit), request-sprite (legit green / abusive red / 429 flash), token-cell
(full/empty/refilling), door, server tower (cool→hot states), HUD font, title card.

**Open questions / risks**
Is "overheat on over-admit" intuitive enough, or should the failure be more literal (server crash)?
Does L4 need a real second window to teach distribution, or is the simulated shared cell enough for the
diagnostic? Resolve by playtesting L1–L2 before building L3–L4.
