# .logs — append-only work log

Record your thought process, decisions, and dead-ends as you build each game, and reference them when
iterating (the playbook's convention). One file per session or per game is fine
(e.g. `2026-06-08_game01-core-loop.md`). **Append-only** — don't rewrite history; add a correction
entry dated today instead. Screenshots from Playwright playthroughs are evidence artifacts — drop them
here (or in `../docs/`) and link them; do not treat them as source.

## Entry format

```
## <date> · <game> · <milestone>
- Goal: what this session was trying to achieve.
- Did: changes made (files, mechanics, assets).
- Verified: how (Playwright key inputs + screenshot path, console clean?).
- Evidence: any learning-gate evidence emitted (path + what it claims).
- Next / open: what's unresolved.
```

## Example entry

## 2026-06-08 · GATEKEEPER · M1 core loop
- Goal: token meter + admit/reject + server-heat in a single lane.
- Did: scaffolded Vite+Phaser (pixelArt:true); HUD token row refills at R=2/s; Z admits (−1 token);
  admitting at 0 tokens raises heat.
- Verified: `browser_navigate localhost:5173`, sent Z×5, screenshot `./shots/m1.png` — meter drains and
  refills as expected; console clean.
- Evidence: none yet (evidence emit is M4).
- Next: bursts (L2) so the bucket visibly smooths a flash crowd; tune R/C for readability.
