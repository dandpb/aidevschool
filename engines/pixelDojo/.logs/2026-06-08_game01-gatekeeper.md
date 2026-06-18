## 2026-06-08 · GATEKEEPER · M1–M5 vertical slice

- **Goal:** build the first playable 8-bit teaching game for curriculum 01 (token-bucket rate limiter) and verify it in a real browser.
- **Built:** single-file Canvas2D game `game-01-rate-limiter/index.html` (~250 lines, no deps, no build step). Chose the Canvas2D "go lighter" option (listed in AGENTS) over Vite+Phaser for a dependency-free, instantly-testable slice — rendered at native 256×240 (NES resolution), integer-scaled ×3, `imageSmoothingEnabled=false`. Phaser remains the path if scenes/physics/asset pipelines grow.
- **Concept → mechanic:** bucket `C=6`, refill `R=1.5/s` shown as the TOKENS HUD; **Z** admits (−1 token); legit (green) admit = +score + small backend heat; abusive (red) admit = BREACH (big heat); letting a request reach the door = free **429**; backend overheat or the end of the 30s shift ends the round. The bucket caps the sustainable admit rate to ≈R — that *is* the lesson.

- **Verified (Playwright headless, chromium installed in-sandbox, loaded via `file://`):**
  - All 4 states render — `shots/01_title.png`, `02_play.png`, `03_midplay.png`, `04_over.png`.
  - **0 page errors, 0 console errors.** Reached game-over naturally at the 30s shift.
  - Skilled-bot playthrough → **DIAGNOSTIC: PASS**. Evidence (`.logs/last_run_evidence.json`): good_admits 18, abusive_admitted 0, abusive_rejected 8, legit_rejected 0, heat_peak 16%, observed_admit_rate 0.6 ≤ R.
  - A naive-bot run that mistimed admits correctly produced `abusive_admitted: 2 → pass: false`, proving the BREACH detection + pass criterion are real (not always-pass).
  - Token-bucket math proven separately: `node tests/token-bucket.test.mjs` → `steady_rate 1.51 ≈ R`, `max_burst_1s 7` (absorbs C then throttles).

- **Learning gate:** on shift-end the game emits the agora-continuum evidence payload for `U0-sonda-rate-limiter-robustness` (project `01_rate_limiter`). It does **not** mark mastery — a separate verifier reads `.logs/last_run_evidence.json` and decides (producer ≠ verifier). This is the learner *attempt* that can close the first `units_log` loop.

- **Next:** MiniMax sprite pass to replace procedural rects (prompts ready in `.prompts/8bit-style.md`); levels L2–L4 (bursts → per-lane fairness → two-door distributed); chiptune BGM that reacts to heat; wire the verifier handoff that appends a unit to `../../learner/learning_state.yaml`.
