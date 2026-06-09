# 8-bit asset prompts (MiniMax) — reusable library

> Generate with `mcp__MiniMax__text_to_image` (sprites/tiles/backgrounds),
> `mcp__MiniMax__music_generation` (chiptune BGM), `mcp__MiniMax__text_to_audio` (SFX).
> **Every time you generate a batch, append the exact prompt + date below** so later batches stay
> visually consistent (the playbook's rule). Treat this file as the asset source of truth.

## Pixel-art caveat (read once)

MiniMax is a general image model, not a true pixel engine. To get usable 8-bit assets:

1. Prompt hard for the style (master block below).
2. Generate larger (e.g. 512–1024px), then **quantize + nearest-neighbor downscale** in post to lock a
   clean pixel grid and a fixed palette. A tiny script does this:

   ```bash
   # pip install pillow --break-system-packages
   python3 -c "from PIL import Image; im=Image.open('in.png').convert('RGB'); \
   im=im.quantize(colors=16).resize((64,64),Image.NEAREST); im.save('out.png')"
   ```

3. Keep transparent backgrounds where the model allows; otherwise key out a flat color in post.

## MASTER STYLE BLOCK (prepend to every image prompt)

> `8-bit pixel art, NES-era retro game sprite, strictly limited 16-color palette, hard-edged pixels,
> no anti-aliasing, no gradients, no blur, bold black or dark outline, flat cel shading, centered,
> on a plain flat magenta (#FF00FF) background for easy keying, crisp and readable at small size.`

Palette anchor (keep consistent across a game): dark navy bg, off-white, NES red, NES green, gold/amber
for tokens, muted gray for UI. Adjust per game but write the chosen palette at the top of each batch.

## Per-asset prompts — Game 01 GATEKEEPER (Rate Limiter)

- **Bouncer-bot (hero):** `<master block> + a small blocky robot bouncer character, 16x16 sprite,
  sturdy stance, single antenna, amber visor, facing the viewer, idle pose.` (Also make: walk-left,
  walk-right, admit-gesture frames — same prompt, change the final clause.)
- **Request sprite — legit:** `<master block> + a small friendly green data-packet creature with little
  legs, 16x16, running pose, smiling.`
- **Request sprite — abusive:** `<master block> + a small angry red data-packet creature with spikes,
  16x16, running pose, scowling.`
- **429 flash:** `<master block> + a red "429" speech-burst icon, 16x16, bold.`
- **Token cell (HUD):** `<master block> + a single glowing amber hexagon energy token, 8x8, three
  versions: full bright, empty dark outline, half-refilling.`
- **Door / gate:** `<master block> + a heavy retro server-room door, 32x32, closed.`
- **Server tower:** `<master block> + a tall blocky server rack, 32x48, four states from cool blue to
  overheating red with warning lights.`
- **Title card:** use the `canvas-design` skill or `<master block> + bold retro arcade title screen
  reading "GATEKEEPER", chunky pixel logo, starry dark background.`

## Audio prompts

- **BGM (loopable chiptune):** `mcp__MiniMax__music_generation` — `upbeat 8-bit chiptune loop, NES
  square-wave lead, driving arpeggio, ~120 BPM, slightly tense, seamless loop, retro arcade.` Make a
  faster variant for high server-heat.
- **SFX admit ("ching"):** `mcp__MiniMax__text_to_audio` — `short bright 8-bit coin pickup blip.`
- **SFX 429 buzzer:** `short harsh 8-bit error buzzer, descending.`
- **SFX overheat alarm:** `rising 8-bit alarm siren, urgent, short.`

## Batch log (append here)

| Date | Asset | Tool | Prompt ref | Output file | Notes |
| --- | --- | --- | --- | --- | --- |
| _example_ 2026-06-08 | token cell | text_to_image | "token cell (HUD)" above | `assets/token.png` | quantized to 8 colors, 8×8 |
