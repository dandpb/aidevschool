import { describe, expect, it } from 'vitest'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { buildMentorContext } from './context'
import { isMentorRequestV1 } from './contracts'

function mission() {
  const value = missionCatalog.missions.find((item) => item.id === 'l02')
  if (value === undefined) throw new Error('Expected l02')
  return value
}

describe('mentor context projection', () => {
  it('includes only bounded pedagogical context and explicit learner text', () => {
    const request = buildMentorContext({
      requestId: 'mentor-request-1',
      mode: 'hint',
      mission: mission(),
      currentStage: 'respond',
      question: '  Preciso de uma pista.  ',
      declaredConfusion: 'Nao sei qual criterio comparar.',
      attemptExcerpt: 'Escolhi a resposta A porque parece completa.',
      recentTurns: Array.from({ length: 9 }, (_, index) => ({
        role: index % 2 === 0 ? 'learner' as const : 'mentor' as const,
        content: `turn-${index}`,
      })),
      learnerLevel: learnerSnapshot.profile,
      stapStage: 'checking',
      stalls: 2,
      hintQuota: { used: 1, limit: 5 },
      concepts: ['verificacao', 'fontes'],
    })

    expect(isMentorRequestV1(request)).toBe(true)
    expect(request.interaction.question).toBe('Preciso de uma pista.')
    expect(request.interaction.recentTurns).toHaveLength(6)
    expect(request.capabilities).toEqual([])
    expect(request.retention).toBe('none')
    expect(request.mission.concepts).toEqual(['verificacao', 'fontes'])

    const serialized = JSON.stringify(request)
    for (const forbidden of [
      'learnerId',
      'filesystem',
      'terminalHistory',
      'evidenceRecord',
      'verifierData',
      'checkpoint',
      'canonicalPath',
    ]) expect(serialized).not.toContain(forbidden)
  })

  it('truncates every free-form input at its declared boundary', () => {
    const request = buildMentorContext({
      requestId: `request-${'x'.repeat(200)}`,
      mode: 'question',
      mission: mission(),
      currentStage: 'understand',
      question: 'q'.repeat(900),
      declaredConfusion: 'c'.repeat(500),
      attemptExcerpt: 'a'.repeat(1_500),
      learnerLevel: learnerSnapshot.profile,
      stapStage: 'checking',
      stalls: 99,
      hintQuota: { used: 0, limit: 5 },
    })

    expect(request.requestId).toHaveLength(100)
    expect(request.interaction.question).toHaveLength(500)
    expect(request.interaction.declaredConfusion).toHaveLength(300)
    expect(request.interaction.attemptExcerpt).toHaveLength(1_000)
    expect(request.learning.stalls).toBe(20)
  })
})
