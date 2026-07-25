import {
  HOST_ENGINE_PROTOCOL,
  HOST_ENGINE_PROTOCOL_VERSION,
  type EngineToHostMessage,
  type MissionEngineId,
} from './protocol'

const MAX_PROTOCOL_MESSAGE_BYTES = 65_536

type UnknownRecord = Record<string, unknown>

export type ExpectedMessageContext = {
  readonly sourceWindow: Window
  readonly origin: string
  readonly hostSessionId: string
  readonly missionRunId: string
  readonly engineId: MissionEngineId
}

export type DecodeResult =
  | { readonly ok: true; readonly message: EngineToHostMessage }
  | { readonly ok: false; readonly code: string }

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasString(record: UnknownRecord, key: string): boolean {
  return typeof record[key] === 'string' && (record[key] as string).length > 0
}

function payloadIsValid(type: unknown, payload: unknown): boolean {
  if (!isRecord(payload)) return false
  switch (type) {
    case 'engine.ready':
      return (
        hasString(payload, 'engineVersion') &&
        hasString(payload, 'contentVersion') &&
        Array.isArray(payload.capabilities) &&
        payload.capabilities.every((item) => item === 'mission-state' || item === 'evidence')
      )
    case 'mission.state':
      return (
        typeof payload.revision === 'number' &&
        Number.isInteger(payload.revision) &&
        payload.revision >= 0 &&
        (payload.status === 'running' || payload.status === 'completed' || payload.status === 'failed') &&
        (payload.stage === 'understand' || payload.stage === 'respond' || payload.stage === 'apply') &&
        typeof payload.progress === 'number' &&
        payload.progress >= 0 &&
        payload.progress <= 1
      )
    case 'evidence.submitted':
      return (
        payload.schemaId === 'literacy-evidence' &&
        payload.schemaVersion === 1 &&
        isRecord(payload.subject) &&
        hasString(payload.subject, 'missionId') &&
        hasString(payload.subject, 'unitId') &&
        isRecord(payload.record)
      )
    case 'protocol.ack':
      return hasString(payload, 'acknowledgedMessageId') && typeof payload.accepted === 'boolean'
    default:
      return false
  }
}

export function decodeEngineMessage(
  event: MessageEvent<unknown>,
  expected: ExpectedMessageContext,
): DecodeResult {
  if (event.source !== expected.sourceWindow) return { ok: false, code: 'source-mismatch' }
  if (event.origin !== expected.origin) return { ok: false, code: 'origin-mismatch' }
  let serialized: string
  try {
    serialized = JSON.stringify(event.data)
  } catch {
    return { ok: false, code: 'not-serializable' }
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_PROTOCOL_MESSAGE_BYTES) {
    return { ok: false, code: 'message-too-large' }
  }
  if (!isRecord(event.data)) return { ok: false, code: 'invalid-envelope' }
  const envelope = event.data
  if (envelope.protocol !== HOST_ENGINE_PROTOCOL || envelope.version !== HOST_ENGINE_PROTOCOL_VERSION) {
    return { ok: false, code: 'protocol-mismatch' }
  }
  if (
    envelope.hostSessionId !== expected.hostSessionId ||
    envelope.missionRunId !== expected.missionRunId ||
    envelope.engineId !== expected.engineId
  ) {
    return { ok: false, code: 'correlation-mismatch' }
  }
  if (!hasString(envelope, 'messageId') || !hasString(envelope, 'sentAt')) {
    return { ok: false, code: 'invalid-envelope' }
  }
  if (Number.isNaN(Date.parse(envelope.sentAt as string))) {
    return { ok: false, code: 'invalid-timestamp' }
  }
  if (!payloadIsValid(envelope.type, envelope.payload)) {
    return { ok: false, code: 'invalid-payload' }
  }
  return { ok: true, message: envelope as EngineToHostMessage }
}
