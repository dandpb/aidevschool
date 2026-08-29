import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const engineRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(engineRoot, '../..')
if (process.env.READINESS_TEST_RUN !== 'passed') {
  throw new Error('Run npm run test:readiness; readiness reports require passing scenario-specific Playwright runs.')
}
const result = spawnSync(
  'python3',
  [
    'docs/product-readiness/tools/cli.py',
    'producer-report',
    '--engine',
    'engines/codexdojo-os-prototype',
    '--output',
    'engines/codexdojo-os-prototype/test-results/readiness',
    '--scenarios',
    'os-onboarding-track-choice',
    'os-literacy-hosted-mission',
    'os-voxel-hosted-missions',
    'os-verification-recovery',
    'os-literacy-returning-device',
    'os-renderer-accessibility-recovery',
    'os-returning-device',
    'os-returning-recovery',
    'os-voxel-returning-device',
  ],
  { cwd: repoRoot, encoding: 'utf8', stdio: 'inherit' },
)

if (result.error !== undefined) throw result.error
process.exitCode = result.status ?? 1
