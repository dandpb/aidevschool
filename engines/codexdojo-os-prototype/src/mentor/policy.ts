import {
  isMentorRequestV1,
  type MentorOutcome,
  type MentorRequestV1,
  type MentorResponseV1,
  type MentorStapStage,
} from './contracts'

export type MentorPolicyDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false
      readonly outcome: Exclude<MentorOutcome, 'answered'>
      readonly code: string
      readonly response: string
    }

const STAP_ORDER: readonly MentorStapStage[] = [
  'checking',
  'correcting',
  'complementing',
  'segmenting',
]
const SOLUTION_PATTERNS = [
  /(?:a|the)\s+(?:resposta|answer|solu[cç][aã]o|solution)\s+(?:correta\s+)?(?:e|é|is)\b/i,
  /copie\s+e\s+cole/i,
  /copy\s+and\s+paste/i,
  /```/,
]

export function evaluateMentorRequest(request: unknown): MentorPolicyDecision {
  if (!isMentorRequestV1(request)) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'invalid-request',
      response:
        'Nao foi possivel preparar um contexto seguro. Continue pela orientacao visivel na missao.',
    }
  }
  if (
    request.mode === 'hint' &&
    request.learning.hintQuota.used >= request.learning.hintQuota.limit
  ) {
    return {
      allowed: false,
      outcome: 'quota-exhausted',
      code: 'quota-exhausted',
      response:
        'A cota de pistas desta sessao terminou. Retome o criterio da missao e registre uma nova tentativa antes de voltar.',
    }
  }
  if (request.mode === 'hint' && request.interaction.attemptExcerpt === undefined) {
    return {
      allowed: false,
      outcome: 'attempt-required',
      code: 'attempt-required',
      response: 'Antes da pista, mostre o que voce tentou, mesmo que esteja incompleto.',
    }
  }
  if (request.mode === 'hint' && request.interaction.declaredConfusion.trim().length < 4) {
    return {
      allowed: false,
      outcome: 'attempt-required',
      code: 'confusion-required',
      response:
        'Indique o ponto exato em que seu raciocinio travou para eu oferecer uma pista menor.',
    }
  }
  return { allowed: true }
}

export function evaluateMentorResponse(
  response: MentorResponseV1,
  request: MentorRequestV1,
): MentorPolicyDecision {
  if (response.requestId !== request.requestId) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'stale-response',
      response: 'A resposta chegou fora do contexto atual.',
    }
  }
  if (response.pedagogy.stageBefore !== request.learning.stapStage) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'stage-mismatch',
      response: 'A resposta nao corresponde ao estagio pedagogico atual.',
    }
  }
  const before = STAP_ORDER.indexOf(response.pedagogy.stageBefore)
  const after = STAP_ORDER.indexOf(response.pedagogy.stageAfter)
  if (after < before || after - before > 1) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'multiple-transitions',
      response: 'A resposta tentou avancar mais de um estagio pedagogico.',
    }
  }
  if (
    response.pedagogy.solutionWithheld !== true ||
    SOLUTION_PATTERNS.some((pattern) => pattern.test(response.response))
  ) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'solution-revealed',
      response: 'A resposta foi descartada porque poderia substituir a autoria da tentativa.',
    }
  }
  if (
    response.authority.canonicalStateWritten !== false ||
    response.authority.evidenceCreated !== false ||
    response.authority.masteryEvaluated !== false
  ) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'authority-violation',
      response:
        'O mentor nao pode alterar progresso canonico, produzir evidencia ou avaliar dominio.',
    }
  }
  if (
    request.learning.pedagogicalMode === 'non-technical' &&
    /\b(?:function|class|pytest|npm|pnpm|stack trace)\b/i.test(response.response)
  ) {
    return {
      allowed: false,
      outcome: 'unavailable',
      code: 'audience-mismatch',
      response: 'A resposta tecnica nao corresponde a esta trilha.',
    }
  }
  return { allowed: true }
}
