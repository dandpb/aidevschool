# codexDojo OS — engine 0.1

An educational Linux desktop where each application can become a computing
fundamentals lab.

![Prévia do codexDojo OS](docs/prototype-preview.png)

## Run the OS

Use Node.js 20.19+ or 22.12+. The current lock file uses Vite 8.1.4.

```bash
npm install
npm run dev
```

Open the address printed by Vite. Build the production bundle with:

```bash
npm run build
```

Run the local checks with:

```bash
npm run lint
npm run test
npm run build
npm run test:smoke
```

## Use the Engine Hub

Open **Activities**, search for **Engine Hub**, and select an engine. The Hub
keeps each engine in its own runtime and exposes one bounded interaction:

| Engine | In-OS interaction |
| --- | --- |
| `codexDojo` | Open the real dashboard and copy an agent prompt. |
| `minimaxDojo` | Run the deterministic tutor-core contract. |
| `miniMaxEvolutionEngine` | Validate the real `PhaseRunner` protocol. |
| `openclaw` | Preview the next checklist without writing pipeline state. |
| `pixelDojo` | Play PixelQuest and return raw attempt evidence to the Hub. |
| `voxelDojo` | Operate HASH RING and return raw attempt evidence to the Hub. |

The three browser engines use these optional production URLs:

```bash
VITE_CODEXDOJO_URL=https://dashboard.example.test/
VITE_PIXELDOJO_URL=https://pixel.example.test/
VITE_VOXELDOJO_URL=https://voxel.example.test/
```

Development falls back to ports `5175`, `5176`, and `5177`. The Vite-only
loopback bridge exposes three fixed, read-only Python actions. A production
static build doesn't include that bridge and shows local actions as
unavailable.

Teaching games continue to append evidence to their engine-owned browser
channel and console log. When embedded, they also send the same raw record to
the Hub. The Hub validates the frame source and origin, labels the result as
unverified, and never grants mastery.

## Current boundaries

- The top bar and Dojo read `src/data/learner.ts`, a read-only projection
  generated from `learner/learning_state.yaml`.
- Missions, the catalog, Terminal state, and mentor responses remain local UI
  state.
- Engine actions and raw game evidence never mark units as `mastered`.
- The OS has no backend, persistent virtual filesystem, or external mentor
  provider.

## Implemented surfaces

- Desktop shell, top bar, dock, searchable launcher, and movable windows.
- Catalog with more than 50 apps and explicit maturity states.
- Contextual Learn Mode and a deterministic local mentor prototype.
- Tracks, local Terminal commands, Files, and an architecture map.
- Engine Hub with six external engine adapters and raw-evidence receipts.
- Desktop, tablet, and mobile layouts.

See `docs/PLANO_INICIAL.md` for the product plan and
`../../docs/handbook/03b_engine_codexdojo-os-prototype.md` for the ecosystem
boundary.
