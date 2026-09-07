import { emitFunnelEvent } from "./funnelTelemetry"
import { forwardMissionEvidence } from "./hostProtocol"
import { isRecord } from "./hostMessageDecoder"

export type EvidenceChannel = "game" | "pixelquest" | "voxeldojo"

export const TEACHING_EVIDENCE_MESSAGE = "aidevschool:teaching-evidence"
let evidenceParentOrigin: string | null = null

export function configureEvidenceParentOrigin(candidate: string | undefined): void {
  if (candidate === undefined || candidate.trim() === "") {
    evidenceParentOrigin = null
    return
  }
  try {
    const url = new URL(candidate)
    evidenceParentOrigin = url.protocol === "http:" || url.protocol === "https:" ? url.origin : null
  } catch {
    evidenceParentOrigin = null
  }
}

export function dualEmit<T extends object>(record: T, channel: EvidenceChannel = "game"): T {
  const forwarded = isRecord(record) && forwardMissionEvidence(record)
  let postedToHost = false
  if (typeof window !== "undefined") {
    writeWindowChannel(window, record, channel)
    if (!forwarded) {
      postedToHost = forwardToEmbeddingHost(record)
    }
  }
  emitChannelFunnel(record, channel, forwarded || postedToHost)
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}

/**
 * AID-987/T1b anonymous funnel telemetry (AID-913 pattern): when a teaching
 * game emits evidence through the pixelquest/voxeldojo channels, the funnel
 * counts the completed loop — and an evidence-handoff only when the record
 * actually left the game toward an embedding host. No-op unless the deploy
 * activated the same-origin endpoint; the "game" channel stays unmeasured by
 * design (no surfaces declared for it in this wave).
 */
function emitChannelFunnel(record: object, channel: EvidenceChannel, handedOff: boolean): void {
  const unitId =
    isRecord(record) && typeof record["unit_id"] === "string" ? record["unit_id"] : null
  if (channel === "voxeldojo") {
    if (unitId === null) return
    const pass = isRecord(record) && record["pass"] === true
    emitFunnelEvent("voxeldojo", "voxel-loop-complete", {
      unitId,
      result: pass ? "completed" : "failed",
    })
    if (handedOff) {
      emitFunnelEvent("voxeldojo", "evidence-handoff", { unitId })
    }
    return
  }
  if (channel === "pixelquest") {
    if (unitId === null) return
    const pass = isRecord(record) && record["pass"] === true
    emitFunnelEvent("pixelquest", "pixelquest-encounter-complete", {
      unitId,
      result: pass ? "completed" : "failed",
    })
    if (handedOff) {
      emitFunnelEvent("pixelquest", "evidence-handoff", { unitId })
    }
  }
}

function writeWindowChannel(
  target: Window,
  record: object,
  channel: EvidenceChannel,
): void {
  switch (channel) {
    case "game":
      Reflect.set(target, "__gameEvidence", record)
      return
    case "pixelquest": {
      const previous = Reflect.get(target, "__pixelQuestEvidence")
      Reflect.set(target, "__pixelQuestEvidence", [...(Array.isArray(previous) ? previous : []), record])
      return
    }
    case "voxeldojo": {
      const previous = Reflect.get(target, "__voxelDojoEvidence")
      Reflect.set(target, "__voxelDojoEvidence", [...(Array.isArray(previous) ? previous : []), record])
      return
    }
  }
}

function forwardToEmbeddingHost<T extends object>(record: T): boolean {
  if (
    typeof window === "undefined" ||
    window.parent === window ||
    typeof document === "undefined"
  ) {
    return false
  }
  if (evidenceParentOrigin === null || document.referrer === "") return false
  let referrerOrigin: string
  try {
    referrerOrigin = new URL(document.referrer).origin
  } catch {
    return false
  }
  if (referrerOrigin !== evidenceParentOrigin) return false
  window.parent.postMessage(
    {
      type: TEACHING_EVIDENCE_MESSAGE,
      version: 1,
      evidence: record,
    },
    evidenceParentOrigin,
  )
  return true
}
