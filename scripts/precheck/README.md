# Promotion precheck — canonical baseline (AID-1556)

Versioned replacement for the copy-per-wave precheck scripts
(`_work-products/<onda>/precheck-<sha>.mjs`), which drifted silently between
waves (audit AID-1526 §3.1, finding P1: ancestral AID-821 → AID-935 renamed
check ids and grew 22 → 72 checks with no baseline or self-test).

## Layout

```
scripts/precheck/
├── precheck.mjs              runner CLI (network run / dry-run / self-test)
├── self-test.mjs             synthetic-violation harness (offline)
├── lib/checks.mjs            declarative check library + shared executor
├── lib/fixtures.mjs          synthetic OS/literacy/live-alias surfaces
└── waves/<WAVE>-<pin7>.json  per-wave anchor configs (AID-935-65d64bca.json = anchor)
```

## Usage

```bash
# full run against the draft surfaces (promotion step 4 of the runbook)
OS_BASE_URL=https://<os-draft> LIT_BASE_URL=https://<lit-draft> \
  node scripts/precheck/precheck.mjs --wave scripts/precheck/waves/AID-935-65d64bca.json

# post-re-pin re-run against the prod alias (only target:'both' checks)
OS_BASE_URL=https://<os-alias> LIT_BASE_URL=https://<lit-alias> \
  node scripts/precheck/precheck.mjs --wave waves/<config>.json --against alias

# offline: validate a wave config + registry (CI-safe, no network)
node scripts/precheck/precheck.mjs --wave waves/<config>.json --dry-run

# offline: synthetic violations must fail (CI guard, sdlc_guard_check pattern)
node scripts/precheck/precheck.mjs --self-test
```

`PRECHECK_LIT_DIST_LIST` / `PRECHECK_LIT_LOCAL_DIST` override the wave
config's `literacy.distListFile` / `literacy.localDistDir` (the byte-
equivalence check needs the local build tree of the wave being promoted).

Exit codes: `0` green · `1` failed checks / self-test regression / registry
drift · `2` usage or config error.

## Check model

Every check is declarative — `{ id, family, target, run(ctx) }`:

- **id** — stable identifier, verbatim from the anchor wave. Renames are
  breaking changes: the wave config's `anchorCheckIds` must be updated
  consciously or the registry audit fails.
- **family** — `os-manifest`, `os-surface`, `os-bundle`, `os-privacidade`,
  `os-collector`, `os-bridge`, `os-catalog`, `lit-dist`, `lit-assets`,
  `lit-privacidade`, `lit-collector`, `lit-bundle`, `lit-verify`.
- **target** — `draft` (pre-promotion only; e.g. ingestion smokes that write
  synthetic events, draft↔live parity, byte-equivalence vs the local build),
  `alias` (post-re-pin only), or `both`. `--against draft|alias` filters.
- **anchors live in the wave config, not in code**: pin, manifest/bundle
  sha256s, app list, env pins, catalog counts, `contentVersion`, telemetry
  copy markers, verify contract, live alias URL.

The anchor wave **AID-935-65d64bca.json** pins all **72 check ids** of the
`_work-products/AID-935/precheck-65d64bca.mjs` baseline; predicates were
lifted 1:1 (no check weakened). `--dry-run` and `--self-test` both verify the
generated registry equals `anchorCheckIds` exactly (anti-drift tripwire).

## Self-test contract

`--self-test` (offline, loopback only) proves the gate end to end:

1. **registry audit** — library ids ≡ wave `anchorCheckIds`, in order;
2. **control** — a synthetic good surface built from the wave anchors passes
   72/72 through the real executor;
3. **25 mutation scenarios** — one synthetic violation each (tampered
   manifest, wrong pin, app 404, dropped env pin, SPA shell on privacidade,
   open cross-origin collector, open export, refused/accepted envelopes,
   bridge 500, catalog drift, non-uniform contentVersion, dist byte diff,
   broken SPA fallback, stale privacy date, HTML on the collector route,
   unbaked endpoints, flipped/fail-open/diverging verifier) — each must fail
   **exactly** its expected check set. A mutation that stops failing, or that
   fails something unexpected, turns CI red.

## Adding a wave (the new promotion recipe)

1. Copy the closest wave config to `waves/<AID>-<pin7>.json`.
2. Update anchors only: `pin`, `manifestSha256`, `osBundleSha256`, catalog
   counts, `contentVersion`, copy markers, dist paths, live alias. Append any
   NEW check ids to `anchorCheckIds` (never remove — removal needs QA Lead
   countersign + founder order per the audit's calibration recommendation).
3. `--dry-run` locally, then PR. CI runs the self-test + dry-run.
4. Run the full precheck from the PR'd config during promotion (runbook §4)
   and commit the receipt under `_work-products/<onda>/` as before.

## Calibration policy

Coverage changes (adding/removing families, editing predicates, changing
expected counts) are calibrated with the QA Lead before merge; nothing is
removed or relaxed to "make it pass" (charter: Platform & Release Engineer).
