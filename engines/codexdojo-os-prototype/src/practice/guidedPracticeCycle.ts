// Guided-practice cycle engine (AID-3527): a pure, deterministic state
// machine for the pg-d01 guided cycle (exemplo → tentativa → feedback por
// rúbrica → retry → takeaway), consuming the projected curriculum package.
//
// AID-3590 generalizes the same machine for the daily practice pg-c01 with a
// per-family verdict POLICY instead of literal checks: pg-d01 keeps
// met/partial-justificado/not_met; pg-c01 is binary sufficient/insufficient
// with allCriteriaRequired and conclusion only on the 1st or 2nd attempt
// (ratified artifact text). The gate discriminates by allowlist: `insufficient`,
// undue `partial`/`met` or any UNKNOWN verdict value can never pass just
// because legacy code rejected the literal `not_met`.
//
// Invariants (tested in guidedPracticeCycle.test.ts and
// guidedPracticeDailyCycle.test.ts):
// - Determinism: the same (state, event) pair always yields the same next
//   state; folding the same event list twice produces deep-equal states.
// - The cycle only moves forward, except for the explicit feedback → retry →
//   feedback loop, and retry reopens ONLY the criteria that did not pass.
// - Conclusion is gated by the family policy: pg-d01 requires every rubric
//   criterion `met`, or `partial` with a written justification; pg-c01
//   requires every criterion exactly `sufficient` with recorded evidence,
//   the retry response (when retry was used) and attempt ≤ 2. Every attempt
//   step carries recorded evidence and both takeaway answers are non-empty.
// - The state never contains criterion ids outside the projection rubric and
//   never records progress: this is local, demonstrative session state only.
import {
  isDailyGuidedPractice,
  type AnyGuidedPracticeProjection,
  type DailyGuidedPracticeProjection,
  type GuidedPracticeProjection,
} from './guidedPracticeTypes'

export type RubricVerdict = 'met' | 'partial' | 'not_met'

export type DailyVerdict = 'sufficient' | 'insufficient'

export type CyclePhase =
  | 'exemplo'
  | 'tentativa'
  | 'feedback'
  | 'retry'
  | 'takeaway'
  | 'concluida'

type VerdictPolicy = {
  readonly allowed: readonly string[]
  readonly passing: RubricVerdict | DailyVerdict
  readonly partialWithJustification: boolean
  readonly initial: RubricVerdict | DailyVerdict
  readonly retryAttemptCap: number | null
  readonly evidencePerCriterionRequired: boolean
}

// pg-d01 policy is the accepted AID-3527 semantics, unchanged.
const GRADED_POLICY: VerdictPolicy = {
  allowed: ['met', 'partial', 'not_met'],
  passing: 'met',
  partialWithJustification: true,
  initial: 'not_met',
  retryAttemptCap: null,
  evidencePerCriterionRequired: false,
}

// pg-c01 policy follows the ratified projection contract (binary verdict,
// allCriteriaRequired, conclusion on the 1st or 2nd attempt).
const DAILY_POLICY: VerdictPolicy = {
  allowed: ['sufficient', 'insufficient'],
  passing: 'sufficient',
  partialWithJustification: false,
  initial: 'insufficient',
  retryAttemptCap: 2,
  evidencePerCriterionRequired: true,
}

export function verdictPolicyOf(projection: AnyGuidedPracticeProjection): VerdictPolicy {
  return isDailyGuidedPractice(projection) ? DAILY_POLICY : GRADED_POLICY
}

export function criteriaOf(projection: AnyGuidedPracticeProjection): readonly string[] {
  return isDailyGuidedPractice(projection)
    ? projection.criteria
    : projection.rubric.map((criterion) => criterion.id)
}

export type CriterionAssessment = {
  readonly verdict: RubricVerdict | DailyVerdict
  readonly evidence: string
  readonly partialJustification: string
}

export type GuidedPracticeState = {
  readonly phase: CyclePhase
  readonly attempt: number
  readonly stepEvidence: readonly string[]
  readonly assessments: Readonly<Record<string, CriterionAssessment>>
  readonly retryTargets: readonly string[]
  readonly retryResponse: string
  readonly takeaway: Readonly<{ readonly a: string; readonly b: string }>
}

