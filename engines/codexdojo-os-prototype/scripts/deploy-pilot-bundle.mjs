import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyPilotBundle } from './pilot-bundle-lib.mjs'

const osRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(osRoot, 'dist')
const verifierFunction = 'dojo-verification-bridge.mjs'
const literacyCorpusModule = '_shared/literacy-corpus.mjs'
const canonicalFunctions = resolve(osRoot, '..', '..', 'learner', 'gate', 'netlify-functions')
const stagedFunctions = resolve(osRoot, 'netlify', 'functions')

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

/** The deployed verifier and its literacy corpus must be byte-identical to
 * the canonical learner/gate sources (the corpus is regenerated from
 * curriculum/ai-literacy/ by its canonical tools; AID-449). */
export async function verifyStagedVerifier(
  canonical = canonicalFunctions,
  staged = stagedFunctions,
) {
  const hashes = {}
  for (const module of [verifierFunction, literacyCorpusModule]) {
    const [canonicalHash, stagedHash] = await Promise.all([
      sha256(join(canonical, module)),
      sha256(join(staged, module)),
    ])
    if (canonicalHash !== stagedHash) {
      throw new Error(
        `deploy aborted: staged ${module} drifted from learner/gate/netlify-functions — rerun npm run build:pilot`,
      )
    }
    hashes[module] = stagedHash
  }
  return hashes[verifierFunction]
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
