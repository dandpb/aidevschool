export const HOST_ENGINE_PROTOCOL = "aidevschool.host-engine" as const
export const HOST_ENGINE_PROTOCOL_VERSION = "1.0" as const

type MissionStage = "understand" | "respond" | "apply"
type MissionStatus = "running" | "completed" | "failed"
type UnknownRecord = Readonly<Record<string, unknown>>

export type RendererPreference = "auto" | "webgl" | "accessible"
export type ActiveRenderer = "webgl" | "canvas2d" | "dom" | "none"
export type RendererStatus = "probing" | "initializing" | "ready" | "degraded" | "failed"
export type RendererFailureReason =
  | "unsupported"
  | "creation-failed"
  | "context-lost"
  | "restore-failed"
  | "load-timeout"

export type TeachingGameLaunch = {
  readonly locale: "pt-BR"
  readonly reducedMotion: boolean
  readonly rendererPreference: RendererPreference
}

export type TeachingGameRendererState = {
  readonly requested: RendererPreference
  readonly active: ActiveRenderer
  readonly status: RendererStatus
  readonly reason?: RendererFailureReason
}

type Correlation = {
  readonly hostSessionId: string
  readonly missionRunId: string
}

export type TeachingGameMissionState = {
  readonly status: MissionStatus
  readonly stage: MissionStage
  readonly progress: number
  readonly nextMissionId?: string
}

export type TeachingGameHostAdapterOptions = {
  /** Must match the mission runtime's engineId in the host catalog (e.g. "voxelDojo"). */
  readonly engineId: string
  readonly missionId: string
  readonly missionVersion: number
  readonly unitId: string
  readonly engineVersion: string
  readonly contentVersion: string
}

type EvidenceForwarder = (record: UnknownRecord) => boolean
let evidenceForwarder: EvidenceForwarder | null = null

export function setMissionEvidenceForwarder(forwarder: EvidenceForwarder | null): void {
  evidenceForwarder = forwarder
}

