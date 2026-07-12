# MiniTown — Visual Direction

Generated concepts for visual reference. See the 8 images in this directory.

## Visual language

- **Style:** Low-poly stylized 3D with a cozy, slightly toy-like feel. Sits between
  Townscaper (clean blocky geometry), A Short Hike (warm soft palette), and a
  3D pixel-art aesthetic. NOT voxel cubes — use varied geometry per building
  (pitched roofs, awnings, fences) but keep it low-poly (≤ 200 tris per building).
- **Camera:** Slightly top-down. ~30–40° pitch. Wide enough to see the whole
  20×20 grid in frame. Orbit-style, with damping. Look at center of town.
- **Palette:** Pastel base — soft sage greens for grass, muted teal-blue water,
  warm cream/sand for paths. Buildings use a small accent palette
  (terracotta red roofs, warm yellow windows, navy/forest green walls,
  cream trim). Saturation is moderate — not flat, not vibrant.
- **Lighting:** Single directional light = the sun. Ambient + hemisphere fill.
  At night, shift env color toward cool indigo. Windows and streetlights
  become warm point lights (additive bloom optional but kept subtle).
- **Sky:** Smooth gradient. Day = warm light blue. Sunset = orange/pink horizon
  to blue zenith. Night = deep indigo with simple star points (no skybox art).
- **Atmosphere:** Light fog at the horizon to soften the far edges. Never
  obscure gameplay.

## Buildings (3 zone types)

1. **Residential** — 1–2 story houses with pitched roofs, small front yard
   with low fence, optional garden patch. Roofs: red / green / blue / brown.
   Walls: cream / soft yellow / warm gray.
2. **Shop** — 1 story, flat or shallow-pitched roof, awning over front window
   (red/white stripes or single pastel), large square front window, optional
   outdoor table with 1–2 chairs, signage rectangle.
3. **Workspace** — 1–3 story, flat roof, glass-front facade (slightly
   translucent with desk silhouettes inside), small parking area.

## Construction stages (per building)

1. **Plot** — bare dirt square with corner stakes
2. **Foundation** — concrete slab, low walls starting to rise
3. **Frame** — full wall geometry, no roof, no windows
4. **Roofed** — roof installed, no windows lit
5. **Inhabited** — windows lit at night, residents / cars start using it

Each stage takes ~5–10 sim-seconds. Apply procedural variation (roof color,
wall color, height, garden seed) when the building transitions from Frame
to Roofed — so the town doesn't feel repetitive.

## Multi-building blocks

When the player clicks-and-drags a 1×N or N×1 or N×M rectangle of zone
cells (max 1×3, 2×2, or 1×2 — see below), all cells become **one shared
building block**: roads form around the *exterior* perimeter only, and
the interior cells share walls with no road between them.

Allowed shapes for connected blocks:
- 1×1, 1×2, 1×3 (straight line)
- 2×2 (square)
- 2×3, 3×2, 3×3 (larger rectangles — pick a sensible upper bound)

Within a block, each cell renders as a separate building (residential
house, shop, workspace) but they share foundation and a unified roofline.
Roads only appear on the outer ring of cells.

## Day/Night cycle

- **Full cycle:** 5 minutes of real time = 24 sim hours (configurable).
- **Day phases:** dawn (5–7) → morning (7–11) → noon (11–14) →
  afternoon (14–17) → sunset (17–19) → dusk (19–20) →
  night (20–5). Sky color, sun angle, ambient color, and window-light
  intensity interpolate smoothly between phases.
- **At night:** windows on inhabited buildings emit warm yellow point
  lights. Streetlights placed at every road intersection turn on
  (small warm cone). Empty / under-construction buildings stay dark.
- **At dawn/sunset:** warm orange tint. Long shadows. Windows still
  glow faintly until full daylight.
- **Always readable:** contrast stays high enough to see the town.
  Never go pitch black.

## People & cars

- **People:** stylized low-poly humanoid, ~0.5 units tall, 4–6 color
  variants (red shirt, blue shirt, green shirt, etc.). Simple walk
  cycle (legs alternate). No faces.
- **Cars:** simple boxy low-poly cars, ~1 unit long, 4 color variants
  (red, blue, yellow, white). Wheels visible. Move along road grid
  with simple car-following.
- **Count:** start with 0, spawn residents as houses complete, spawn
  workers as workspaces complete, spawn customers as shops complete.
  Cap at ~50 residents + ~20 cars for performance.

## HUD

- **Left panel:** zone palette with 4 buttons — *Explore* (hand/eye icon,
  default mode), *Residential* (house icon), *Shop* (shop icon),
  *Workspace* (office icon). Active button highlighted.
- **Top bar:** current time of day (e.g. "08:14 • Morning"), a thin
  day-progress bar, a small sun/moon icon.
- **Hover tooltip:** when the mouse is over a building or resident,
  show a soft tooltip with: building name/type, current residents,
  and (for residents) name + current activity ("walking to work",
  "at home", "shopping at bakery").
- **No menus, no settings panel, no pause button** — keep it light and
  observational. Day/night is automatic.

## Reference images in this directory

1. `01-morning-town.png` — golden hour morning overview
2. `02-sunset-town.png` — dusk, windows starting to glow
3. `03-night-town.png` — full night, warm lights
4. `04-residential-closeup.png` — house detail
5. `05-shop-closeup.png` — shop detail
6. `06-workspace-closeup.png` — workspace detail
7. `07-connected-block.png` — multi-building block top-down
8. `08-ui-mockup.png` — HUD layout
