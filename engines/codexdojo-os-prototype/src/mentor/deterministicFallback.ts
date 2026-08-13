import { NO_MENTOR_AUTHORITY, type MentorRequestV1, type MentorResponseV1 } from './contracts'
import type { MentorPolicyDecision } from './policy'

type HelpStep = (request: MentorRequestV1) => string

const HELP_LADDER: readonly HelpStep[] = [
  (request) => `Vamos reformular: em "${request.mission.objective}", qual decisao a missao pede que voce tome agora?`,
  (request) => `Recupere o conceito "${request.mission.concepts[0]}". Que criterio dele se conecta ao ponto "${request.interaction.declaredConfusion || 'que ainda parece incerto'}"?`,
  (request) => request.learning.pedagogicalMode === 'developer'
    ? 'Pense no sistema como uma fila de sinais: qual entrada muda o estado, e qual saida permitiria observar essa mudanca?'
    : 'Pense em revisar uma mensagem importante antes de envia-la: o que voce conferiria primeiro, e por que?',
  (request) => `Pista parcial: compare sua tentativa com uma unica exigencia do objetivo — "${request.mission.objective}". Qual palavra indica o criterio que ainda falta observar?`,
  (request) => request.learning.pedagogicalMode === 'developer'
    ? 'Use um caso paralelo menor: uma entrada, uma mudanca de estado e uma saida observavel. Qual dessas tres partes voce consegue prever sem resolver a missao atual?'
    : 'Use um caso parecido, mas diferente: antes de confiar em uma recomendacao cotidiana, qual sinal voce procuraria para poder conferi-la?',
]

function response(
  request: MentorRequestV1,
  outcome: MentorResponseV1['outcome'],
  text: string,
): MentorResponseV1 {
  return {
    schemaVersion: 1,
    requestId: request.requestId,
    outcome,
    response: text,
    pedagogy: {
      stageBefore: request.learning.stapStage,
      stageAfter: request.learning.stapStage,
      solutionWithheld: true,
    },
    authority: NO_MENTOR_AUTHORITY,
  }
}

export function policyResponse(
  request: MentorRequestV1,
  decision: Exclude<MentorPolicyDecision, { readonly allowed: true }>,
): MentorResponseV1 {
  return response(request, decision.outcome, decision.response)
}

export function answerWithDeterministicFallback(request: MentorRequestV1): MentorResponseV1 {
  const priorMentorTurns = request.interaction.recentTurns.filter((turn) => turn.role === 'mentor').length
  const ladderIndex = Math.min(priorMentorTurns, HELP_LADDER.length - 1)
  const help = HELP_LADDER[ladderIndex] ?? HELP_LADDER[0]
  if (help === undefined) return response(request, 'unavailable', 'Retome o objetivo da missao e registre uma nova tentativa.')
  return response(request, 'answered', help(request))
}
