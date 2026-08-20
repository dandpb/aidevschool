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
]

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: process.env })

for (const { name, cwd, prebuild } of MISSIONS) {
  const source = resolve(enginesRoot, cwd)
  if (!existsSync(source)) throw new Error(`mission runtime not found: ${source}`)

  const outDir = resolve(source, 'dist-hosted')
  console.log(`\n▸ bundling ${name} from ${cwd}`)

  // Ensure mission dependencies are installed so `vite` exists
  run('npm', ['install', '--no-package-lock', '--no-audit', '--no-fund'], source)

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
