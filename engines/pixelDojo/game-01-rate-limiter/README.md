# GATEKEEPER — curriculum 01: token-bucket rate limiter

A playable 8-bit arcade slice that teaches the **token bucket**: a bucket of `C` tokens refills at
`R`/sec; each admitted request spends one token; with no token, the request is rejected (429).
You're a bouncer-bot at a server's door — admit the good traffic, bounce the bad, and don't let the
backend overheat.

## Run

No build, no dependencies. **Just open `index.html` in any browser.**
(Or serve the folder: `python3 -m http.server` → open the printed URL.)

## Controls

`←/→` move lane · `Z` admit (spends a token) · `Enter` start/restart · `P` pause · `M` mute

Admit <span>green</span> traffic, let <span>red</span> hit the door (a free 429). Tokens refill
slowly — spend them like the bucket does. Survive the 30-second shift without overheating the server.

## Concept → mechanic

| Token bucket | In the game |
| --- | --- |
| Capacity `C = 6` | The row of amber TOKEN cells |
| Refill rate `R = 1.5/s` | Cells refill one pip at a time |
| Spend a token to admit | Press **Z** at the door (−1 token) |
| No token ⇒ 429 reject | Out of tokens ⇒ legit traffic bounces ("missed") |
| Admitting attackers is bad | Red admit = **BREACH** (big server heat) |
| Bucket caps sustained rate | Your admit rate converges to ≈ `R` |

## Verified

Headless Playwright playthrough (chromium) → **DIAGNOSTIC: PASS** — 18 legit admitted, 0 attackers in,
peak heat 16%, **0 console errors**, reached game-over naturally. Screenshots in `./shots/`.

Token-bucket math (executable evidence): `node tests/token-bucket.test.mjs` →
`steady_rate ≈ 1.5 = R`, `max_burst_1s = 7` (a full bucket absorbs a burst of ~C, then throttles to R).

## Learning gate

On shift-end the game emits an evidence payload (see `../.logs/last_run_evidence.json`) for unit
`U0-sonda-rate-limiter-robustness`. The game **emits evidence only** — a separate verifier reads it and
decides mastery (producer ≠ verifier). That handoff is what can close the first `units_log` loop in
`../../learner/learning_state.yaml`.
