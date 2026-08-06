import { describe, expect, it, vi } from 'vitest'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { buildMentorContext } from './context'
import { type MentorRequestV1, type MentorResponseV1, NO_MENTOR_AUTHORITY } from './contracts'
import { MentorController, type MentorControllerState } from './mentorController'
import type { MentorProvider } from './provider'

function request(id: string, mode: MentorRequestV1['mode'] = 'question'): MentorRequestV1 {
  const mission = missionCatalog.missions[0]
  if (mission === undefined) throw new Error('Expected a mission')
  return buildMentorContext({
    requestId: id,
    mode,
    mission,
    currentStage: 'respond',
    question: mode === 'hint' ? 'Preciso de uma pista.' : 'Ajude-me a pensar.',
    declaredConfusion: mode === 'hint' ? 'Travei ao comparar os criterios.' : '',
    attemptExcerpt: mode === 'hint' ? 'Comparei as duas opcoes e escolhi A.' : undefined,
    learnerLevel: learnerSnapshot.profile,
    stapStage: 'checking',
    stalls: 0,
    hintQuota: { used: 0, limit: 5 },
  })
}

function answer(
  input: MentorRequestV1,
  text = 'Qual criterio voce consegue observar primeiro?',
): MentorResponseV1 {
  return {
    schemaVersion: 1,
    requestId: input.requestId,
    outcome: 'answered',
    response: text,
    pedagogy: { stageBefore: 'checking', stageAfter: 'correcting', solutionWithheld: true },
    authority: NO_MENTOR_AUTHORITY,
  }
}

class DeferredProvider implements MentorProvider {
  readonly id = 'deferred'
  readonly available = true
  readonly pending: Array<{
    request: MentorRequestV1
    resolve: (value: unknown) => void
    reject: (reason: unknown) => void
  }> = []

  answer(input: MentorRequestV1, options: { readonly signal: AbortSignal }): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.pending.push({ request: input, resolve, reject })
      options.signal.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      )
    })
  }
}

describe('MentorController', () => {
  it('uses a provider response as the primary coach and consumes hint quota only on success', async () => {
    const input = request('provider-hint', 'hint')
    const provider: MentorProvider = {
      id: 'provider',
      available: true,
      async answer() {
        return answer(input)
      },
    }
    const controller = new MentorController({ provider })

    await expect(controller.submit(input)).resolves.toMatchObject({
      source: 'provider',
      consumeHintQuota: true,
      advancePedagogy: true,
    })
  })

  it('cancels the previous request when a new request starts', async () => {
    const provider = new DeferredProvider()
    const controller = new MentorController({ provider })
    const first = controller.submit(request('first'))
    const second = controller.submit(request('second'))
    provider.pending[1]?.resolve(answer(request('second')))

    await expect(first).resolves.toBeUndefined()
    await expect(second).resolves.toMatchObject({ source: 'provider' })
  })

  it('ignores a stale provider result even when the adapter ignores abort', async () => {
    const resolvers: Array<(value: unknown) => void> = []
    const provider: MentorProvider = {
      id: 'abort-ignoring',
      available: true,
      answer() {
        return new Promise((resolve) => resolvers.push(resolve))
      },
    }
    const states: MentorControllerState[] = []
    const controller = new MentorController({ provider, onState: (state) => states.push(state) })
    const firstInput = request('stale-first')
    const secondInput = request('current-second')
    const first = controller.submit(firstInput)
    const second = controller.submit(secondInput)
    resolvers[1]?.(answer(secondInput))
    await second
    const answeredAfterSecond = states.filter((state) => state.kind === 'answered').length
    resolvers[0]?.(answer(firstInput))

    await expect(first).resolves.toBeUndefined()
    expect(states.filter((state) => state.kind === 'answered')).toHaveLength(answeredAfterSecond)
  })

  it('falls back on timeout without consuming quota or advancing pedagogy', async () => {
    const provider: MentorProvider = {
      id: 'never',
      available: true,
      answer: () => new Promise(() => undefined),
    }
    const controller = new MentorController({ provider, timeoutMs: 5 })

    await expect(controller.submit(request('timeout', 'hint'))).resolves.toMatchObject({
      source: 'fallback',
      consumeHintQuota: false,
      advancePedagogy: false,
      fallbackReason: 'mentor-provider-timeout',
    })
  })

  it('discards malformed or policy-violating provider output and keeps deterministic guidance', async () => {
    const input = request('unsafe')
    const malformed: MentorProvider = {
      id: 'malformed',
      available: true,
      async answer() {
        return { response: 'missing contract' }
      },
    }
    await expect(
      new MentorController({ provider: malformed }).submit(input),
    ).resolves.toMatchObject({
      source: 'fallback',
      fallbackReason: 'mentor-response-schema',
    })

    const unsafe: MentorProvider = {
      id: 'unsafe',
      available: true,
      async answer() {
        return answer(input, 'A solucao e copiar e colar este bloco: ```ts const answer = true ```')
      },
    }
    await expect(new MentorController({ provider: unsafe }).submit(input)).resolves.toMatchObject({
      source: 'fallback',
      fallbackReason: 'solution-revealed',
    })
  })

  it('cancels in-flight work on context change and close', async () => {
    const provider = new DeferredProvider()
    const states: MentorControllerState[] = []
    const controller = new MentorController({ provider, onState: (state) => states.push(state) })
    const contextRequest = controller.submit(request('context-change'))
    controller.contextChanged()
    await expect(contextRequest).resolves.toBeUndefined()
    expect(states.at(-1)).toEqual({ kind: 'idle' })

    const closeRequest = controller.submit(request('close'))
    controller.close()
    await expect(closeRequest).resolves.toBeUndefined()
    expect(states.at(-1)).toEqual({ kind: 'idle' })
  })

  it('returns local policy guidance before calling the provider', async () => {
    const provider: MentorProvider = { id: 'spy', available: true, answer: vi.fn() }
    const blocked = {
      ...request('blocked', 'hint'),
      interaction: { ...request('blocked', 'hint').interaction, attemptExcerpt: undefined },
    }
    const controller = new MentorController({ provider })

    await expect(controller.submit(blocked)).resolves.toMatchObject({
      source: 'policy',
      response: { outcome: 'attempt-required' },
    })
    expect(provider.answer).not.toHaveBeenCalled()
  })
})
