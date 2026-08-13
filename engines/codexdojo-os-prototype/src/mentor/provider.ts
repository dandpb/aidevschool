import { sameOriginPath } from '../sameOrigin'
import type { MentorRequestV1 } from './contracts'

export interface MentorProvider {
  readonly id: string
  readonly available: boolean
  answer(request: MentorRequestV1, options: { readonly signal: AbortSignal }): Promise<unknown>
}

export class UnavailableMentorProvider implements MentorProvider {
  readonly id = 'deterministic-only'
  readonly available = false

  async answer(
    _request: MentorRequestV1,
    _options: { readonly signal: AbortSignal },
  ): Promise<never> {
    throw new Error('mentor-provider-unavailable')
  }
}

export class SameOriginMentorProvider implements MentorProvider {
  readonly id = 'same-origin-mentor'
  readonly available = true
  private readonly endpoint: string

  constructor(endpoint: string) {
    this.endpoint = sameOriginPath(endpoint, 'Mentor endpoint must be same-origin')
  }

  async answer(
    request: MentorRequestV1,
    options: { readonly signal: AbortSignal },
  ): Promise<unknown> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal: options.signal,
    })
    if (!response.ok) throw new Error(`mentor-provider-http-${response.status}`)
    return response.json() as Promise<unknown>
  }
}

export function createMentorProvider(endpoint: unknown): MentorProvider {
  if (typeof endpoint !== 'string') return new UnavailableMentorProvider()
  try {
    return new SameOriginMentorProvider(endpoint)
  } catch {
    return new UnavailableMentorProvider()
  }
}
