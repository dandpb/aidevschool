import { describe, expect, it } from 'vitest'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { buildMentorContext } from './context'
import { type MentorRequestV1, type MentorResponseV1, NO_MENTOR_AUTHORITY } from './contracts'
import { evaluateMentorRequest, evaluateMentorResponse } from './policy'

function request(
  overrides: Partial<MentorRequestV1['interaction']> = {},
  quota = { used: 0, limit: 5 },
): MentorRequestV1 {
  const mission = missionCatalog.missions[0]
  if (mission === undefined) throw new Error('Expected a mission')
  return buildMentorContext({
    requestId: 'policy-request',
    mode: 'hint',
    mission,
    currentStage: 'respond',
    question: overrides.question ?? 'Preciso de uma pista.',
    declaredConfusion: overrides.declaredConfusion,
    attemptExcerpt: overrides.attemptExcerpt,
    learnerLevel: learnerSnapshot.profile,
    stapStage: 'checking',
    stalls: 0,
    hintQuota: quota,
  })
}

function response(
  input: MentorRequestV1,
  overrides: Partial<MentorResponseV1> = {},
): MentorResponseV1 {
  return {
    schemaVersion: 1,
    requestId: input.requestId,
    outcome: 'answered',
    response: 'Que criterio da missao sua tentativa ja consegue observar?',
    pedagogy: { stageBefore: 'checking', stageAfter: 'correcting', solutionWithheld: true },
    authority: NO_MENTOR_AUTHORITY,
    ...overrides,
  }
}

describe('mentor policy', () => {
  it('requires an attempt and exact confusion before a hint', () => {
    expect(evaluateMentorRequest(request())).toMatchObject({
      allowed: false,
      code: 'attempt-required',
    })
    expect(
      evaluateMentorRequest(request({ attemptExcerpt: 'Tentei comparar A e B.' })),
    ).toMatchObject({
      allowed: false,
      code: 'confusion-required',
    })
    expect(
      evaluateMentorRequest(
        request({
          attemptExcerpt: 'Tentei comparar A e B.',
          declaredConfusion: 'Nao sei avaliar a fonte.',
        }),
      ),
    ).toEqual({ allowed: true })
  })

  it('stops hints when quota is exhausted', () => {
    expect(
      evaluateMentorRequest(
        request(
          {
            attemptExcerpt: 'Minha tentativa.',
            declaredConfusion: 'Travei no criterio.',
          },
          { used: 5, limit: 5 },
        ),
      ),
    ).toMatchObject({ allowed: false, code: 'quota-exhausted' })
  })

  it('rejects multiple pedagogical transitions and ready-made solutions', () => {
    const input = request({
      attemptExcerpt: 'Minha tentativa.',
      declaredConfusion: 'Travei no criterio.',
    })
    expect(
      evaluateMentorResponse(
        response(input, {
          pedagogy: { stageBefore: 'checking', stageAfter: 'segmenting', solutionWithheld: true },
        }),
        input,
      ),
    ).toMatchObject({ allowed: false, code: 'multiple-transitions' })
    expect(
      evaluateMentorResponse(
        response(input, {
          response: 'A resposta correta e B. Copie e cole este resultado.',
        }),
        input,
      ),
    ).toMatchObject({ allowed: false, code: 'solution-revealed' })
  })

  it('accepts one bounded Socratic transition without authority', () => {
    const input = request({
      attemptExcerpt: 'Minha tentativa.',
      declaredConfusion: 'Travei no criterio.',
    })
    expect(evaluateMentorResponse(response(input), input)).toEqual({ allowed: true })
  })
})
