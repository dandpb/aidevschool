import type { PixelQuestEvidenceRecord } from "./types"

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceValidationError"
  }
}

export function validateEvidenceRecord(raw: unknown): PixelQuestEvidenceRecord {
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence must be an object")
  }
  if (raw["source"] !== "pixelquest") {
    throw new EvidenceValidationError("evidence.source must be pixelquest")
  }
  const unitId = raw["unit_id"]
  if (typeof unitId !== "string" || unitId.trim() === "") {
    throw new EvidenceValidationError("evidence.unit_id is required")
  }
  const project = raw["project"]
  if (typeof project !== "string" || project.trim() === "") {
    throw new EvidenceValidationError("evidence.project is required")
  }
  const encounterId = raw["encounter_id"]
  if (typeof encounterId !== "string" || encounterId.trim() === "") {
    throw new EvidenceValidationError("evidence.encounter_id is required")
  }
  const game = raw["game"]
  if (game !== "PixelDojo Quest") {
    throw new EvidenceValidationError("evidence.game must be PixelDojo Quest")
  }
  const ts = raw["ts"]
  if (typeof ts !== "string" || Number.isNaN(Date.parse(ts))) {
    throw new EvidenceValidationError("evidence.ts must be an ISO timestamp")
  }
  const pass = raw["pass"]
  if (typeof pass !== "boolean") {
    throw new EvidenceValidationError("evidence.pass must be boolean")
  }
  const metrics = raw["metrics"]
  if (!isRecord(metrics)) {
    throw new EvidenceValidationError("evidence.metrics must be an object")
  }
  return {
    source: "pixelquest",
    unit_id: unitId,
    project,
    encounter_id: encounterId,
    game: "PixelDojo Quest",
    ts,
    pass,
    metrics: {
      target_rate: readNumber(metrics, "target_rate"),
      observed_admit_rate: readNumber(metrics, "observed_admit_rate"),
      max_burst_1s: readNumber(metrics, "max_burst_1s"),
      good_admits: readNumber(metrics, "good_admits"),
      legit_rejected: readNumber(metrics, "legit_rejected"),
      abusive_admitted: readNumber(metrics, "abusive_admitted"),
      abusive_rejected: readNumber(metrics, "abusive_rejected"),
      heat_peak: readNumber(metrics, "heat_peak"),
      overheated: readBoolean(metrics, "overheated"),
    },
  }
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new EvidenceValidationError(`evidence.metrics.${key} must be a finite number`)
  }
  return value
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key]
  if (typeof value !== "boolean") {
    throw new EvidenceValidationError(`evidence.metrics.${key} must be boolean`)
  }
  return value
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
}
