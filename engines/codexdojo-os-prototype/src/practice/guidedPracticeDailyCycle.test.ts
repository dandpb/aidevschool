// AID-3590: invariant suite for the daily (cotidiano) guided-practice cycle
// pg-c01. The gate must discriminate by POLICY, not by rejecting the literal
// `not_met`: only an exact `sufficient` passes; `insufficient`, undue
// `partial`/`met` and unknown verdict values never pass and cannot even be
// recorded. Retry reopens only failed criteria, is capped by the ratified
// completion text (1st or 2nd attempt) and requires the response to the
// insistent AI. The receipt is deterministic and pins content identity,
// projection hash, source pins, per-criterion evidence, the A/B/C pieces,
// the retry response when used and both takeaways.
import { describe, expect, it } from 'vitest'
import { guidedPracticeDailyProjection as projection } from '../data/generated/guidedPractice'
import {
  buildDailyPracticeReceipt,
  conclusionBlockers,
  foldGuidedPractice,
  initialGuidedPracticeState,
  openRetryTargets,
  reduceGuidedPractice,
  verdictPolicyOf,
  type GuidedPracticeEvent,
  type GuidedPracticeState,
} from './guidedPracticeCycle'

const policy = verdictPolicyOf(projection)

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
      reduceGuidedPractice(
        current,
        { type: 'criterio-avaliado', criterion, verdict, evidence },
        projection,
      ),
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

