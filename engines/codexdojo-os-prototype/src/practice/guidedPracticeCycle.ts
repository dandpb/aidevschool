// Guided-practice cycle engine (AID-3527): a pure, deterministic state
// machine for the pg-d01 guided cycle (exemplo → tentativa → feedback por
// rúbrica → retry → takeaway), consuming the projected curriculum package.
//
// Invariants (tested in guidedPracticeCycle.test.ts):
// - Determinism: the same (state, event) pair always yields the same next
//   state; folding the same event list twice produces deep-equal states.
// - The cycle only moves forward, except for the explicit feedback → retry →
//   feedback loop, and retry reopens ONLY the criteria that did not pass.
// - Conclusion is gated: every rubric criterion is `met`, or `partial` with a
//   written justification; every attempt step carries recorded evidence; both
//   takeaway answers are non-empty (enunciado §2–§5).
// - The state never contains criterion ids outside the projection rubric and
//   never records progress: this is local, demonstrative session state only.
import type { GuidedPracticeProjection } from './guidedPracticeTypes'

export type RubricVerdict = 'met' | 'partial' | 'not_met'

export type CyclePhase =
  | 'exemplo'
  | 'tentativa'
  | 'feedback'
  | 'retry'
  | 'takeaway'
  | 'concluida'

export type CriterionAssessment = {
  readonly verdict: RubricVerdict
  readonly evidence: string
  readonly partialJustification: string
}

export type GuidedPracticeState = {
  readonly phase: CyclePhase
  readonly attempt: number
  readonly stepEvidence: readonly string[]
  readonly assessments: Readonly<Record<string, CriterionAssessment>>
  readonly retryTargets: readonly string[]
  readonly takeaway: Readonly<{ readonly a: string; readonly b: string }>
}

export type GuidedPracticeEvent =
  | { readonly type: 'exemplo-concluido' }
  | { readonly type: 'passo-evidenciado'; readonly step: number; readonly evidence: string }
  | { readonly type: 'tentativa-concluida' }
  | { readonly type: 'criterio-avaliado'; readonly criterion: string; readonly verdict: RubricVerdict; readonly evidence: string; readonly partialJustification?: string }
  | { readonly type: 'retry-pedido' }
  | { readonly type: 'retry-concluido' }
  | { readonly type: 'takeaway-registrado'; readonly a: string; readonly b: string }
  | { readonly type: 'pratica-concluida' }

export const CYCLE_PHASE_ORDER: readonly CyclePhase[] = [
  'exemplo',
  'tentativa',
  'feedback',
  'retry',
  'takeaway',
  'concluida',
]

export function initialGuidedPracticeState(projection: GuidedPracticeProjection): GuidedPracticeState {
  return {
    phase: 'exemplo',
    attempt: 1,
    stepEvidence: projection.attemptSteps.map(() => ''),
    assessments: Object.fromEntries(
      projection.rubric.map((criterion) => [
        criterion.id,
        { verdict: 'not_met', evidence: '', partialJustification: '' },
      ]),
    ),
    retryTargets: [],
    takeaway: { a: '', b: '' },
  }
}

function assertKnownCriterion(state: GuidedPracticeState, criterion: string): void {
  if (!(criterion in state.assessments)) {
    throw new Error(`unknown rubric criterion ${criterion}`)
  }
}

function failedCriteria(state: GuidedPracticeState): string[] {
  return Object.entries(state.assessments)
    .filter(([, assessment]) => assessment.verdict !== 'met')
    .filter(([, assessment]) => assessment.verdict !== 'partial' || assessment.partialJustification.trim() === '')
    .map(([id]) => id)
    .sort()
}

// Criteria that may be reopened by a retry: anything not `met` and not a
// justified `partial` (enunciado §4 — retry reopens only what did not pass).
export function openRetryTargets(state: GuidedPracticeState): readonly string[] {
  return failedCriteria(state)
}

export function conclusionBlockers(
  state: GuidedPracticeState,
  projection: GuidedPracticeProjection,
): string[] {
  const blockers: string[] = []
  for (const [index, evidence] of state.stepEvidence.entries()) {
    if (evidence.trim() === '') blockers.push(`evidencia-passo-${index + 1}`)
  }
  for (const criterion of projection.rubric) {
    const assessment = state.assessments[criterion.id]
    if (assessment === undefined || assessment.verdict === 'not_met') blockers.push(criterion.id)
    if (assessment?.verdict === 'partial' && assessment.partialJustification.trim() === '') {
      blockers.push(`${criterion.id}-justificativa`)
    }
  }
  if (state.takeaway.a.trim() === '') blockers.push('takeaway-a')
  if (state.takeaway.b.trim() === '') blockers.push('takeaway-b')
  return blockers.sort()
}

