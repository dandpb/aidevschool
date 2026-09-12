# AID-111 — LiteracyDojo build unblock verification

Date: 2026-08-24 (UTC)

## Outcome

The LiteracyDojo build blocker reported by AID-37 is resolved in the current
working tree. The engine's content-generation script is portable and its
TypeScript toolchain is represented in both `package.json` and
`package-lock.json`.

No generated learner projection was hand-edited as part of this verification.

## Relevant working-tree changes

- `engines/literacyDojo/package.json`
  - uses `${PYTHON:-python3}` instead of `/usr/local/bin/python3` for
    `gen:content`;
  - declares `@types/node` as a development dependency.
- `engines/literacyDojo/package-lock.json`
  - locks `@types/node` and `undici-types` consistently with the manifest.

## Reproducible checks

Run from `engines/literacyDojo`:

```bash
npm ci --include=dev
npm run build
npm run lint
npm test
```

Observed results:

- clean install: PASS (195 packages installed);
- canonical content validation/compilation: PASS (17 ready lessons, 0 planned);
- `tsc -b && vite build`: PASS (68 modules transformed);
- Biome: PASS (61 files checked, no fixes);
- Vitest: PASS (10 files, 81 tests).

## Environment caveat

The execution environment has global npm configuration `omit=dev`. Therefore,
plain `npm ci` installs only runtime dependencies and a subsequent build fails
with `tsc: not found`. This is not a lockfile defect: `npm ci --include=dev`
installs the declared build toolchain and all checks pass. CI jobs that build
the engine must explicitly include development dependencies or avoid setting
`omit=dev` during the build stage.

## Independent review request

The AID-37 owner/reviewer should confirm that its build job installs with
development dependencies enabled and rerun the AID-37 build gate. This report
does not claim release or mastery; it establishes only the bounded engine build
unblock and its executable evidence.

## 2026-08-24 (UTC) revalidation

Executed in clean node_modules state under `engines/literacyDojo`:

```bash
npm ci --include=dev
npm run build
npm run lint
npm run test
```

Observed:

- `npm ci --include=dev`: PASS (195 packages installed)
- `npm run build`: PASS (`tsc -b` + `vite build`, 68 modules transformed)
- `npm run lint`: PASS (`biome check src tests playwright`, 61 files)
- `npm run test`: PASS (10 test files, 81 tests)
- Canonical content compile during build/test prehooks: PASS (17 ready lessons)

Notes:

- The blocker is resolved when dev dependencies are available.
- In environments with `npm config set omit=dev=true`, build requires explicit
  `--include=dev` (or equivalent) to install TypeScript toolchain dependencies.
