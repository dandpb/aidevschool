# Decision — 09_plugin_system

- **Slug**: `09_plugin_system`
- **Shape**: **B** — fresh standalone 3D app at `engines/pixelDojo/games/09_plugin_system/`
- **Concept (catalog)**: Dynamic loading, interfaces/traits, plugin lifecycle, sandboxing, WASM/FFI/JS sandboxing, API versioning
- **Key question (catalog)**: How does each language's FFI/WASM/dynamic-loading story compare for safe plugin isolation?
- **Done-rule (catalog, one line)**: A 3D world demonstrates the plugin lifecycle (load→init→start→stop→unload) with capability enforcement, API-version negotiation, and sandbox isolation so plugin crashes never damage the host — measurable on a deterministic seed.

## Rationale (≤ 6 lines)

1. Plugin-system semantics are about **a 5-state lifecycle machine + a declared-capability boundary + a sandbox shell that contains crashes** — geometry that pixel-quest's encounter shell cannot express (its encounter kinds are all "incoming sprite → admit/reject", with no notion of a stateful pod progressing through ordered gates inside a containing bubble).
2. The defining visuals — `N` cargo-pods on an inbound conveyor advancing through 5 radial docking gates around a HOST reactor, each pod wrapped in a translucent SANDBOX BUBBLE that flashes red when it contains a panic — need a real 3D scene graph; a 2D arcade lane cannot show containment multiplicity or the host-vs-plugin spatial boundary.
3. The 3D depth axis earns its keep: the conveyor runs on Z, gates array radially on X/Y, sandbox bubbles use volumetric opacity, and hook particles ride glowing tethers in priority order — none of this reads in pixel-quest's flat overworld.
4. Distinct from `01_rate_limiter` (Shape A in pixel-quest), `02_key_value_store`, `05_websocket_chat`, `06_file_upload_pipeline`, `08_event_driven_order_system`, and `16_mini_message_queue` (all Shape B) — no encounter kind reuses `threejs-plugin-lifecycle`.
5. Multi-agent fit: parallel workers for tsconfig/biome scaffold, three.js host-reactor + docking-bay scene, evidence schema + content pack validator, and Playwright smoke are cleanly separable.
6. Catalog's primary learning objective ("stable extension interfaces with lifecycle-managed plugins") is **only** legible when the player physically advances pods through ordered gates, denies undeclared capabilities, and sees panics contained vs vented — a fresh world is mandatory, not optional.
