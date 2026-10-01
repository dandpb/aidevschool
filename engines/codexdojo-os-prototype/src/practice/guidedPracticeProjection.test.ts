// @vitest-environment node
// Projection invariants for the pg-d01 guided practice (AID-3527): the
// learner-facing read model must (a) be a byte-deterministic function of the
// canonical curriculum package, (b) pin every source by sha256, and (c) never
// leak the grader-facing guia-de-correcao. File reads stay on the node side
// via guidedPracticeSources.mjs (pattern of load_fixtures.mjs, AID-473).
import { describe, expect, it } from 'vitest'
import { guidedPracticeProjection } from '../data/generated/guidedPractice'
import {
  missingRepoRoot,
  readCanonicalSource,
  readGeneratedReadModel,
  regenerateProjection,
  regenerateProjectionFrom,
  sha256Text,
} from './guidedPracticeSources.mjs'

const EXPECTED_CRITERIA = [
  'c-reproducao',
  'c-verde-latente',
  'c-pedido',
  'c-vermelho',
  'c-fix-minimal',
  'c-suicao-revisao',
] as const

describe('guided practice projection (pg-d01)', () => {
  it('projects the canonical rubric verbatim: six criteria, each with a perCheck', () => {
    expect(guidedPracticeProjection.rubric.map((criterion) => criterion.id)).toEqual([
      ...EXPECTED_CRITERIA,
    ])
    for (const criterion of guidedPracticeProjection.rubric) {
      expect(criterion.criterion.trim()).not.toBe('')
      expect(criterion.perCheck).toContain('?')
    }
  })

  it('projects the six-step guided attempt in order, with real continuation text', () => {
    expect(guidedPracticeProjection.attemptSteps).toHaveLength(6)
    expect(guidedPracticeProjection.attemptSteps[0]).toMatch(
      /Reproduza manualmente.*saída real \(comando \+ exit code\)\./,
    )
    expect(guidedPracticeProjection.attemptSteps[5]).toMatch(/Revise o diff/)
  })

  it('pins identity fields from the canonical enunciado', () => {
    expect(guidedPracticeProjection.practiceId).toBe('pg-d01')
    expect(guidedPracticeProjection.anchorLessonId).toBe('l27')
    expect(guidedPracticeProjection.track).toBe('Dev')
    expect(guidedPracticeProjection.estimatedMinutes).toEqual({ min: 25, max: 40 })
    expect(guidedPracticeProjection.title).toContain('reproduza antes de perguntar')
  })

  it('exposes the four local inputs (bugreport, rule, fixture, suite) without network', () => {
    const roles = guidedPracticeProjection.inputs.map((input) => input.role)
    expect(roles).toEqual(['bugreport', 'rule', 'fixture', 'fixture-suite'])
    for (const input of guidedPracticeProjection.inputs) {
      expect(input.contents.trim()).not.toBe('')
    }
  })

  it('manifest matches the current canonical sources byte-for-byte (sha256)', async () => {
    expect(guidedPracticeProjection.manifest).toHaveLength(7)
    for (const entry of guidedPracticeProjection.manifest) {
      const raw = await readCanonicalSource(entry.path.replace(/^.*pg-d01-debug-reproduza\//, ''))
      expect(sha256Text(raw)).toBe(entry.sha256)
    }
  })

  it('never leaks the grader-facing guia-de-correcao into the learner surface', async () => {
    const generated = await readGeneratedReadModel()
    for (const marker of ['guia-de-correcao', 'solucao.md', 'teste_regressao_bug001.py']) {
      expect(generated).not.toContain(marker)
    }
    const solution = await readCanonicalSource('guia-de-correcao/solucao.md')
    const solutionOnlyLine = solution
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('|') && line.includes('6.0'))
    if (solutionOnlyLine !== undefined) {
      expect(generated).not.toContain(solutionOnlyLine)
    }
  })

  it('is byte-deterministic: regenerating the read model yields identical output', async () => {
    const first = await regenerateProjection()
    const second = await regenerateProjection()
    expect(first.fileBody).toBe(second.fileBody)
    expect(first.projection.contentVersion).toBe(guidedPracticeProjection.contentVersion)
  })

  it('fails closed when the canonical package is missing from the tree', async () => {
    await expect(regenerateProjectionFrom(missingRepoRoot)).rejects.toThrow(/cannot read enunciado\.md/)
  })
})
