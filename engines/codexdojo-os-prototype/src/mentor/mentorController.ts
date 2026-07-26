import { decodeMentorResponse, type MentorRequestV1, type MentorResponseV1 } from './contracts'
import { answerWithDeterministicFallback, policyResponse } from './deterministicFallback'
import { evaluateMentorRequest, evaluateMentorResponse } from './policy'
import type { MentorProvider } from './provider'

export type MentorAnswerSource = 'provider' | 'fallback' | 'policy'

export type MentorControllerResult = {
  readonly response: MentorResponseV1
  readonly source: MentorAnswerSource
  readonly consumeHintQuota: boolean
  readonly advancePedagogy: boolean
  readonly fallbackReason?: string
}

export type MentorControllerState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'requesting'; readonly requestId: string }
  | { readonly kind: 'answered'; readonly result: MentorControllerResult }

export type MentorControllerOptions = {
  readonly provider: MentorProvider
  readonly onState?: (state: MentorControllerState) => void
  readonly timeoutMs?: number
}

type ActiveRequest = {
  readonly token: number
  readonly abort: AbortController
}

export class MentorController {
  private active: ActiveRequest | undefined
  private token = 0
  private readonly timeoutMs: number

  constructor(private readonly options: MentorControllerOptions) {
    this.timeoutMs = options.timeoutMs ?? 8_000
  }

  private emit(state: MentorControllerState): void {
    this.options.onState?.(state)
  }

  private cancelActive(emitIdle: boolean): void {
    this.token += 1
    this.active?.abort.abort()
    this.active = undefined
    if (emitIdle) this.emit({ kind: 'idle' })
  }

  cancel(): void {
    this.cancelActive(true)
  }

  contextChanged(): void {
    this.cancelActive(true)
  }

  close(): void {
    this.cancelActive(true)
  }

  private fallback(request: MentorRequestV1, reason: string): MentorControllerResult {
    return {
      response: answerWithDeterministicFallback(request),
      source: 'fallback',
      consumeHintQuota: false,
      advancePedagogy: false,
      fallbackReason: reason,
    }
  }

  private async providerAnswer(request: MentorRequestV1, signal: AbortSignal): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        this.options.provider.answer(request, { signal }),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('mentor-provider-timeout')), this.timeoutMs)
        }),
      ])
    } finally {
      if (timer !== undefined) clearTimeout(timer)
    }
  }

  async submit(request: MentorRequestV1): Promise<MentorControllerResult | undefined> {
    this.cancelActive(false)
    const token = this.token
    const abort = new AbortController()
    this.active = { token, abort }
    this.emit({ kind: 'requesting', requestId: request.requestId })

    const requestPolicy = evaluateMentorRequest(request)
    if (!requestPolicy.allowed) {
      const result: MentorControllerResult = {
        response: policyResponse(request, requestPolicy),
        source: 'policy',
        consumeHintQuota: false,
        advancePedagogy: false,
      }
      if (this.active?.token !== token) return undefined
      this.active = undefined
      this.emit({ kind: 'answered', result })
      return result
    }

    if (!this.options.provider.available) {
      const result = this.fallback(request, 'provider-unavailable')
      if (this.active?.token !== token) return undefined
      this.active = undefined
      this.emit({ kind: 'answered', result })
      return result
    }

    try {
      const raw = await this.providerAnswer(request, abort.signal)
      if (this.active?.token !== token) return undefined
      const response = decodeMentorResponse(raw, request.requestId)
      const responsePolicy = evaluateMentorResponse(response, request)
      if (!responsePolicy.allowed) {
        const result = this.fallback(request, responsePolicy.code)
        this.active = undefined
        this.emit({ kind: 'answered', result })
        return result
      }
      const result: MentorControllerResult = {
        response,
        source: 'provider',
        consumeHintQuota: request.mode === 'hint' && response.outcome === 'answered',
        advancePedagogy: response.pedagogy.stageAfter !== response.pedagogy.stageBefore,
      }
      this.active = undefined
      this.emit({ kind: 'answered', result })
      return result
    } catch (error) {
      if (this.active?.token !== token) return undefined
      abort.abort()
      const reason = error instanceof Error ? error.message : 'mentor-provider-failed'
      const result = this.fallback(request, reason)
      this.active = undefined
      this.emit({ kind: 'answered', result })
      return result
    }
  }
}