export function forwardMissionEvidence(record: UnknownRecord): boolean {
  return evidenceForwarder?.(record) ?? false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function uniqueId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function resolveHostOrigin(): string | null {
  if (typeof window === "undefined" || typeof document === "undefined" || window.parent === window) {
    return null
  }
  const candidate = new URLSearchParams(window.location.search).get("hostOrigin")
  if (candidate === null || document.referrer === "") return null
  try {
    const configured = new URL(candidate)
    const referrer = new URL(document.referrer)
    if (
      (configured.protocol !== "http:" && configured.protocol !== "https:")
      || configured.origin !== referrer.origin
    ) {
      return null
    }
    return configured.origin
  } catch {
    return null
  }
}

export class TeachingGameHostAdapter {
  private readonly hostOrigin = resolveHostOrigin()
  private correlation: Correlation | null = null
  private revision = 0
  private eventSequence = 0
  private rendererRevision = 0
  private completionEventSent = false
  private onLaunch: ((launch: TeachingGameLaunch) => void | Promise<void>) | null = null
  private onRendererRetry: ((preference: RendererPreference) => void | Promise<void>) | null = null

  constructor(private readonly options: TeachingGameHostAdapterOptions) {}

  get hosted(): boolean {
    return this.hostOrigin !== null
  }

  start(
    onLaunch: (launch: TeachingGameLaunch) => void | Promise<void>,
    onRendererRetry?: (preference: RendererPreference) => void | Promise<void>,
  ): () => void {
    if (this.hostOrigin === null) return () => {}
    this.onLaunch = onLaunch
    this.onRendererRetry = onRendererRetry ?? null
    setMissionEvidenceForwarder(this.submitEvidence)
    window.addEventListener("message", this.handleMessage)
    return () => {
      window.removeEventListener("message", this.handleMessage)
      if (evidenceForwarder === this.submitEvidence) setMissionEvidenceForwarder(null)
      this.correlation = null
      this.onLaunch = null
      this.onRendererRetry = null
    }
  }

  publishState(state: TeachingGameMissionState): void {
    if (state.progress < 0 || state.progress > 1) return
    if (state.status === "completed" && !this.completionEventSent) {
      this.completionEventSent = true
      this.publishEvent("mission.completed", { result: "completed" })
    }
    this.revision += 1
    this.post("mission.state", { revision: this.revision, ...state })
  }

  publishRendererState(state: TeachingGameRendererState): void {
    this.rendererRevision += 1
    this.post("renderer.state", { revision: this.rendererRevision, ...state })
  }

  private submitEvidence = (record: UnknownRecord): boolean => {
    if (this.correlation === null || record["unit_id"] !== this.options.unitId) return false
    this.publishEvent("structured_attempt.submitted")
    if (record["pass"] === true) this.publishEvent("structured_attempt.passed")
    this.post("evidence.submitted", {
      schemaId: "teaching-game-evidence",
      schemaVersion: 1,
      subject: { missionId: this.options.missionId, unitId: this.options.unitId },
      record,
    })
    return true
  }

  private publishEvent(
    name:
      | "mission.started"
      | "mission.completed"
      | "structured_attempt.submitted"
      | "structured_attempt.passed",
    dimensions: UnknownRecord = {},
  ): void {
    this.eventSequence += 1
    this.post("mission.event", { sequence: this.eventSequence, name, dimensions })
  }

  private post(type: string, payload: UnknownRecord): void {
    if (this.hostOrigin === null || this.correlation === null) return
    window.parent.postMessage(
      {
        protocol: HOST_ENGINE_PROTOCOL,
        version: HOST_ENGINE_PROTOCOL_VERSION,
        type,
        messageId: uniqueId(),
        hostSessionId: this.correlation.hostSessionId,
        missionRunId: this.correlation.missionRunId,
        engineId: this.options.engineId,
        sentAt: new Date().toISOString(),
        payload,
      },
      this.hostOrigin,
    )
  }

  private envelope(event: MessageEvent<unknown>): Record<string, unknown> | null {
    if (
      this.hostOrigin === null
      || event.source !== window.parent
      || event.origin !== this.hostOrigin
      || !isRecord(event.data)
      || event.data["protocol"] !== HOST_ENGINE_PROTOCOL
      || event.data["version"] !== HOST_ENGINE_PROTOCOL_VERSION
      || event.data["engineId"] !== this.options.engineId
      || typeof event.data["messageId"] !== "string"
      || typeof event.data["hostSessionId"] !== "string"
      || typeof event.data["missionRunId"] !== "string"
      || !isRecord(event.data["payload"])
    ) {
      return null
    }
    return event.data
  }

  private acknowledge(messageId: string, accepted: boolean, code?: string): void {
    this.post("protocol.ack", {
      acknowledgedMessageId: messageId,
      accepted,
      ...(code === undefined ? {} : { code }),
    })
  }

  private handleMessage = (event: MessageEvent<unknown>): void => {
    const message = this.envelope(event)
    if (message === null) return
    const payload = message["payload"] as Record<string, unknown>
    if (message["type"] === "host.hello") {
      if (
        payload["missionId"] !== this.options.missionId
        || payload["protocolVersion"] !== HOST_ENGINE_PROTOCOL_VERSION
      ) {
        return
      }
      this.correlation = {
        hostSessionId: message["hostSessionId"] as string,
        missionRunId: message["missionRunId"] as string,
      }
      this.eventSequence = 0
      this.rendererRevision = 0
      this.completionEventSent = false
      this.post("engine.ready", {
        engineVersion: this.options.engineVersion,
        contentVersion: this.options.contentVersion,
        capabilities: ["mission-state", "evidence", "mission-events", "renderer-state"],
      })
      return
    }
    if (
      this.correlation !== null
      && message["hostSessionId"] === this.correlation.hostSessionId
      && message["missionRunId"] === this.correlation.missionRunId
      && message["type"] === "renderer.retry"
      && this.onRendererRetry !== null
    ) {
      const preference = payload["rendererPreference"]
      if (preference !== "auto" && preference !== "webgl" && preference !== "accessible") return
      void Promise.resolve(this.onRendererRetry(preference))
      return
    }
    if (
      this.correlation === null
      || message["hostSessionId"] !== this.correlation.hostSessionId
      || message["missionRunId"] !== this.correlation.missionRunId
      || message["type"] !== "mission.launch"
      || this.onLaunch === null
    ) {
      return
    }
    if (
      payload["missionId"] !== this.options.missionId
      || payload["missionVersion"] !== this.options.missionVersion
      || payload["locale"] !== "pt-BR"
      || typeof payload["reducedMotion"] !== "boolean"
      || (payload["rendererPreference"] !== "auto"
        && payload["rendererPreference"] !== "webgl"
        && payload["rendererPreference"] !== "accessible")
    ) {
      this.acknowledge(message["messageId"] as string, false, "mission-unavailable")
      return
    }
    void Promise.resolve(this.onLaunch({
      locale: "pt-BR",
      reducedMotion: payload["reducedMotion"] as boolean,
      rendererPreference: payload["rendererPreference"] as RendererPreference,
    })).then(
      () => {
        this.acknowledge(message["messageId"] as string, true)
        this.publishEvent("mission.started", { mode: payload["mode"] as string })
      },
      () => this.acknowledge(message["messageId"] as string, false, "mission-unavailable"),
    )
  }
}
