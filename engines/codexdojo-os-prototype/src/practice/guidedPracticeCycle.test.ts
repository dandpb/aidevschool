import { describe, expect, it } from 'vitest'
import { guidedPracticeProjection as projection } from '../data/generated/guidedPractice'
import {
  buildPracticeReceipt,
  conclusionBlockers,
  CYCLE_PHASE_ORDER,
  foldGuidedPractice,
  initialGuidedPracticeState,
  openRetryTargets,
  reduceGuidedPractice,
  type GuidedPracticeEvent,
  type GuidedPracticeState,
} from './guidedPracticeCycle'

const steps = projection.attemptSteps

function fullEvidence(offset = 0): string[] {
  return steps.map((_, index) => `$ comando ${index + 1 + offset}\nsaída real ${index + 1 + offset}`)
}

function assessAll(
  state: GuidedPracticeState,
  verdict: 'met' | 'partial',
  evidence = 'diff citado',
): GuidedPracticeState {
  return projection.rubric.reduce(
    (current, criterion) =>
      reduceGuidedPractice(
        current,
        {
          type: 'criterio-avaliado',
          criterion: criterion.id,
          verdict,
          evidence,
          partialJustification: verdict === 'partial' ? 'justificativa escrita' : undefined,
        },
        projection,
      ),
    state,
  )
}

function runToFeedback(): GuidedPracticeState {
  const events: GuidedPracticeEvent[] = [
    { type: 'exemplo-concluido' },
    ...steps.map((_, index): GuidedPracticeEvent => ({
      type: 'passo-evidenciado',
      step: index + 1,
      evidence: fullEvidence()[index],
    })),
    { type: 'tentativa-concluida' },
  ]
  return foldGuidedPractice(events, projection)
}

