// @vitest-environment node
// AID-3590: projection invariants for the daily practice pg-c01. The runtime
// read model must (a) pin the ratified adapter artifact identity (sha256/
// bytes from the CD acceptance in AID-3583), (b) carry the worked example
// inline with its sha256 equal to the artifact manifest pin for the
// allowlisted learner-facing path, (c) keep every withheld path and gabarito
// fact marker out of the daily bundle, and (d) regenerate byte-identically.
// The pg-d01 read model is preserved unchanged in the same file. Node-side
// file reads go through guidedPracticeSources.mjs (untypechecked node side,
// AID-3527 pattern); the generator script is imported the same way.
import { describe, expect, it } from 'vitest'
import {
  guidedPracticeDailyProjection as daily,
  guidedPracticeProjection as graded,
} from '../data/generated/guidedPractice'
import { readGeneratedReadModel, repoRoot, sha256Text } from './guidedPracticeSources.mjs'

const DAILY_PACKAGE_ROOT = 'curriculum/praticas-guiadas-cotidiano/pg-c01-dados-minimos-e-verificacao'
const RATIFIED_ARTIFACT_SHA256 = 'ee57638361b6372d57f7061d7339f23b53c88bd238985fb2deddcbf7125d7e5d'
const RATIFIED_ARTIFACT_BYTES = 12871

// Answer-key fact markers ratified by the CD in AID-3583 (parecer b7995969 §5).
const GABARITO_FACT_MARKERS = ['12/19', '35/45', '4 das 5', 'confirmar até 14']
const WITHHELD_PATH_MARKERS = [
  'guia-de-correcao',
  'solucao.md',
  'exemplos/exemplo-falha.md',
  'exemplos/exemplo-sucesso.md',
  'rubrica-v1.md',
]
// Grader-only column vocabulary from the withheld rubrica.
const WITHHELD_COLUMN_MARKERS = ['perCheck', 'suficiente-quando']

type DailyGeneratorModule = {
  projectDailyGuidedPractice: (options?: { repoRoot?: string }) => Promise<{
    projection: { contentVersion: string }
    sha256: string
    bytes: number
  }>
  writeGuidedPracticeProjection: (options?: { repoRoot?: string }) => Promise<string>
}

async function importGenerator(): Promise<DailyGeneratorModule> {
  // Untyped node-side module (allowJs: false keeps src typecheck-free);
  // the implicit-any import is assignable to the declared module shape.
  // @ts-expect-error untyped node-side module (allowJs: false)
  return await import('../../scripts/gen-guided-practice.mjs')
}

