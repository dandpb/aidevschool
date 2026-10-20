// AID-3772 (F1, AID-3677/L03): focused invariant suite for the explicit
// takeaway → feedback return in the daily (cotidiano) guided-practice cycle
// pg-c01. The dead end confirmed by CCE (l03-review-verdict-cce.md §3-F1)
// left a learner inside the takeaway phase with unresolved conclusion
// blockers and no way back: 'retry-pedido' only fires from feedback and no
// event carried takeaway → feedback, so the only escape discarded the whole
// session (A/B/C pieces). The return below is NAVIGATION ONLY: it must
// preserve the entire session state (pieces, criteria verdicts, retry
// response, takeaway text and attempt count) while conclusion stays
// prohibited while blockers exist — entry into takeaway remains permissive.
import { describe, expect, it } from 'vitest'
import { guidedPracticeDailyProjection as projection } from '../data/generated/guidedPractice'
import {
  conclusionBlockers,
  foldGuidedPractice,
  initialGuidedPracticeState,
  openRetryTargets,
  reduceGuidedPractice,
  type GuidedPracticeEvent,
  type GuidedPracticeState,
} from './guidedPracticeCycle'

function fullPieces(offset = 0): string[] {
  return projection.steps.map(
    (step, index) => `peça ${step.id}: pedido/tabela/aviso ${index + 1 + offset} com citação fonte-1 L2`,
  )
}

function assessAll(
  state: GuidedPracticeState,
  verdict: 'sufficient' | 'insufficient',
  evidence = 'peça + citação fonte-2 G4',
): GuidedPracticeState {
  return projection.criteria.reduce(
    (current, criterion) =>
      reduceGuidedPractice(current, { type: 'criterio-avaliado', criterion, verdict, evidence }, projection),
    state,
  )
}

function runToFeedback(): GuidedPracticeState {
  const events: GuidedPracticeEvent[] = [
    { type: 'exemplo-concluido' },
    ...projection.steps.map((_step, index): GuidedPracticeEvent => ({
      type: 'passo-evidenciado',
      step: index + 1,
      evidence: fullPieces()[index],
    })),
    { type: 'tentativa-concluida' },
  ]
  return foldGuidedPractice(events, projection)
}

function runToTakeawayWithPendingCriterion(): GuidedPracticeState {
  const feedback = runToFeedback()
  const withVerdicts = assessAll(feedback, 'insufficient')
  return reduceGuidedPractice(
    withVerdicts,
    { type: 'takeaway-registrado', a: 'takeaway A escrito', b: 'takeaway B escrito' },
    projection,
  )
}

describe('AID-3772 F1: explicit takeaway → feedback return (daily pg-c01)', () => {
  it('returns from takeaway to feedback while preserving the whole session', () => {
    const takeaway = runToTakeawayWithPendingCriterion()
    expect(takeaway.phase).toBe('takeaway')
    expect(conclusionBlockers(takeaway, projection).length).toBeGreaterThan(0)

    const returned = reduceGuidedPractice(takeaway, { type: 'revisao-pedida' }, projection)

    expect(returned.phase).toBe('feedback')
    expect(returned.attempt).toBe(takeaway.attempt)
    expect(returned.stepEvidence).toEqual(takeaway.stepEvidence)
    expect(returned.assessments).toEqual(takeaway.assessments)
    expect(returned.takeaway).toEqual({ a: 'takeaway A escrito', b: 'takeaway B escrito' })
    expect(returned.retryTargets).toEqual(takeaway.retryTargets)
    expect(returned.retryResponse).toBe(takeaway.retryResponse)
  })

  it('returning does not consume an attempt and does not grant retry by itself', () => {
    const takeaway = runToTakeawayWithPendingCriterion()
    const returned = reduceGuidedPractice(takeaway, { type: 'revisao-pedida' }, projection)

    expect(returned.attempt).toBe(1)
    expect(openRetryTargets(returned, projection).length).toBeGreaterThan(0)
    expect(returned.phase).toBe('feedback')
  })

  it('is a no-op outside the takeaway phase (cannot replace exemplo/tentativa/retry transitions)', () => {
    for (const state of [initialGuidedPracticeState(projection), runToFeedback()]) {
      const next = reduceGuidedPractice(state, { type: 'revisao-pedida' }, projection)
      expect(next).toBe(state)
    }
  })

  it('conclusion stays prohibited with blockers after a return cycle, and stays reachable once resolved', () => {
    let state = runToTakeawayWithPendingCriterion()

    // dead-end exit: takeaway -> feedback -> takeaway again, session intact
    state = reduceGuidedPractice(state, { type: 'revisao-pedida' }, projection)
    expect(state.phase).toBe('feedback')
    state = reduceGuidedPractice(
      state,
      { type: 'takeaway-registrado', a: state.takeaway.a, b: state.takeaway.b },
      projection,
    )
    expect(state.phase).toBe('takeaway')
    expect(reduceGuidedPractice(state, { type: 'pratica-concluida' }, projection).phase).toBe('takeaway')

    // resolving every pending criterion on the returned feedback unlocks conclusion
    state = reduceGuidedPractice(state, { type: 'revisao-pedida' }, projection)
    state = assessAll(state, 'sufficient')
    state = reduceGuidedPractice(
      state,
      { type: 'takeaway-registrado', a: state.takeaway.a, b: state.takeaway.b },
      projection,
    )
    expect(conclusionBlockers(state, projection)).toEqual([])
    expect(reduceGuidedPractice(state, { type: 'pratica-concluida' }, projection).phase).toBe('concluida')
  })

  it('at the retry cap the return still works and conclusion remains honestly blocked', () => {
    let state = runToTakeawayWithPendingCriterion()
    // burn the single allowed retry (cap = 2 attempts)
    state = reduceGuidedPractice(state, { type: 'revisao-pedida' }, projection)
    state = reduceGuidedPractice(state, { type: 'retry-pedido' }, projection)
    expect(state.phase).toBe('retry')
    state = reduceGuidedPractice(state, { type: 'retry-respondido', response: 'resposta à IA insistente' }, projection)
    state = reduceGuidedPractice(state, { type: 'retry-concluido' }, projection)
    expect(state.phase).toBe('feedback')
    state = reduceGuidedPractice(
      state,
      { type: 'takeaway-registrado', a: state.takeaway.a, b: state.takeaway.b },
      projection,
    )
    expect(state.attempt).toBe(2)

    const returned = reduceGuidedPractice(state, { type: 'revisao-pedida' }, projection)
    expect(returned.phase).toBe('feedback')
    expect(returned.attempt).toBe(2)
    // retry stays a separate action that respects the cap
    expect(reduceGuidedPractice(returned, { type: 'retry-pedido' }, projection).phase).toBe('feedback')
    // and conclusion remains honestly blocked on the still-insufficient criteria,
    // never on a hidden attempt penalty
    const blockers = conclusionBlockers(returned, projection)
    expect(blockers).not.toContain('limite-tentativas')
    expect(blockers).toContain(projection.criteria[projection.criteria.length - 1])
  })
})
