# Engine — miniTown

**What it is:** a cozy, observational Three.js town simulator (Townscaper × A Short Hike
aesthetic): automatic day/night cycle, zoning palette, low-poly residents and vehicles with
daily routines, minimal HUD. No menus, no pause, no code prerequisite.

**Role in the ecosystem:** the **level-0 entry surface** for the non-technical audience of the
dual-audience vision (AD-004/AD-005 in `.specs/STATE.md`, `docs/VISION.md`). Its paired
curriculum identity is `curriculum/00_ai_in_practice/` (catalog project 00, status `planned`).
It is complementary to [LiteracyDojo](12_engine_literacyDojo.md), which owns
the guided 3–5 minute AI lessons.

**Boundaries:** explore-only. miniTown exposes runtime state via `window.__miniTown` for
inspection, but it never writes canonical learner state and never marks mastery
(producer ≠ verifier, like every engine).

## Run

```bash
# from the repository root, installs only this engine's dependencies
./setup.sh onboard
cd engines/miniTown
pnpm run dev        # http://127.0.0.1:5173
```

This remains local setup and requires Node/Corepack; it is not a public
zero-install route.

Validate: `pnpm run lint && pnpm run test && pnpm run typecheck && pnpm run build`
(Playwright smoke: `pnpm run smoke`).

## References

- Local guide: [`engines/miniTown/README.md`](../../engines/miniTown/README.md)
- Build plan and completion decision: `.mavis/plans/miniTown.yaml`, `.mavis/plans/decision.json`
- Visual direction: `engines/miniTown/docs/concepts/CONCEPTS.md`
