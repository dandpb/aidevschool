import { spawnSync } from 'node:child_process'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPilotBundleStage, createPilotManifest, promotePilotBundle, verifyPilotBundle } from './pilot-bundle-lib.mjs'

const osRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const enginesRoot = resolve(osRoot, '..')
const repoRoot = resolve(enginesRoot, '..')
const output = join(osRoot, 'dist')
// Keep staging beside dist so the final atomic rename stays on one filesystem.
const stage = await createPilotBundleStage(output)
const backup = `${output}.previous-${process.pid}`
// The same-origin verification bridge is a Netlify function. The canonical
// source lives with the learner trust boundary; the deployable projection is
// staged inside the site root so the Netlify CLI can bundle it (AID-305).
const canonicalFunctions = join(repoRoot, 'learner', 'gate', 'netlify-functions')
const stagedFunctions = join(osRoot, 'netlify', 'functions')
const verifierFunction = 'dojo-verification-bridge.mjs'
// Same-origin analytics collector (AID-470 F1): built, staged, and tested —
// but the browser transport stays off until VITE_ANALYTICS_ENDPOINT is
// explicitly configured at build time (board decision, ADR-0010).
const collectorFunction = 'dojo-analytics-collector.mjs'
// Generated verifier corpus for the hosted literacy bridge (AID-449); a
// projection of curriculum/ai-literacy/ that must ship with the function.
// The underscore directory is the Netlify shared-code convention: bundled
// with the importing function, never deployed as a function itself.
const literacyCorpusModule = '_shared/literacy-corpus.mjs'
// Serve the learner journey from the bundle's own /apps/literacydojo/ build so
// the motor contentVersion always ships with the mission catalog of the same
// revision (external-pin drift broke production: AID-278 D1 / AID-282). The
// build is hashed into pilot-bundle-manifest.json (surfaces.literacydojo),
// keeping it independently verifiable, same pattern as the Dev apps below.
const publicLiteracyDojoUrl = '/apps/literacydojo/'
// A Dev-cohort candidate must not resolve PixelDojo through a mutable alias or
// a development fallback. This deploy is raw-evidence only; QA still owns GO.
const publicPixelDojoUrl = '/apps/pixelquest/'

