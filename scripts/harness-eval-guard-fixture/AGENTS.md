# Fixture harness

The agent must keep the registry at `src/missing/thing.ts` in sync; it must exist.
See `docs/does-not-exist.md` for the spec and `docs/real.md` for context.
Skills live under `.agents/skills` (directory contract, must exist).
Run `pnpm run definitely-not-a-script` to verify; build via `pnpm run build`.
Inside web use `pnpm run lint`. Example shorthand `lib/...` and `.agents/…` are placeholders.
Dev server: `pnpm --filter pixel-quest dev`.
The encounter registry at `src/game/encounters/registry.ts` must stay in sync; it must exist.
Load the `dev` skill and read `references/view.md` before editing encounters.