export type GuidedPracticeEvent =
  | { readonly type: 'exemplo-concluido' }
  | { readonly type: 'passo-evidenciado'; readonly step: number; readonly evidence: string }
  | { readonly type: 'tentativa-concluida' }
  | { readonly type: 'criterio-avaliado'; readonly criterion: string; readonly verdict: RubricVerdict | DailyVerdict; readonly evidence: string; readonly partialJustification?: string }
  | { readonly type: 'retry-pedido' }
  | { readonly type: 'retry-respondido'; readonly response: string }
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

export function initialGuidedPracticeState(projection: AnyGuidedPracticeProjection): GuidedPracticeState {
  const policy = verdictPolicyOf(projection)
  return {
    phase: 'exemplo',
    attempt: 1,
    stepEvidence: (isDailyGuidedPractice(projection)
      ? projection.steps.map(() => '')
      : projection.attemptSteps.map(() => '')),
    assessments: Object.fromEntries(
      criteriaOf(projection).map((criterionId) => [
        criterionId,
        { verdict: policy.initial, evidence: '', partialJustification: '' },
      ]),
    ),
    retryTargets: [],
    retryResponse: '',
    takeaway: { a: '', b: '' },
  }
}

function assertKnownCriterion(state: GuidedPracticeState, criterion: string): void {
  if (!(criterion in state.assessments)) {
    throw new Error(`unknown rubric criterion ${criterion}`)
  }
}

// A criterion passes the gate only under the family policy: exactly the
// passing verdict, or a justified partial when the family allows it. Any
// other value — `insufficient`, undue `partial`/`met`, or an unknown verdict
// — fails (allowlist discrimination, not literal not_met rejection).
function criterionPasses(policy: VerdictPolicy | null, assessment: CriterionAssessment): boolean {
  if (policy === null) {
    // Legacy state-only view (pg-d01-compatible): identical outcomes to
    // GRADED_POLICY on every legal verdict and to the pre-AID-3590 filter
    // on unknown values (which never passed).
    return (
      assessment.verdict === 'met' ||
      assessment.verdict === 'sufficient' ||
      (assessment.verdict === 'partial' && assessment.partialJustification.trim() !== '')
    )
  }
  if (assessment.verdict === policy.passing) return true
  if (policy.partialWithJustification && assessment.verdict === 'partial') {
    return assessment.partialJustification.trim() !== ''
  }
  return false
}

function failedCriteria(state: GuidedPracticeState, policy: VerdictPolicy | null): string[] {
  return Object.entries(state.assessments)
    .filter(([, assessment]) => !criterionPasses(policy, assessment))
    .map(([id]) => id)
    .sort()
}

// Criteria that may be reopened by a retry: anything that did not pass under
// the family policy (enunciado §4 — retry reopens only what did not pass).
// The projection is optional for the legacy pg-d01 call shape; pass it to
// discriminate by the family verdict policy.
export function openRetryTargets(
  state: GuidedPracticeState,
  projection?: AnyGuidedPracticeProjection,
): readonly string[] {
  return failedCriteria(state, projection === undefined ? null : verdictPolicyOf(projection))
}

export function conclusionBlockers(
  state: GuidedPracticeState,
  projection: AnyGuidedPracticeProjection,
): string[] {
  const policy = verdictPolicyOf(projection)
  const blockers: string[] = []
  for (const [index, evidence] of state.stepEvidence.entries()) {
    if (evidence.trim() === '') blockers.push(`evidencia-passo-${index + 1}`)
  }
  for (const criterionId of criteriaOf(projection)) {
    const assessment = state.assessments[criterionId]
    if (assessment === undefined || !criterionPasses(policy, assessment)) blockers.push(criterionId)
    if (policy.partialWithJustification && assessment?.verdict === 'partial' && assessment.partialJustification.trim() === '') {
      blockers.push(`${criterionId}-justificativa`)
    }
    if (policy.evidencePerCriterionRequired && (assessment?.evidence ?? '').trim() === '') {
      blockers.push(`${criterionId}-evidencia`)
    }
  }
  if (policy.retryAttemptCap !== null && state.attempt > policy.retryAttemptCap) {
    blockers.push('limite-tentativas')
  }
  if (policy.evidencePerCriterionRequired && state.attempt > 1 && state.retryResponse.trim() === '') {
    blockers.push('retry-resposta')
  }
  if (state.takeaway.a.trim() === '') blockers.push('takeaway-a')
  if (state.takeaway.b.trim() === '') blockers.push('takeaway-b')
  return blockers.sort()
}