const builds = [
  { name: 'OS', cwd: osRoot, command: 'npx', args: ['tsc', '-b'], source: null, target: '.' },
  {
    name: 'OS',
    cwd: osRoot,
    command: 'npx',
    args: ['vite', 'build', '--mode', 'pilot', '--outDir', stage, '--emptyOutDir'],
    env: {
      VITE_LITERACYDOJO_URL: publicLiteracyDojoUrl,
      VITE_PIXELDOJO_URL: publicPixelDojoUrl,
      VITE_DOJOTODAY_URL: '/apps/dojotoday/',
      // These same-origin paths are part of the hashed OS artifact, so an
      // immutable OS permalink also freezes every launchable Dev mission.
      VITE_WAREHOUSE_URL: '/apps/warehouse/',
      VITE_WORMHOLE_URL: '/apps/wormhole/',
      VITE_RELAY_STATION_URL: '/apps/relay-station/',
      VITE_PIPELINE_PLANT_URL: '/apps/pipeline-plant/',
      VITE_CHECKPOINT_CITY_URL: '/apps/checkpoint-city/',
      VITE_TIMELINE_TOWER_URL: '/apps/timeline-tower/',
      VITE_DOCKING_BAY_URL: '/apps/docking-bay/',
    },
    source: null,
    target: '.',
  },
  { name: 'LiteracyDojo', cwd: join(enginesRoot, 'literacyDojo'), command: 'npm', args: ['run', 'build', '--', '--base=/apps/literacydojo/'], source: 'dist', target: 'apps/literacydojo' },
  { name: 'WAREHOUSE', cwd: join(enginesRoot, 'voxelDojo', 'game-02-warehouse'), command: 'pnpm', args: ['run', 'build', '--base=/apps/warehouse/'], source: 'dist', target: 'apps/warehouse' },
  { name: 'WORMHOLE', cwd: join(enginesRoot, 'voxelDojo', 'game-03-wormhole'), command: 'pnpm', args: ['run', 'build', '--base=/apps/wormhole/'], source: 'dist', target: 'apps/wormhole' },
  { name: 'RELAY STATION', cwd: join(enginesRoot, 'voxelDojo', 'game-05-relay-station'), command: 'pnpm', args: ['run', 'build', '--base=/apps/relay-station/'], source: 'dist', target: 'apps/relay-station' },
  { name: 'PIPELINE PLANT', cwd: join(enginesRoot, 'voxelDojo', 'game-06-pipeline-plant'), command: 'pnpm', args: ['run', 'build', '--base=/apps/pipeline-plant/'], source: 'dist', target: 'apps/pipeline-plant' },
  { name: 'CHECKPOINT CITY', cwd: join(enginesRoot, 'voxelDojo', 'game-07-checkpoint-city'), command: 'pnpm', args: ['run', 'build', '--base=/apps/checkpoint-city/'], source: 'dist', target: 'apps/checkpoint-city' },
  { name: 'TIMELINE TOWER', cwd: join(enginesRoot, 'voxelDojo', 'game-08-timeline-tower'), command: 'pnpm', args: ['run', 'build', '--base=/apps/timeline-tower/'], source: 'dist', target: 'apps/timeline-tower' },
  { name: 'DOCKING BAY', cwd: join(enginesRoot, 'voxelDojo', 'game-09-docking-bay'), command: 'pnpm', args: ['run', 'build', '--base=/apps/docking-bay/'], source: 'dist', target: 'apps/docking-bay' },
  { name: 'PixelQuest', cwd: join(enginesRoot, 'pixelDojo', 'pixel-quest'), command: 'pnpm', args: ['run', 'build', '--base=/apps/pixelquest/'], source: 'dist', target: 'apps/pixelquest' },
  { name: 'dojoToday', cwd: join(enginesRoot, 'dojoToday'), command: 'npm', args: ['run', 'build', '--', '--base=/apps/dojotoday/'], source: 'dist', target: 'apps/dojotoday' },
  { name: 'HASH RING', cwd: join(enginesRoot, 'voxelDojo', 'game-10-hash-ring'), command: 'pnpm', args: ['run', 'build', '--base=/apps/hash-ring/'], source: 'dist', target: 'apps/hash-ring' },
  { name: 'AIR TRAFFIC', cwd: join(enginesRoot, 'voxelDojo', 'game-11-air-traffic'), command: 'pnpm', args: ['run', 'build', '--base=/apps/air-traffic/'], source: 'dist', target: 'apps/air-traffic' },
  { name: 'MISSION CONTROL', cwd: join(enginesRoot, 'voxelDojo', 'game-12-mission-control'), command: 'pnpm', args: ['run', 'build', '--base=/apps/mission-control/'], source: 'dist', target: 'apps/mission-control' },
  { name: 'BREAKER GRID', cwd: join(enginesRoot, 'voxelDojo', 'game-13-breaker-grid'), command: 'pnpm', args: ['run', 'build', '--base=/apps/breaker-grid/'], source: 'dist', target: 'apps/breaker-grid' },
  { name: 'RIVER DELTA', cwd: join(enginesRoot, 'voxelDojo', 'game-14-river-delta'), command: 'pnpm', args: ['run', 'build', '--base=/apps/river-delta/'], source: 'dist', target: 'apps/river-delta' },
  { name: 'OBSERVATORY', cwd: join(enginesRoot, 'voxelDojo', 'game-15-observatory'), command: 'pnpm', args: ['run', 'build', '--base=/apps/observatory/'], source: 'dist', target: 'apps/observatory' },
  { name: 'FREIGHT YARD', cwd: join(enginesRoot, 'voxelDojo', 'game-16-freight-yard'), command: 'pnpm', args: ['run', 'build', '--base=/apps/freight-yard/'], source: 'dist', target: 'apps/freight-yard' },
  { name: 'LIGHTHOUSE NETWORK', cwd: join(enginesRoot, 'voxelDojo', 'game-17-lighthouse-network'), command: 'pnpm', args: ['run', 'build', '--base=/apps/lighthouse-network/'], source: 'dist', target: 'apps/lighthouse-network' },
  { name: 'STACKS', cwd: join(enginesRoot, 'voxelDojo', 'game-18-stacks'), command: 'pnpm', args: ['run', 'build', '--base=/apps/stacks/'], source: 'dist', target: 'apps/stacks' },
]

function run(build) {
  console.log(`[pilot] building ${build.name}`)
  const result = spawnSync(build.command, build.args, {
    cwd: build.cwd,
    stdio: 'inherit',
    env: { ...process.env, ...build.env },
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${build.name} build failed with exit ${result.status ?? 'unknown'}`)
}

try {
  for (const build of builds) {
    run(build)
    if (build.source !== null) await cp(join(build.cwd, build.source), join(stage, build.target), { recursive: true })
  }
  await rm(stagedFunctions, { recursive: true, force: true })
  await mkdir(stagedFunctions, { recursive: true })
  await cp(join(canonicalFunctions, verifierFunction), join(stagedFunctions, verifierFunction))
  await cp(join(canonicalFunctions, collectorFunction), join(stagedFunctions, collectorFunction))
  await mkdir(join(stagedFunctions, '_shared'), { recursive: true })
  await cp(join(canonicalFunctions, literacyCorpusModule), join(stagedFunctions, literacyCorpusModule))
  const revision = process.env.COMMIT_REF || process.env.HEAD || 'local-uncommitted'
  const manifest = await createPilotManifest(stage, revision)
  await writeFile(join(stage, 'pilot-bundle-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await verifyPilotBundle(stage)

  await promotePilotBundle(stage, output, backup)
  console.log(`[pilot] complete bundle ready at ${output}`)
} catch (error) {
  await rm(stage, { recursive: true, force: true })
  console.error(`[pilot] aborted before publishable dist: ${error.message}`)
  process.exitCode = 1
}
