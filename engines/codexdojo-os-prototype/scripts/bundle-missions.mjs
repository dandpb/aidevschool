// Builds every mission runtime into the OS dist so a single static deploy serves
// the whole pilot. Without this, a built OS falls back to the dev-server
// entrypoints in config/mission-bindings.yaml and every mission iframe 404s.
//
// Pairs with the inline VITE_*_URL values in the package.json `build:pilot`
// script, which point the OS at /apps/<name>/ on its own origin.
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// Serial by design: disjoint targets would allow parallel builds, but Netlify/CI
// build containers are resource-constrained and stdio:inherit keeps logs ordered.

const osRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const enginesRoot = resolve(osRoot, '..')

// name → subpath under dist/apps/ (and the inline VITE_*_URL in build:pilot);
// cwd → the runtime's package.
const MISSIONS = [
  { name: 'literacydojo', cwd: 'literacyDojo', prebuild: ['npm', ['run', 'gen:content']] },
  { name: 'warehouse', cwd: 'voxelDojo/game-02-warehouse' },
  { name: 'wormhole', cwd: 'voxelDojo/game-03-wormhole' },
  { name: 'relay-station', cwd: 'voxelDojo/game-05-relay-station' },
  { name: 'pipeline-plant', cwd: 'voxelDojo/game-06-pipeline-plant' },
  { name: 'checkpoint-city', cwd: 'voxelDojo/game-07-checkpoint-city' },
  { name: 'timeline-tower', cwd: 'voxelDojo/game-08-timeline-tower' },
  { name: 'docking-bay', cwd: 'voxelDojo/game-09-docking-bay' },
  { name: 'pixelquest', cwd: 'pixelDojo/pixel-quest' },
  { name: 'dojotoday', cwd: 'dojoToday' },
  { name: 'hash-ring', cwd: 'voxelDojo/game-10-hash-ring' },
  { name: 'air-traffic', cwd: 'voxelDojo/game-11-air-traffic' },
  { name: 'mission-control', cwd: 'voxelDojo/game-12-mission-control' },
  { name: 'breaker-grid', cwd: 'voxelDojo/game-13-breaker-grid' },
  { name: 'river-delta', cwd: 'voxelDojo/game-14-river-delta' },
  { name: 'observatory', cwd: 'voxelDojo/game-15-observatory' },
  { name: 'freight-yard', cwd: 'voxelDojo/game-16-freight-yard' },
  { name: 'lighthouse-network', cwd: 'voxelDojo/game-17-lighthouse-network' },
  { name: 'stacks', cwd: 'voxelDojo/game-18-stacks' },
]

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: process.env })

run('npm', ['ci', '--no-audit', '--no-fund'], resolve(enginesRoot, 'literacyDojo'))
run('npm', ['ci', '--no-audit', '--no-fund'], resolve(enginesRoot, 'dojoToday'))
run('corepack', ['pnpm', 'install', '--frozen-lockfile'], resolve(enginesRoot, 'voxelDojo'))
run('corepack', ['pnpm', 'install', '--frozen-lockfile'], resolve(enginesRoot, 'pixelDojo'))

for (const { name, cwd, prebuild } of MISSIONS) {
  const source = resolve(enginesRoot, cwd)
  if (!existsSync(source)) throw new Error(`mission runtime not found: ${source}`)

  const outDir = resolve(source, 'dist-hosted')
  console.log(`\n▸ bundling ${name} from ${cwd}`)
  if (prebuild) run(prebuild[0], prebuild[1], source)

  // --base makes the runtime's own asset URLs resolve under the OS subpath.
  run('npx', ['vite', 'build', `--base=/apps/${name}/`, '--outDir', outDir, '--emptyOutDir'], source)

  const target = resolve(osRoot, 'dist', 'apps', name)
  // Atomic move (same filesystem): no partial-copy window and no double I/O.
  // renameSync needs the parent to exist; mkdir it once per run.
  mkdirSync(dirname(target), { recursive: true })
  rmSync(target, { recursive: true, force: true })
  renameSync(outDir, target)
  console.log(`  → dist/apps/${name}`)
}

console.log(`\n${MISSIONS.length} mission runtimes bundled into dist/apps/.`)
