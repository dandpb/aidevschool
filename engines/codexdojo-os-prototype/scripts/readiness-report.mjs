import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(engineRoot, '../..')
const result = spawnSync(
  'python3',
  [
    'docs/product-readiness/tools/cli.py',
    'producer-report',
    '--engine',
    'engines/codexdojo-os-prototype',
    '--output',
    'engines/codexdojo-os-prototype/test-results/readiness',
  ],
  { cwd: repoRoot, encoding: 'utf8', stdio: 'inherit' },
)

if (result.error !== undefined) throw result.error
process.exitCode = result.status ?? 1
