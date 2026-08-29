import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyPilotBundle } from './pilot-bundle-lib.mjs'

const osRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(osRoot, 'dist')
const verifierFunction = 'dojo-verification-bridge.mjs'
const canonicalFunction = resolve(osRoot, '..', '..', 'learner', 'gate', 'netlify-functions', verifierFunction)
const stagedFunction = resolve(osRoot, 'netlify', 'functions', verifierFunction)

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

/** The deployed verifier must be byte-identical to the canonical learner/gate source. */
export async function verifyStagedVerifier(
  canonical = canonicalFunction,
  staged = stagedFunction,
) {
  const [canonicalHash, stagedHash] = await Promise.all([sha256(canonical), sha256(staged)])
  if (canonicalHash !== stagedHash) {
    throw new Error(
      `deploy aborted: staged ${verifierFunction} drifted from learner/gate/netlify-functions — rerun npm run build:pilot`,
    )
  }
  return stagedHash
}

export async function deployPilotBundle(root, options = [], spawn = spawnSync) {
  await verifyPilotBundle(root)
  await verifyStagedVerifier()
  const args = ['netlify', 'deploy', '--no-build', '--dir', root, '--functions', 'netlify/functions', ...options]
  const result = spawn('npx', args, { cwd: osRoot, stdio: 'inherit', env: process.env })
  if (result.error) throw result.error
  return result.status ?? 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await deployPilotBundle(dist, process.argv.slice(2))
}