describe('guided practice cycle machine', () => {
  it('starts in the exemplo phase with the projection rubric not met and empty evidence', () => {
    const state = initialGuidedPracticeState(projection)
    expect(state.phase).toBe('exemplo')
    expect(state.attempt).toBe(1)
    expect(Object.keys(state.assessments).sort()).toEqual(
      projection.rubric.map((criterion) => criterion.id).sort(),
    )
    expect(state.stepEvidence).toEqual(steps.map(() => ''))
  })

  it('is deterministic: the same event list always folds to the same state', () => {
    const events: GuidedPracticeEvent[] = [
      { type: 'exemplo-concluido' },
      ...steps.map((_, index): GuidedPracticeEvent => ({
        type: 'passo-evidenciado',
        step: index + 1,
        evidence: fullEvidence()[index],
      })),
      { type: 'tentativa-concluida' },
      { type: 'retry-pedido' },
      { type: 'retry-concluido' },
      { type: 'takeaway-registrado', a: 'porque a fronteira não era testada', b: 'o caso mínimo' },
    ]
    const first = foldGuidedPractice(events, projection)
    const second = foldGuidedPractice(events, projection)
    expect(first).toEqual(second)
  })

  it('blocks the transition out of tentativa while any step lacks evidence', () => {
    let state = reduceGuidedPractice(initialGuidedPracticeState(projection), { type: 'exemplo-concluido' }, projection)
    state = reduceGuidedPractice(state, { type: 'passo-evidenciado', step: 1, evidence: 'ok' }, projection)
    state = reduceGuidedPractice(state, { type: 'tentativa-concluida' }, projection)
    expect(state.phase).toBe('tentativa')
  })

  it('ignores evidence for unknown steps instead of corrupting state', () => {
    const state = reduceGuidedPractice(
      initialGuidedPracticeState(projection),
      { type: 'passo-evidenciado', step: steps.length + 5, evidence: 'x' },
      projection,
    )
    expect(state.stepEvidence).toEqual(steps.map(() => ''))
  })

  it('rejects assessments for criteria outside the projection rubric', () => {
    const state = runToFeedback()
    expect(() =>
      reduceGuidedPractice(
        state,
        { type: 'criterio-avaliado', criterion: 'c-inventado', verdict: 'met', evidence: 'x' },
        projection,
      ),
    ).toThrow(/unknown rubric criterion/)
  })

  it('gates conclusion on rubric, evidence and takeaway, and accepts justified partials', () => {
    const rubricDone = assessAll(runToFeedback(), 'met')
    const almost = reduceGuidedPractice(
      rubricDone,
      { type: 'takeaway-registrado', a: 'resposta a', b: 'resposta b' },
      projection,
    )
    expect(conclusionBlockers(almost, projection)).toEqual([])
    let concluded = reduceGuidedPractice(almost, { type: 'pratica-concluida' }, projection)
    expect(concluded.phase).toBe('concluida')

    const partialDone = assessAll(runToFeedback(), 'partial')
    const partialState = reduceGuidedPractice(
      partialDone,
      { type: 'takeaway-registrado', a: 'a', b: 'b' },
      projection,
    )
    expect(conclusionBlockers(partialState, projection)).toEqual([])
    concluded = reduceGuidedPractice(partialState, { type: 'pratica-concluida' }, projection)
    expect(concluded.phase).toBe('concluida')

    const missingTakeaway = reduceGuidedPractice(rubricDone, { type: 'takeaway-registrado', a: '', b: 'b' }, projection)
    expect(conclusionBlockers(missingTakeaway, projection)).toContain('takeaway-a')
    expect(reduceGuidedPractice(missingTakeaway, { type: 'pratica-concluida' }, projection).phase).toBe('takeaway')
  })

  it('treats partial without justification as not passing (blocker + retry target)', () => {
    let state = runToFeedback()
    state = reduceGuidedPractice(
      state,
      { type: 'criterio-avaliado', criterion: 'c-vermelho', verdict: 'partial', evidence: 'x' },
      projection,
    )
    expect(openRetryTargets(state)).toContain('c-vermelho')
    const takeaway = reduceGuidedPractice(state, { type: 'takeaway-registrado', a: 'a', b: 'b' }, projection)
    expect(conclusionBlockers(takeaway, projection)).toContain('c-vermelho-justificativa')
  })

  it('retry reopens only failed criteria and bumps the attempt counter', () => {
    let state = assessAll(runToFeedback(), 'met')
    state = reduceGuidedPractice(
      state,
      { type: 'criterio-avaliado', criterion: 'c-fix-minimal', verdict: 'not_met', evidence: 'diff grande demais' },
      projection,
    )
    state = reduceGuidedPractice(state, { type: 'retry-pedido' }, projection)
    expect(state.phase).toBe('retry')
    expect(state.attempt).toBe(2)
    expect(state.retryTargets).toEqual(['c-fix-minimal'])

    const locked = reduceGuidedPractice(
      state,
      { type: 'criterio-avaliado', criterion: 'c-reproducao', verdict: 'not_met', evidence: ' fora do alvo' },
      projection,
    )
    expect(locked.assessments['c-reproducao'].verdict).toBe('met')

    const reopened = reduceGuidedPractice(
      state,
      { type: 'criterio-avaliado', criterion: 'c-fix-minimal', verdict: 'met', evidence: 'diff de 1 caractere' },
      projection,
    )
    const back = reduceGuidedPractice(reopened, { type: 'retry-concluido' }, projection)
    expect(back.phase).toBe('feedback')
    expect(back.retryTargets).toEqual([])
    expect(openRetryTargets(back)).toEqual([])
  })

  it('never offers retry when every criterion passes', () => {
    const state = assessAll(runToFeedback(), 'met')
    expect(openRetryTargets(state)).toEqual([])
    expect(reduceGuidedPractice(state, { type: 'retry-pedido' }, projection).phase).toBe('feedback')
  })

  it('only allows forward phase transitions plus the explicit retry loop', () => {
    const state = initialGuidedPracticeState(projection)
    for (const premature of [
      { type: 'tentativa-concluida' },
      { type: 'retry-pedido' },
      { type: 'takeaway-registrado', a: 'a', b: 'b' },
      { type: 'pratica-concluida' },
    ] as GuidedPracticeEvent[]) {
      expect(reduceGuidedPractice(state, premature, projection).phase).toBe('exemplo')
    }
    expect(CYCLE_PHASE_ORDER).toContain(state.phase)
  })

  it('builds a byte-identical receipt for the same state and content version', () => {
    const done = reduceGuidedPractice(
      reduceGuidedPractice(
        assessAll(runToFeedback(), 'met'),
        { type: 'takeaway-registrado', a: 'suíte verde não testava a fronteira', b: 'o caso mínimo com saída real' },
        projection,
      ),
      { type: 'pratica-concluida' },
      projection,
    )
    const first = buildPracticeReceipt(done, projection)
    const second = buildPracticeReceipt(done, projection)
    expect(first).toBe(second)
    expect(first).toContain(projection.contentVersion)
    expect(first).toContain('c-suicao-revisao: met')
    expect(first).toContain('suíte verde não testava a fronteira')
  })
})
