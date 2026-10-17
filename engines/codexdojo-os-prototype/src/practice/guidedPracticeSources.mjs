// Node-side loader for the guided-practice invariant suite (AID-3527), same
// pattern as learner/gate/tests/fixtures/analytics/load_fixtures.mjs: file
// reads and the generator import stay on the untypechecked node side so the
// src project remains typecheck-free (allowJs: false).
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const engineRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const repoRoot = join(engineRoot, '..', '..')
export const missingRepoRoot = join(repoRoot, '.scratch', 'aid3527-empty')
export const packageRoot = join(repoRoot, 'curriculum/sequencia-dev-guiada/pg-d01-debug-reproduza')
export const generatedReadModelPath = join(engineRoot, 'src/data/generated/guidedPractice.ts')

export function sha256Text(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export async function readCanonicalSource(relativePath) {
  return readFile(join(packageRoot, relativePath), 'utf8')
}

export async function readGeneratedReadModel() {
  return readFile(generatedReadModelPath, 'utf8')
}

export async function regenerateProjection() {
  const { projectGuidedPractice } = await import(join(engineRoot, 'scripts/gen-guided-practice.mjs'))
  return projectGuidedPractice()
}

export async function regenerateProjectionFrom(customRepoRoot) {
  const { projectGuidedPractice } = await import(join(engineRoot, 'scripts/gen-guided-practice.mjs'))
  return projectGuidedPractice({ repoRoot: customRepoRoot })
}
