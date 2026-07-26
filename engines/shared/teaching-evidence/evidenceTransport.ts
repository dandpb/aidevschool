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
  if (typeof window !== "undefined") {
    writeWindowChannel(window, record, channel)
    if (!forwarded) {
      forwardToEmbeddingHost(record)
    }
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
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

function forwardToEmbeddingHost<T extends object>(record: T): void {
  if (
    typeof window === "undefined" ||
    window.parent === window ||
    typeof document === "undefined"
  ) {
    return
  }
  if (evidenceParentOrigin === null || document.referrer === "") return
  let referrerOrigin: string
  try {
    referrerOrigin = new URL(document.referrer).origin
  } catch {
    return
  }
  if (referrerOrigin !== evidenceParentOrigin) return
  window.parent.postMessage(
    {
      type: TEACHING_EVIDENCE_MESSAGE,
      version: 1,
      evidence: record,
    },
    evidenceParentOrigin,
  )
}