export function reduceGuidedPractice(
  state: GuidedPracticeState,
  event: GuidedPracticeEvent,
  projection: GuidedPracticeProjection,
): GuidedPracticeState {
  switch (event.type) {
    case 'exemplo-concluido': {
      if (state.phase !== 'exemplo') return state
      return { ...state, phase: 'tentativa' }
    }
    case 'passo-evidenciado': {
      if (state.phase !== 'tentativa') return state
      const step = event.step
      if (!Number.isInteger(step) || step < 1 || step > state.stepEvidence.length) return state
      const stepEvidence = state.stepEvidence.map((current, index) =>
        index === step - 1 ? event.evidence : current,
      )
      return { ...state, stepEvidence }
    }
    case 'tentativa-concluida': {
      if (state.phase !== 'tentativa') return state
      const missing = state.stepEvidence.findIndex((evidence) => evidence.trim() === '')
      if (missing !== -1) return state
      return { ...state, phase: 'feedback' }
    }
    case 'criterio-avaliado': {
      if (state.phase !== 'feedback' && state.phase !== 'retry') return state
      assertKnownCriterion(state, event.criterion)
      if (state.phase === 'retry' && !state.retryTargets.includes(event.criterion)) return state
      const justification =
        event.verdict === 'partial' ? (event.partialJustification ?? '') : state.assessments[event.criterion].partialJustification
      return {
        ...state,
        assessments: {
          ...state.assessments,
          [event.criterion]: {
            verdict: event.verdict,
            evidence: event.evidence,
            partialJustification: justification,
          },
        },
      }
    }
    case 'retry-pedido': {
      if (state.phase !== 'feedback') return state
      const targets = failedCriteria(state)
      if (targets.length === 0) return state
      return { ...state, phase: 'retry', retryTargets: targets, attempt: state.attempt + 1 }
    }
    case 'retry-concluido': {
      if (state.phase !== 'retry') return state
      return { ...state, phase: 'feedback', retryTargets: [] }
    }
    case 'takeaway-registrado': {
      if (state.phase !== 'feedback' && state.phase !== 'takeaway') return state
      return { ...state, phase: 'takeaway', takeaway: { a: event.a, b: event.b } }
    }
    case 'pratica-concluida': {
      if (state.phase !== 'takeaway') return state
      if (conclusionBlockers(state, projection).length > 0) return state
      return { ...state, phase: 'concluida' }
    }
    default:
      return state
  }
}

export function foldGuidedPractice(
  events: readonly GuidedPracticeEvent[],
  projection: GuidedPracticeProjection,
  initial: GuidedPracticeState = initialGuidedPracticeState(projection),
): GuidedPracticeState {
  return events.reduce(
    (state, event) => reduceGuidedPractice(state, event, projection),
    initial,
  )
}

// Deterministic local receipt ("recibo da prática", enunciado §5): archives
// the step evidence, rubric verdicts and takeaway against the exact projected
// contentVersion. Same state + projection → byte-identical receipt.
export function buildPracticeReceipt(
  state: GuidedPracticeState,
  projection: GuidedPracticeProjection,
): string {
  const lines: string[] = [
    `# Recibo da prática guiada ${projection.practiceId} — ${projection.title}`,
    '',
    `- contentVersion: ${projection.contentVersion}`,
    `- âncora: ${projection.anchorLessonId} · trilha: ${projection.track}`,
    `- tentativas: ${state.attempt}`,
    '',
    '## Evidência por passo da tentativa',
  ]
  projection.attemptSteps.forEach((step, index) => {
    lines.push(``, `### Passo ${index + 1}`, step, '', '```', state.stepEvidence[index].trim(), '```')
  })
  lines.push('', '## Rúbrica')
  for (const criterion of projection.rubric) {
    const assessment = state.assessments[criterion.id]
    lines.push(
      `- ${criterion.id}: ${assessment.verdict}` +
        (assessment.verdict === 'partial' ? ` — ${assessment.partialJustification.trim()}` : ''),
    )
  }
  lines.push(
    '',
    '## Takeaway',
    '',
    `- (a) ${projection.takeawayPrompts.a}`,
    `  ${state.takeaway.a.trim()}`,
    `- (b) ${projection.takeawayPrompts.b}`,
    `  ${state.takeaway.b.trim()}`,
    '',
  )
  return lines.join('\n')
}
