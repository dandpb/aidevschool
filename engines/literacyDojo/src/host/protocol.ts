export const HOST_ENGINE_PROTOCOL = "aidevschool.host-engine" as const;
export const HOST_ENGINE_PROTOCOL_VERSION = "1.0" as const;

export type ProtocolEnvelope<TType extends string, TPayload> = {
  protocol: typeof HOST_ENGINE_PROTOCOL;
  version: typeof HOST_ENGINE_PROTOCOL_VERSION;
  type: TType;
  messageId: string;
  hostSessionId: string;
  missionRunId: string;
  engineId: "literacyDojo";
  sentAt: string;
  payload: TPayload;
};

export type HostHelloMessage = ProtocolEnvelope<
  "host.hello",
  { missionId: string; protocolVersion: "1.0" }
>;

export type MissionLaunchMessage = ProtocolEnvelope<
  "mission.launch",
  { missionId: string; missionVersion: number; mode: "initial"; locale: "pt-BR" }
>;

export type ProtocolAckMessage = ProtocolEnvelope<
  "protocol.ack",
  { acknowledgedMessageId: string; accepted: boolean; code?: string }
>;

export type HostToEngineMessage = HostHelloMessage | MissionLaunchMessage | ProtocolAckMessage;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasString(record: UnknownRecord, key: string): boolean {
  return typeof record[key] === "string" && (record[key] as string).length > 0;
}

function validPayload(type: unknown, payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if (type === "host.hello") {
    return hasString(payload, "missionId") && payload.protocolVersion === "1.0";
  }
  if (type === "mission.launch") {
    return (
      hasString(payload, "missionId") &&
      typeof payload.missionVersion === "number" &&
      Number.isInteger(payload.missionVersion) &&
      payload.mode === "initial" &&
      payload.locale === "pt-BR"
    );
  }
  return (
    type === "protocol.ack" &&
    hasString(payload, "acknowledgedMessageId") &&
    typeof payload.accepted === "boolean"
  );
}

export function expectedHostOrigin(): string | null {
  const queryOrigin = new URLSearchParams(window.location.search).get("hostOrigin");
  if (!queryOrigin || !document.referrer) return null;
  try {
    const normalized = new URL(queryOrigin).origin;
    return new URL(document.referrer).origin === normalized ? normalized : null;
  } catch {
    return null;
  }
}

export function decodeHostMessage(
  event: MessageEvent<unknown>,
  expectedOrigin: string,
): HostToEngineMessage | null {
  if (event.source !== window.parent || event.origin !== expectedOrigin || !isRecord(event.data)) {
    return null;
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(event.data);
  } catch {
    return null;
  }
  if (new TextEncoder().encode(serialized).byteLength > 65_536) return null;
  const envelope = event.data;
  if (
    envelope.protocol !== HOST_ENGINE_PROTOCOL ||
    envelope.version !== HOST_ENGINE_PROTOCOL_VERSION ||
    envelope.engineId !== "literacyDojo" ||
    !hasString(envelope, "messageId") ||
    !hasString(envelope, "hostSessionId") ||
    !hasString(envelope, "missionRunId") ||
    !hasString(envelope, "sentAt") ||
    Number.isNaN(Date.parse(envelope.sentAt as string)) ||
    !validPayload(envelope.type, envelope.payload)
  ) {
    return null;
  }
  return envelope as HostToEngineMessage;
}

export function createEngineEnvelope<TType extends string, TPayload>(input: {
  type: TType;
  payload: TPayload;
  messageId: string;
  hostSessionId: string;
  missionRunId: string;
}): ProtocolEnvelope<TType, TPayload> {
  return {
    protocol: HOST_ENGINE_PROTOCOL,
    version: HOST_ENGINE_PROTOCOL_VERSION,
    type: input.type,
    messageId: input.messageId,
    hostSessionId: input.hostSessionId,
    missionRunId: input.missionRunId,
    engineId: "literacyDojo",
    sentAt: new Date().toISOString(),
    payload: input.payload,
  };
}
