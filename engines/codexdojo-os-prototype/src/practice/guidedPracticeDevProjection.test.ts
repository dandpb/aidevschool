// @vitest-environment node
// Projection invariants for the dev-family practices pg-d02..pg-d04
// (AID-5006), same discipline as the pg-d01 suite (AID-3527): the read model
// is a byte-deterministic function of the canonical curriculum packages,
// pins every source by sha256, and never leaks the grader-facing
// guia-de-correcao. File reads stay on the node side via
// guidedPracticeSources.mjs (pattern of load_fixtures.mjs).
import { describe, expect, it } from 'vitest'
import { guidedPracticeDevProjections } from '../data/generated/guidedPractice'
import type { DevGuidedPracticeId } from './guidedPracticeTypes'
import {
  missingRepoRoot,
  readGeneratedReadModel,
  readRepoFile,
  regenerateDevProjections,
  regenerateDevProjectionsFrom,
  sha256Text,
} from './guidedPracticeSources.mjs'

const DEV_EXPECTATIONS: Readonly<
  Record<DevGuidedPracticeId, {
    readonly anchor: string
    readonly steps: number
    readonly criteria: readonly string[]
    readonly roles: readonly string[]
    readonly takeawayHint: readonly [string, string]
  }>
> = {
  'pg-d02': {
    anchor: 'M3',
    steps: 6,
    criteria: [
      'c1-cinco-campos',
      'c2-contexto-por-caminho',
      'c3-objetivo-unico',
      'c4-aceite-executavel',
      'c5-resticoes-do-contrato',
      'c6-nao-meta-explicita',
      'c7-casos-borda-decidiveis',
    ],
    roles: ['brief', 'sample', 'verifier'],
    takeawayHint: ['decisão implícita', 'ACEITE ou NÃO-META'],
  },
  'pg-d03': {
    anchor: 'l28',
    steps: 6,
    criteria: [
      'c1-baseline-verde',
      'c2-caracterizacao-antes',
      'c3-armadilha-executada',
      'c4-veredito-fundamentado',
      'c5-passos-pequenos',
      'c6-testes-existentes-intocados',
      'c7-comportamento-preservado',
    ],
    roles: ['brief', 'contract', 'proposal', 'fixture', 'fixture-suite'],
    takeawayHint: ['não provou', 'rede'],
  },
  'pg-d04': {
    anchor: 'M4+M5',
    steps: 6,
    criteria: [
      'c1-contexto-duas-tabelas',
      'c2-contexto-resolve-sem-ruido',
      'c3-limite-30min',
      'c4-fora-de-escopo-real',
      'c5-aceite-verificavel',
      'c6-spec-fecha-decisoes',
      'c7-recibo-honesto',
    ],
    roles: ['brief', 'inventory', 'verifier'],
    takeawayHint: ['cinco entregas embutidas', 'CONTEXTO'],
  },
}

describe('guided practice projection (dev family, AID-5006)', () => {
  for (const practiceId of Object.keys(DEV_EXPECTATIONS) as DevGuidedPracticeId[]) {
    describe(practiceId, () => {
      const projection = guidedPracticeDevProjections[practiceId]
      const expected = DEV_EXPECTATIONS[practiceId]

      it('pins identity fields from the canonical enunciado', () => {
        expect(projection.practiceId).toBe(practiceId)
        expect(projection.track).toBe('Dev')
        expect(projection.anchorLessonId).toBe(expected.anchor)
        expect(projection.estimatedMinutes).toEqual({ min: 25, max: 40 })
        expect(projection.title).toContain('Prática guiada')
        expect(projection.contentVersion).toMatch(new RegExp(`^${practiceId}@[0-9a-f]{12}$`))
        expect(projection.objective.trim()).not.toBe('')
      })

      it(`projects the ${expected.steps}-step attempt and the rubric in canonical order`, () => {
        expect(projection.attemptSteps).toHaveLength(expected.steps)
        for (const step of projection.attemptSteps) {
          expect(step.trim()).not.toBe('')
        }
        expect(projection.rubric.map((criterion) => criterion.id)).toEqual([...expected.criteria])
        for (const criterion of projection.rubric) {
          expect(criterion.criterion.trim()).not.toBe('')
          // Unlike pg-d01's interrogative perChecks, the pg-d02..pg-d04
          // rubrics phrase some checks as declarative executable probes.
          expect(criterion.perCheck.length).toBeGreaterThan(20)
        }
      })

      it('derives the takeaway prompts from the canonical section (not hardcoded)', () => {
        expect(projection.takeawayPrompts.a).toContain(expected.takeawayHint[0])
        expect(projection.takeawayPrompts.b).toContain(expected.takeawayHint[1])
      })

      it('exposes the local inputs with the per-package roles, offline', () => {
        expect(projection.inputs.map((input) => input.role)).toEqual([...expected.roles])
        for (const input of projection.inputs) {
          expect(input.contents.trim()).not.toBe('')
        }
      })

      it('manifest matches the current canonical sources byte-for-byte (sha256)', { timeout: 30_000 }, async () => {
        expect(projection.manifest.length).toBeGreaterThan(0)
        for (const entry of projection.manifest) {
          const raw = await readRepoFile(entry.path)
          expect(sha256Text(raw)).toBe(entry.sha256)
        }
      })
    })
  }

  it('never leaks the grader-facing guia-de-correcao into the learner surface', async () => {
    const generated = await readGeneratedReadModel()
    for (const marker of ['guia-de-correcao', 'solucao.md']) {
      expect(generated).not.toContain(marker)
    }
  })

  it('regenerating the dev projections yields identical content (deep-equal; the emitted read model stays key-sorted by the stable serializer)', { timeout: 60_000 }, async () => {
    const first = await regenerateDevProjections()
    const second = await regenerateDevProjections()
    expect(first).toEqual(second)
    expect(first).toEqual(guidedPracticeDevProjections)
  })

  it('fails closed when a canonical dev package is missing from the tree', { timeout: 30_000 }, async () => {
    await expect(regenerateDevProjectionsFrom(missingRepoRoot)).rejects.toThrow(
      /cannot read enunciado\.md/,
    )
  })
})
