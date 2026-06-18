# codexDojo: Ecosystem Manifest

A complete playable MVP of an 8-bit inspired browser game about the `codexDojo` learning loop. The
player moves through a digital dojo, speaks with AI agents, collects useful software-development
artifacts, avoids quality hazards, completes learning cycles, and unlocks the next challenge.

The main design rule is simple: every game cycle must result in visible, collectible, useful
artifacts.

## How To Run

Open `index.html` in a browser.

No build step and no dependency install are required. A static server also works:

```bash
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/`.

## Controls

- Arrow keys or WASD: move
- E, Enter, or Space: interact with nearby agents
- R: reset the run and clear the local memory log

## Gameplay Loop

1. Move through the digital dojo.
2. Speak with AI agents for short guidance.
3. Collect every artifact required by the current cycle.
4. Avoid hazards that reduce score and engineering metrics.
5. Complete the cycle to write a persistent memory entry.
6. Unlock the next cycle and repeat with stronger quality goals.

## Implemented Features

- Canvas-based 2D rendering.
- Keyboard movement with collision boundaries.
- Pixel-inspired tile dojo map.
- Player character.
- Six NPC agents with short dialogue.
- Eight collectible software artifacts.
- Five software-quality hazards.
- Score and metric system.
- Two learning cycles with completion state.
- Cycle 1 fully playable and unlocks Cycle 2.
- HUD for current cycle, required artifacts, collected artifacts, metrics, and memory count.
- Local memory log stored in `localStorage`.
- Manifest documentation mapping mechanics to the codexDojo purpose.

## Next Improvements

- Add sound effects for artifact collection and hazard collisions.
- Add a title screen and cycle-select screen.
- Add animated sprite frames for agents, hazards, and the player.
- Emit a downloadable evidence JSON file for a verifier agent.
- Add mobile touch controls.
