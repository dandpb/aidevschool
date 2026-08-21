import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.READINESS_TEST_RUN !== 'passed') {
  throw new Error('Run npm run test:readiness; readiness reports require a passing Playwright run.')
}

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(engineRoot, '../..')
const result = spawnSync(
  'python3',
  [
    'docs/product-readiness/tools/cli.py',
    'producer-report',
    '--engine',
    'engines/dojoToday',
    '--output',
    'engines/dojoToday/test-results/readiness',
    '--scenarios',
    'dojotoday-active-unit-guidance',
  ],
  { cwd: repoRoot, encoding: 'utf8', stdio: 'inherit' },
)

if (result.error !== undefined) throw result.error
process.exitCode = result.status ?? 1
