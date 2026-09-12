#!/usr/bin/env node
// Canonical promotion pre-check runner (AID-1556, P1 of audit AID-1526 §3.1).
//
// Replaces the copy-per-wave precheck scripts (_work-products/<onda>/
// precheck-<sha>.mjs) with one versioned baseline + per-wave anchor configs.
//
// Usage:
//   node scripts/precheck/precheck.mjs --wave <config.json>            full run
//       Requires OS_BASE_URL and LIT_BASE_URL (draft surfaces) unless
//       --self-test builds synthetic ones. Optional PRECHECK_LIT_DIST_LIST /
//       PRECHECK_LIT_LOCAL_DIST override the wave config dist paths.
//   node scripts/precheck/precheck.mjs --wave <config.json> --dry-run   offline
//       Validates the wave config against the check registry and prints the
//       check plan (id, family, target) — no network, CI-safe.
//   node scripts/precheck/precheck.mjs --self-test                     offline
//       Synthetic surfaces on 127.0.0.1: synthetic violations MUST fail.
//   node scripts/precheck/precheck.mjs --wave <config.json> --list-checks
//
//   --against draft|alias   filter checks by their target declaration
//                           (default: draft — the pre-promotion stage).
//
// Exit: 0 all checks pass / self-test green; 1 failed checks or self-test
// regression; 2 usage/config error.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { buildChecks, runAll, wrapFetch } from './lib/checks.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))

const usage = () => {
  console.error(`usage: precheck.mjs --wave <waves/<config>.json> [--against draft|alias] [--dry-run] [--list-checks]
       precheck.mjs --self-test`)
  process.exit(2)
}

const args = process.argv.slice(2)
let wavePath = ''
let against = 'draft'
let dryRun = false
let listOnly = false
let selfTest = false
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--wave') wavePath = args[++i] ?? usage()
  else if (a === '--against') against = args[++i] ?? usage()
  else if (a === '--dry-run') dryRun = true
  else if (a === '--list-checks') listOnly = true
  else if (a === '--self-test') selfTest = true
  else usage()
}
if (!['draft', 'alias'].includes(against)) usage()
if (selfTest) {
  const { runSelfTest } = await import('./self-test.mjs')
  const ok = await runSelfTest()
  process.exit(ok ? 0 : 1)
}
if (!wavePath) usage()

const loadConfig = (p) => {
  let cfg
  try {
    cfg = JSON.parse(readFileSync(p, 'utf8'))
  } catch (e) {
    console.error(`ERROR: cannot load wave config ${p}: ${e.message}`)
    process.exit(2)
  }
  const need = [
    ['wave', 'string'], ['os', 'object'], ['literacy', 'object'], ['anchorCheckIds', 'object'],
    ['os.pin', 'string'], ['os.manifestSha256', 'string'], ['os.osBundleSha256', 'string'],
    ['os.apps', 'object'], ['os.envPins', 'object'], ['os.analyticsEndpoint', 'string'],
    ['os.privacidade', 'object'], ['os.bridge', 'object'], ['os.catalog', 'object'], ['os.ingestion', 'object'],
    ['literacy.distListFile', 'string'], ['literacy.localDistDir', 'string'], ['literacy.coreAssets', 'object'],
    ['literacy.spaFallback', 'object'], ['literacy.privacidade', 'object'], ['literacy.termos', 'object'],
    ['literacy.collector', 'object'], ['literacy.ingestion', 'object'], ['literacy.baked', 'object'],
    ['literacy.verify', 'object']
  ]
  const get = (o, path) => path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), o)
  const missing = need.filter(([path, type]) => {
    const v = get(cfg, path)
    if (type === 'string') return typeof v !== 'string' || v.length === 0
    if (type === 'object') return v == null || typeof v !== 'object'
    return false
  }).map(([path]) => path)
  if (missing.length > 0) {
    console.error(`ERROR: wave config ${p} missing anchors: ${missing.join(', ')}`)
    process.exit(2)
  }
  return cfg
}

const cfg = loadConfig(resolve(process.cwd(), wavePath))
const checks = buildChecks(cfg)
  .map((c, idx) => ({ ...c, order: idx }))
  .filter((c) => c.target === 'both' || c.target === against)

// Registry audit: the wave config pins the exact check-id set the wave must
// run (anchor AID-935 = 72 ids). A library rename/addition/removal that is
// not consciously reflected in the wave config fails here — this is the
// anti-drift tripwire the audit asked for.
const registryAudit = () => {
  const all = buildChecks(cfg).map((c) => c.id)
  const expected = cfg.anchorCheckIds
  const missing = expected.filter((id) => !all.includes(id))
  const added = all.filter((id) => !expected.includes(id))
  const dupes = all.filter((id, i) => all.indexOf(id) !== i)
  if (missing.length || added.length || dupes.length) {
    console.error(`REGISTRY DRIFT for wave ${cfg.wave}: missing=[${missing.join(', ')}] added=[${added.join(', ')}] duplicated=[${dupes.join(', ')}]`)
    console.error('Update the wave config anchorCheckIds CONSCIOUSLY (additions need QA countersign; removals need QA + founder order).')
    return false
  }
  return true
}

if (listOnly || dryRun) {
  if (!registryAudit()) process.exit(1)
  console.log(`wave ${cfg.wave} — ${checks.length} checks selected (against=${against}) of ${cfg.anchorCheckIds.length} declared`)
  for (const c of checks) console.log(`${String(c.order).padStart(3)} ${c.id.padEnd(46)} ${c.family.padEnd(16)} target=${c.target}`)
  console.log(dryRun ? 'dry-run: config valid, registry matches anchorCheckIds, no network calls made' : '')
  process.exit(0)
}

if (!registryAudit()) process.exit(1)

const osBase = (process.env.OS_BASE_URL ?? '').replace(/\/$/, '')
const litBase = (process.env.LIT_BASE_URL ?? '').replace(/\/$/, '')
if (!osBase || !litBase) {
  console.error('ERROR: OS_BASE_URL and LIT_BASE_URL are required for a full run (draft surfaces); use --dry-run or --self-test for offline modes')
  process.exit(2)
}

const distListFile = process.env.PRECHECK_LIT_DIST_LIST ?? cfg.literacy.distListFile
const localDistDir = process.env.PRECHECK_LIT_LOCAL_DIST ?? cfg.literacy.localDistDir

const ctx = { osBase, litBase, distListFile, localDistDir, fetch: wrapFetch(), remember: {} }
const results = await runAll(checks, ctx, (s) => console.log(s))

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.error('FAILED:', failed.map((f) => f.id).join(', '))
  process.exit(1)
}
