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
// Serve the learner journey from the bundle's own /apps/literacydojo/ build so
// the motor contentVersion always ships with the mission catalog of the same
// revision (external-pin drift broke production: AID-278 D1 / AID-282). The
// build is hashed into pilot-bundle-manifest.json (surfaces.literacydojo),
// keeping it independently verifiable, same pattern as the Dev apps below.
const publicLiteracyDojoUrl = '/apps/literacydojo/'
// A Dev-cohort candidate must not resolve PixelDojo through a mutable alias or
// a development fallback. This deploy is raw-evidence only; QA still owns GO.
const publicPixelDojoUrl = 'https://6a920159a8d5e2dfdd7fbeca--singular-crostata-273e7e.netlify.app/'

const builds = [
  { name: 'OS', cwd: osRoot, command: 'npx', args: ['tsc', '-b'], source: null, target: '.' },
  {
    name: 'OS',
    cwd: osRoot,
    command: 'npx',
    args: ['vite', 'build', '--outDir', stage, '--emptyOutDir'],
    env: {
      VITE_LITERACYDOJO_URL: publicLiteracyDojoUrl,
      VITE_PIXELDOJO_URL: publicPixelDojoUrl,
      // These same-origin paths are part of the hashed OS artifact, so an
      // immutable OS permalink also freezes every launchable Dev mission.
      VITE_WAREHOUSE_URL: '/apps/warehouse/',
      VITE_WORMHOLE_URL: '/apps/wormhole/',
      VITE_RELAY_STATION_URL: '/apps/relay-station/',
    },
    source: null,
    target: '.',
  },
  { name: 'LiteracyDojo', cwd: join(enginesRoot, 'literacyDojo'), command: 'npm', args: ['run', 'build', '--', '--base=/apps/literacydojo/'], source: 'dist', target: 'apps/literacydojo' },
  { name: 'WAREHOUSE', cwd: join(enginesRoot, 'voxelDojo', 'game-02-warehouse'), command: 'pnpm', args: ['run', 'build', '--base=/apps/warehouse/'], source: 'dist', target: 'apps/warehouse' },
  { name: 'WORMHOLE', cwd: join(enginesRoot, 'voxelDojo', 'game-03-wormhole'), command: 'pnpm', args: ['run', 'build', '--base=/apps/wormhole/'], source: 'dist', target: 'apps/wormhole' },
  { name: 'RELAY STATION', cwd: join(enginesRoot, 'voxelDojo', 'game-05-relay-station'), command: 'pnpm', args: ['run', 'build', '--base=/apps/relay-station/'], source: 'dist', target: 'apps/relay-station' },
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
