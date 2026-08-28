import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyPilotBundle } from './pilot-bundle-lib.mjs'

const osRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(osRoot, 'dist')

export async function deployPilotBundle(root, options = [], spawn = spawnSync) {
  await verifyPilotBundle(root)
  const args = ['netlify', 'deploy', '--no-build', '--dir', root, ...options]
  const result = spawn('npx', args, { cwd: osRoot, stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  return result.status ?? 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await deployPilotBundle(dist, process.argv.slice(2))
}
