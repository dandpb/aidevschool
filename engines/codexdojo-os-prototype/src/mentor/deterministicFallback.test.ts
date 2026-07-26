import { describe, expect, it } from 'vitest'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { buildMentorContext } from './context'
import { answerWithDeterministicFallback } from './deterministicFallback'

describe('deterministic mentor fallback', () => {
  it('escalates through bounded help without changing authority or revealing an answer', () => {
    const mission = missionCatalog.missions[0]
    if (mission === undefined) throw new Error('Expected a mission')
    const base = {
      requestId: 'fallback',
      mode: 'hint' as const,
      mission,
      currentStage: 'respond' as const,
      question: 'Preciso de uma pista.',
      declaredConfusion: 'Travei ao comparar os criterios.',
      attemptExcerpt: 'Comparei as duas opcoes.',
      learnerLevel: learnerSnapshot.profile,
      stapStage: 'checking' as const,
      stalls: 0,
      hintQuota: { used: 0, limit: 5 },
    }
    const first = answerWithDeterministicFallback(buildMentorContext(base))
    const second = answerWithDeterministicFallback(buildMentorContext({
      ...base,
      recentTurns: [{ role: 'mentor', content: first.response }],
    }))

    expect(second.response).not.toBe(first.response)
    expect(first.pedagogy).toEqual({ stageBefore: 'checking', stageAfter: 'checking', solutionWithheld: true })
    expect(first.authority).toEqual({ canonicalStateWritten: false, evidenceCreated: false, masteryEvaluated: false })
    expect(`${first.response} ${second.response}`).not.toMatch(/resposta correta|copie e cole|```/i)
  })
})