export function reduceGuidedPractice(
  state: GuidedPracticeState,
  event: GuidedPracticeEvent,
  projection: AnyGuidedPracticeProjection,
): GuidedPracticeState {
  const policy = verdictPolicyOf(projection)
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
      if (!policy.allowed.includes(event.verdict)) return state
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
      const targets = failedCriteria(state, policy)
      if (targets.length === 0) return state
      if (policy.retryAttemptCap !== null && state.attempt + 1 > policy.retryAttemptCap) return state
      return { ...state, phase: 'retry', retryTargets: targets, attempt: state.attempt + 1 }
    }
    case 'retry-respondido': {
      if (state.phase !== 'retry') return state
      if (!policy.evidencePerCriterionRequired) return state
      return { ...state, retryResponse: event.response }
    }
    case 'retry-concluido': {
      if (state.phase !== 'retry') return state
      if (policy.evidencePerCriterionRequired && state.retryResponse.trim() === '') return state
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
  projection: AnyGuidedPracticeProjection,
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

// Deterministic local receipt for the daily practice pg-c01 (AID-3590).
// Archives the content identity (version + projection sha + source pins),
// the A/B/C step evidence, the binary verdict with per-criterion evidence,
// the response to the insistent AI when retry was used, and both takeaway
// answers. Same state + projection → byte-identical receipt. Like the pg-d01
// receipt, it is local and demonstrative: no mastery, grade or certificate.
export function buildDailyPracticeReceipt(
  state: GuidedPracticeState,
  projection: DailyGuidedPracticeProjection,
): string {
  const pin = projection.projectionPin
  const lines: string[] = [
    `# Recibo da prática guiada pg-c01 — ${projection.package.id} (cotidiano)`,
    '',
    `- conteúdo: ${projection.contentVersion} · ${projection.package.id} ${projection.package.version} · jornada ${projection.package.journey} · público ${projection.package.audience}`,
    `- projeção: sha256 ${pin.artifactSha256} (${pin.artifactBytes} bytes, adapter ${pin.adapterTool} ${pin.adapterToolVersion})`,
    `- fonte: PR #${pin.sourcePullRequest} @ ${pin.sourceHead} · anexo canônico ${pin.canonicalAttachmentSha256}`,
    `- pins do aprendiz: ${projection.manifest.map((entry) => `${entry.path.split('/').pop()}=${entry.sha256.slice(0, 12)}`).join(', ')}`,
    `- tentativas: ${state.attempt} · simulada — sem nota, mastery ou certificado (${projection.completion})`,
    '',
    '## Etapas A/B/C',
  ]
  projection.steps.forEach((step, index) => {
    lines.push(``, `### Etapa ${step.id}`, step.instruction, '', '```', state.stepEvidence[index].trim(), '```')
  })
  lines.push('', '## Critérios (veredito binário sufficient/insufficient)')
  for (const criterionId of projection.criteria) {
    const assessment = state.assessments[criterionId]
    lines.push(`- ${criterionId}: ${assessment.verdict}`)
    lines.push(`  evidência: ${assessment.evidence.trim()}`)
  }
  if (state.attempt > 1) {
    lines.push(
      '',
      '## Resposta ao retry (tentativa 2)',
      '',
      `> IA insiste: ${projection.retry.insistedStatement.text}`,
      `resposta: ${state.retryResponse.trim()}`,
    )
  }
  lines.push(
    '',
    '## Takeaway',
    '',
    `- (a) ${projection.takeaway.prompts[0]}`,
    `  ${state.takeaway.a.trim()}`,
    `- (b) ${projection.takeaway.prompts[1]}`,
    `  ${state.takeaway.b.trim()}`,
    '',
  )
  return lines.join('\n')
}