describe('daily guided practice projection (pg-c01)', () => {
  it('pins the ratified artifact identity, source pins and adapter tool', () => {
    expect(daily.practiceId).toBe('pg-c01')
    expect(daily.contentVersion).toBe('pg-c01@v1')
    expect(daily.projectionPin.artifactSha256).toBe(RATIFIED_ARTIFACT_SHA256)
    expect(daily.projectionPin.artifactBytes).toBe(RATIFIED_ARTIFACT_BYTES)
    expect(daily.projectionPin.sourcePullRequest).toBe(635)
    expect(daily.projectionPin.sourceHead).toBe('88ca305e0f7cd1c9a9f543fbda69f154d1cf8aea')
    expect(daily.projectionPin.adapterTool).toBe('pg-c01-source-adapter')
    expect(daily.package.family).toBe('praticas-guiadas-cotidiano')
    expect(daily.package.simulated).toBe(true)
    expect(daily.package.gradesOrCertifies).toBe(false)
  })

  it('carries exactly the reviewed contract: 3 steps, L1–L6, G1–G8, 5 statements, 6 criteria, binary verdict', () => {
    expect(daily.steps.map((step) => step.id)).toEqual(['A', 'B', 'C'])
    expect(daily.inputs.fonte1.lines.map((line) => line.id)).toEqual(['L1', 'L2', 'L3', 'L4', 'L5', 'L6'])
    expect(daily.inputs.fonte2.lines.map((line) => line.id)).toEqual([
      'G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8',
    ])
    expect(daily.inputs.respostaIa.statements.map((statement) => statement.id)).toEqual(['1', '2', '3', '4', '5'])
    expect(daily.criteria).toEqual([
      'c1-mínimos',
      'c2-vereditos',
      'c3-citações',
      'c4-incerteza',
      'c5-privacidade',
      'c6-resposta',
    ])
    expect(daily.verdictPolicy).toEqual({
      allowed: ['sufficient', 'insufficient'],
      binary: true,
      allCriteriaRequired: true,
      aggregateScore: 'none',
    })
    expect(daily.takeaway.prompts).toHaveLength(2)
    expect(daily.completion).toBe(
      'practice concluded when all 6 criteria are sufficient, on the 1st or 2nd attempt',
    )
  })

  it('carries the worked example inline with the artifact manifest hash for the allowlisted path', () => {
    expect(daily.workedExample.sourcePath).toBe(`${DAILY_PACKAGE_ROOT}/exemplo-trabalhado.md`)
    const entry = daily.manifest.find((item) => item.path.endsWith('exemplo-trabalhado.md'))
    expect(entry).toBeDefined()
    // The inlined markdown must hash exactly to the manifest pin of the
    // pinned file — a different file (or an edit) cannot match.
    expect(sha256Text(daily.workedExample.markdown)).toBe(entry?.sha256)
    expect(daily.workedExample.markdown).toContain('EXEMPLO TRABALHADO')
  })

  it('pins only learner-visible source files in the manifest', () => {
    const paths = daily.manifest.map((entry) => entry.path).sort()
    expect(paths).toEqual(
      [
        'enunciado.md',
        'exemplo-trabalhado.md',
        'insumos/fonte-1-recado-tia-regina.md',
        'insumos/fonte-2-grupo-familia.md',
        'insumos/resposta-ia.md',
      ]
        .map((file) => `${DAILY_PACKAGE_ROOT}/${file}`)
        .sort(),
    )
  })

  it('never leaks withheld paths, grader columns or gabarito fact markers from the daily bundle', async () => {
    const generated = await readGeneratedReadModel()
    // The daily export is everything after its declaration; the pg-d01 export
    // legitimately carries its own learner-visible rubrica (perCheck etc.).
    const dailySection = generated.slice(generated.indexOf('export const guidedPracticeDailyProjection'))
    expect(dailySection.length).toBeGreaterThan(1000)
    for (const marker of [...WITHHELD_PATH_MARKERS, ...GABARITO_FACT_MARKERS, ...WITHHELD_COLUMN_MARKERS]) {
      expect(dailySection).not.toContain(marker)
    }
    // Repo-wide invariants that must hold for the WHOLE file.
    for (const marker of ['guia-de-correcao', 'solucao.md', 'exemplos/exemplo-falha.md', 'exemplos/exemplo-sucesso.md']) {
      expect(generated).not.toContain(marker)
    }
  })

  it('keeps the pg-d01 read model unchanged in the same file', () => {
    expect(graded.practiceId).toBe('pg-d01')
    expect(graded.contentVersion).toMatch(/^pg-d01@[0-9a-f]{12}$/)
    expect(graded.attemptSteps).toHaveLength(6)
    expect(graded.rubric).toHaveLength(6)
    expect(graded.manifest).toHaveLength(7)
  })

  it('is byte-deterministic and pins the ratified artifact when regenerating', async () => {
    const generator = await importGenerator()
    const before = await readGeneratedReadModel()
    await generator.writeGuidedPracticeProjection()
    const after = await readGeneratedReadModel()
    expect(after).toBe(before)
    const dailyRun = await generator.projectDailyGuidedPractice()
    expect(dailyRun.sha256).toBe(RATIFIED_ARTIFACT_SHA256)
    expect(dailyRun.bytes).toBe(RATIFIED_ARTIFACT_BYTES)
    expect(dailyRun.projection.contentVersion).toBe(daily.contentVersion)
  })

  it('fails closed when the frozen daily inputs are missing from the tree', async () => {
    const generator = await importGenerator()
    await expect(
      generator.projectDailyGuidedPractice({ repoRoot: `${repoRoot}/.scratch/aid3590-empty` }),
    ).rejects.toThrow(/daily adapter failed|cannot import daily adapter/)
  })
})