describe('daily guided practice cycle (pg-c01)', () => {
  it('starts in exemplo with binary insufficient verdicts and three A/B/C pieces', () => {
    const state = initialGuidedPracticeState(projection)
    expect(state.phase).toBe('exemplo')
    expect(state.attempt).toBe(1)
    expect(state.retryResponse).toBe('')
    expect(Object.keys(state.assessments).sort()).toEqual([...projection.criteria].sort())
    for (const criterion of projection.criteria) {
      expect(state.assessments[criterion].verdict).toBe('insufficient')
    }
    expect(state.stepEvidence).toEqual(projection.steps.map(() => ''))
    expect(policy.allowed).toEqual(['sufficient', 'insufficient'])
  })

  it('is deterministic: the same event list folds to the same state', () => {
    const events: GuidedPracticeEvent[] = [
      { type: 'exemplo-concluido' },
      ...projection.steps.map((_step, index): GuidedPracticeEvent => ({
        type: 'passo-evidenciado',
        step: index + 1,
        evidence: fullPieces()[index],
      })),
      { type: 'tentativa-concluida' },
      { type: 'retry-pedido' },
      { type: 'retry-respondido', response: 'mantenho fonte-1 L1: dia 19 citado' },
      { type: 'retry-concluido' },
      { type: 'takeaway-registrado', a: 'o endereço com código do portão', b: 'a frase do dia 19 com L1' },
    ]
    expect(foldGuidedPractice(events, projection)).toEqual(foldGuidedPractice(events, projection))
  })

  it('discriminates the verdict policy: only exact sufficient passes the gate', () => {
    const assessed = assessAll(runToFeedback(), 'sufficient')
    const takeaway = reduceGuidedPractice(
      assessed,
      { type: 'takeaway-registrado', a: 'a', b: 'b' },
      projection,
    )
    expect(conclusionBlockers(takeaway, projection)).toEqual([])
    expect(reduceGuidedPractice(takeaway, { type: 'pratica-concluida' }, projection).phase).toBe('concluida')

    const insufficient = reduceGuidedPractice(
      assessAll(runToFeedback(), 'insufficient'),
      { type: 'takeaway-registrado', a: 'a', b: 'b' },
      projection,
    )
    expect(conclusionBlockers(insufficient, projection)).toEqual(projection.criteria)
    expect(reduceGuidedPractice(insufficient, { type: 'pratica-concluida' }, projection).phase).toBe('takeaway')
  })

  it('rejects undue graded verdicts and unknown values instead of recording them', () => {
    let state = runToFeedback()
    for (const undue of ['met', 'partial', 'not_met', 'banana', ''] as const) {
      state = reduceGuidedPractice(
        state,
        {
          type: 'criterio-avaliado',
          criterion: projection.criteria[0],
          verdict: undue as 'met',
          evidence: 'x',
          partialJustification: 'justificativa indevida',
        },
        projection,
      )
    }
    // Nothing was recorded: the criterion keeps its initial binary verdict.
    expect(state.assessments[projection.criteria[0]].verdict).toBe('insufficient')
    // A forged state carrying an undue value still cannot pass the gate.
    const forged: GuidedPracticeState = {
      ...assessAll(runToFeedback(), 'sufficient'),
      assessments: {
        ...assessAll(runToFeedback(), 'sufficient').assessments,
        [projection.criteria[0]]: {
          verdict: 'met',
          evidence: 'x',
          partialJustification: 'indevida',
        },
      },
    }
    expect(conclusionBlockers(forged, projection)).toContain(projection.criteria[0])
  })

  it('requires evidence per criterion, the A/B/C pieces and both takeaways', () => {
    const noEvidence = runToFeedback()
    const assessed = projection.criteria.reduce(
      (current, criterion) =>
        reduceGuidedPractice(
          current,
          { type: 'criterio-avaliado', criterion, verdict: 'sufficient', evidence: '' },
          projection,
        ),
      noEvidence,
    )
    const blockers = conclusionBlockers(
      reduceGuidedPractice(assessed, { type: 'takeaway-registrado', a: 'a', b: 'b' }, projection),
      projection,
    )
    for (const criterion of projection.criteria) {
      expect(blockers).toContain(`${criterion}-evidencia`)
    }
    expect(blockers).toEqual([...projection.criteria.map((id) => `${id}-evidencia`)].sort())

    const missingPiece = reduceGuidedPractice(
      initialGuidedPracticeState(projection),
      { type: 'exemplo-concluido' },
      projection,
    )
    expect(conclusionBlockers(missingPiece, projection)).toContain('evidencia-passo-1')

    const noTakeaway = reduceGuidedPractice(assessed, { type: 'takeaway-registrado', a: '', b: 'b' }, projection)
    expect(conclusionBlockers(noTakeaway, projection)).toContain('takeaway-a')
  })

  it('retry reopens only failed criteria, requires the response to the insistent AI and returns', () => {
    let state = assessAll(runToFeedback(), 'sufficient')
    state = reduceGuidedPractice(
      state,
      {
        type: 'criterio-avaliado',
        criterion: 'c5-privacidade',
        verdict: 'insufficient',
        evidence: 'não classifiquei o CPF',
      },
      projection,
    )
    expect(openRetryTargets(state, projection)).toEqual(['c5-privacidade'])
    state = reduceGuidedPractice(state, { type: 'retry-pedido' }, projection)
    expect(state.phase).toBe('retry')
    expect(state.attempt).toBe(2)
    expect(state.retryTargets).toEqual(['c5-privacidade'])

    // Locked criterion keeps its verdict during retry.
    const locked = reduceGuidedPractice(
      state,
      {
        type: 'criterio-avaliado',
        criterion: 'c1-mínimos',
        verdict: 'insufficient',
        evidence: 'fora do alvo',
      },
      projection,
    )
    expect(locked.assessments['c1-mínimos'].verdict).toBe('sufficient')

    // Retry cannot close without the response to the insistent AI.
    expect(reduceGuidedPractice(state, { type: 'retry-concluido' }, projection).phase).toBe('retry')
    const responded = reduceGuidedPractice(
      state,
      { type: 'retry-respondido', response: 'mantenho: CPF não entra no pedido (fonte-1 L5)' },
      projection,
    )
    const back = reduceGuidedPractice(responded, { type: 'retry-concluido' }, projection)
    expect(back.phase).toBe('feedback')
    expect(back.retryTargets).toEqual([])

    const reopened = reduceGuidedPractice(
      back,
      {
        type: 'criterio-avaliado',
        criterion: 'c5-privacidade',
        verdict: 'sufficient',
        evidence: 'CPF fora do pedido; contrato no nome da Regina (fonte-1 L5)',
      },
      projection,
    )
    expect(openRetryTargets(reopened, projection)).toEqual([])
  })

  it('caps retry at the ratified completion text: no third attempt', () => {
    let state = assessAll(runToFeedback(), 'insufficient')
    state = reduceGuidedPractice(state, { type: 'retry-pedido' }, projection)
    expect(state.attempt).toBe(2)
    state = reduceGuidedPractice(
      state,
      { type: 'retry-respondido', response: 'resposta à IA' },
      projection,
    )
    state = reduceGuidedPractice(state, { type: 'retry-concluido' }, projection)
    expect(state.phase).toBe('feedback')
    // Still insufficient on the 2nd attempt: no further retry is offered.
    expect(reduceGuidedPractice(state, { type: 'retry-pedido' }, projection).phase).toBe('feedback')
    const concluded = reduceGuidedPractice(
      reduceGuidedPractice(state, { type: 'takeaway-registrado', a: 'a', b: 'b' }, projection),
      { type: 'pratica-concluida' },
      projection,
    )
    expect(concluded.phase).toBe('takeaway')
  })

  it('blocks conclusion while the retry response is missing (attempt 2)', () => {
    let state = assessAll(runToFeedback(), 'insufficient')
    state = reduceGuidedPractice(state, { type: 'retry-pedido' }, projection)
    state = reduceGuidedPractice(
      state,
      {
        type: 'criterio-avaliado',
        criterion: projection.criteria[0],
        verdict: 'sufficient',
        evidence: 're-citado fonte-1 L1',
      },
      projection,
    )
    const withoutResponse = reduceGuidedPractice(
      state,
      { type: 'takeaway-registrado', a: 'a', b: 'b' },
      projection,
    )
    expect(conclusionBlockers(withoutResponse, projection)).toContain('retry-resposta')
  })

  it('builds a deterministic receipt pinning identity, pieces, verdicts, retry response and takeaways', () => {
    let state = assessAll(runToFeedback(), 'sufficient')
    state = reduceGuidedPractice(
      state,
      {
        type: 'criterio-avaliado',
        criterion: 'c3-citações',
        verdict: 'insufficient',
        evidence: 'tabela sem coluna de citação',
      },
      projection,
    )
    state = reduceGuidedPractice(state, { type: 'retry-pedido' }, projection)
    state = reduceGuidedPractice(
      state,
      { type: 'retry-respondido', response: 're-citei fonte-2 G3 em todas as linhas' },
      projection,
    )
    state = reduceGuidedPractice(state, { type: 'retry-concluido' }, projection)
    state = reduceGuidedPractice(
      state,
      {
        type: 'criterio-avaliado',
        criterion: 'c3-citações',
        verdict: 'sufficient',
        evidence: 'todas as 5 linhas com fonte+linha',
      },
      projection,
    )
    state = reduceGuidedPractice(
      state,
      {
        type: 'takeaway-registrado',
        a: 'o telefone com código do portão',
        b: 'a frase do dia 19 só entrou com fonte-1 L1',
      },
      projection,
    )
    const done = reduceGuidedPractice(state, { type: 'pratica-concluida' }, projection)
    expect(done.phase).toBe('concluida')

    const first = buildDailyPracticeReceipt(done, projection)
    const second = buildDailyPracticeReceipt(done, projection)
    expect(first).toBe(second)
    expect(first).toContain('pg-c01')
    expect(first).toContain(projection.contentVersion)
    expect(first).toContain(projection.projectionPin.artifactSha256)
    expect(first).toContain(`PR #${projection.projectionPin.sourcePullRequest}`)
    expect(first).toContain(projection.projectionPin.sourceHead)
    expect(first).toContain('## Etapas A/B/C')
    expect(first).toContain('### Etapa A')
    expect(first).toContain('peça A: pedido/tabela/aviso 1 com citação fonte-1 L2')
    expect(first).toContain('- c1-mínimos: sufficient')
    expect(first).toContain('- c3-citações: sufficient')
    expect(first).toContain('todas as 5 linhas com fonte+linha')
    expect(first).toContain('## Resposta ao retry (tentativa 2)')
    expect(first).toContain(`> IA insiste: ${projection.retry.insistedStatement.text}`)
    expect(first).toContain('re-citei fonte-2 G3 em todas as linhas')
    expect(first).toContain(projection.takeaway.prompts[0])
    expect(first).toContain('a frase do dia 19 só entrou com fonte-1 L1')
    expect(first).toContain('sem nota, mastery ou certificado')
  })

  it('omits the retry section from the receipt when retry was not used', () => {
    const done = reduceGuidedPractice(
      reduceGuidedPractice(
        assessAll(runToFeedback(), 'sufficient'),
        { type: 'takeaway-registrado', a: 'a', b: 'b' },
        projection,
      ),
      { type: 'pratica-concluida' },
      projection,
    )
    const receipt = buildDailyPracticeReceipt(done, projection)
    expect(receipt).not.toContain('## Resposta ao retry')
    expect(receipt).toContain('- tentativas: 1')
  })
})
