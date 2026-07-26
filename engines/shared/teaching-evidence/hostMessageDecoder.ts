export const HOST_ENGINE_PROTOCOL = "aidevschool.host-engine" as const
export const HOST_ENGINE_PROTOCOL_VERSION = "1.0" as const

export type UnknownRecord = Readonly<Record<string, unknown>>

export type HostMessageEnvelope = UnknownRecord &
  Readonly<{
    type: unknown
    messageId: string
    hostSessionId: string
    missionRunId: string
    payload: UnknownRecord
  }>

export type HostMessageContext = Readonly<{
  engineId: string
  expectedOrigin: string
  expectedSource: unknown
}>

type HostMessageEvent = Readonly<{
  data: unknown
  origin: string
  source: unknown
}>

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isHostMessageEnvelope(value: unknown, engineId: string): value is HostMessageEnvelope {
  return (
    isRecord(value)
    && value["protocol"] === HOST_ENGINE_PROTOCOL
    && value["version"] === HOST_ENGINE_PROTOCOL_VERSION
    && value["engineId"] === engineId
    && typeof value["messageId"] === "string"
    && typeof value["hostSessionId"] === "string"
    && typeof value["missionRunId"] === "string"
    && isRecord(value["payload"])
  )
}

export function decodeHostMessage(
  event: HostMessageEvent,
  context: HostMessageContext,
): HostMessageEnvelope | null {
  if (event.source !== context.expectedSource || event.origin !== context.expectedOrigin) return null
  return isHostMessageEnvelope(event.data, context.engineId) ? event.data : null
}
