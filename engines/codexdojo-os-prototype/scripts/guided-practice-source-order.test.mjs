import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { projectDevGuidedPractices } from './gen-guided-practice.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const projections = await projectDevGuidedPractices({ repoRoot })
const hash = (value) => createHash('sha256').update(value).digest('hex')

test('pg-d02 manifest and version match the actual frozen catalog contract', async () => {
  const contract = JSON.parse(await readFile(join(repoRoot, 'curriculum/sequencia-dev-guiada/tools/fixtures/pg-d02-source-contract.json'), 'utf8'))
  const projection = projections['pg-d02']
  const base = `curriculum/sequencia-dev-guiada/${contract.package.id}`
  assert.deepEqual(projection.manifest.map((entry) => relative(base, entry.path)), contract.package.contentVersionBasis.allowlist)
  assert.equal(projection.contentVersion, contract.package.contentVersion)
})

for (const id of ['pg-d03', 'pg-d04']) {
  test(`${id} follows the canonical manifest order before computing its version`, () => {
    const projection = projections[id]
    const base = dirname(projection.exemplar.sourcePath)
    const expected = ['enunciado.md', 'exemplo-trabalhado.md', ...projection.inputs.map((input) => input.path), 'rubrica-v1.md']
    const relativeManifest = projection.manifest.map((entry) => relative(base, entry.path))
    assert.deepEqual(relativeManifest, expected)
    const ordered = expected.map((path) => projection.manifest.find((entry) => entry.path === `${base}/${path}`))
    const version = `${id}@${hash(ordered.map((entry) => `${entry.path}:${entry.sha256}`).join('\n')).slice(0, 12)}`
    assert.equal(projection.contentVersion, version)
  })
}

test('every projected source digest remains bound to its actual file bytes', async () => {
  for (const projection of Object.values(projections)) {
    for (const entry of projection.manifest) {
      assert.equal(entry.sha256, hash(await readFile(join(repoRoot, entry.path))))
    }
  }
})
