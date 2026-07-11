/**
 * Deep evidence-emitter for teaching games.
 * Games supply identity + metrics + pass; this owns envelope + dual channel.
 * Contract: docs/design/teaching-game-contract.md
 */

export type EvidenceSource = "pixelquest" | "voxeldojo"
export type ReviewReason =
  | "due"
  | "deepening"
  | "overdue"
  | "interleaving"
  | "recurring-trap"
export type WindowKey = "__pixelQuestEvidence" | "__voxelDojoEvidence" | "__gameEvidence"

export interface ReviewSliceLike {
  nextReviews: ReadonlyArray<{ unitId: string }>
}

export interface CurriculumContext {
  concept: string
  mechanic: string
  accepted_signal?: string
  rejected_trap?: string
}

export interface EvidenceReviewContext<TReason extends ReviewReason = ReviewReason> {
  unit_kind: "concept"
  scheduled_review: boolean
  review_reason: TReason
  streak_candidate?: boolean
  scheduler_source: "learner-substrate"
  verifier_required: true
}

export interface EvidenceMeta {
  source: EvidenceSource
  unitId: string
  project: string
  scenarioId: string
  game: string
  curriculum: CurriculumContext
  windowKey?: WindowKey
}

export interface EvidenceRecord {
  source: EvidenceSource
  unit_id: string
  project: string
  scenario_id: string
  game: string
  ts: string
  pass: boolean
  metrics: Record<string, number | boolean | string>
  review_context: {
    unit_kind: "concept"
    scheduled_review: boolean
    review_reason: ReviewReason
    scheduler_source: "learner-substrate"
    verifier_required: true
  }
  curriculum_context: CurriculumContext
}

export type ValidatedEvidenceEnvelope<
  TSource extends EvidenceSource,
  TGame extends string,
  TIdentityKey extends "encounter_id" | "scenario_id",
  TMetrics,
  TReason extends ReviewReason,
> = {
  source: TSource
  unit_id: string
  project: string
  game: TGame
  ts: string
  pass: boolean
  metrics: TMetrics
  review_context?: EvidenceReviewContext<TReason>
  curriculum_context?: CurriculumContext
} & Record<TIdentityKey, string>

export interface EvidenceEnvelopeValidationOptions<
  TSource extends EvidenceSource,
  TGame extends string,
  TIdentityKey extends "encounter_id" | "scenario_id",
  TMetrics,
  TReason extends ReviewReason,
> {
  source: TSource
  game: TGame
  identityKey: TIdentityKey
  reviewReasons: ReadonlyArray<TReason>
  requireStreakCandidate?: boolean
  requireCurriculumSignals?: boolean
  decodeMetrics: (metrics: Record<string, unknown>) => TMetrics
}

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvidenceValidationError"
  }
}

export function validateEvidenceEnvelope<
  TSource extends EvidenceSource,
  TGame extends string,
  TIdentityKey extends "encounter_id" | "scenario_id",
  TMetrics,
  TReason extends ReviewReason,
>(
  raw: unknown,
  options: EvidenceEnvelopeValidationOptions<
    TSource,
    TGame,
    TIdentityKey,
    TMetrics,
    TReason
  >,
): ValidatedEvidenceEnvelope<TSource, TGame, TIdentityKey, TMetrics, TReason> {
  if (!isRecord(raw)) throw new EvidenceValidationError("evidence must be an object")
  if (raw["source"] !== options.source) {
    throw new EvidenceValidationError(`evidence.source must be ${options.source}`)
  }
  const unitId = readNonEmptyString(raw, "unit_id")
  const project = readNonEmptyString(raw, "project")
  const identity = readNonEmptyString(raw, options.identityKey)
  if (raw["game"] !== options.game) {
    throw new EvidenceValidationError(`evidence.game must be ${options.game}`)
  }
  const timestamp = raw["ts"]
  if (typeof timestamp !== "string" || Number.isNaN(Date.parse(timestamp))) {
    throw new EvidenceValidationError("evidence.ts must be an ISO timestamp")
  }
  if (typeof raw["pass"] !== "boolean") {
    throw new EvidenceValidationError("evidence.pass must be boolean")
  }
  const metrics = raw["metrics"]
  if (!isRecord(metrics)) {
    throw new EvidenceValidationError("evidence.metrics must be an object")
  }

  const envelope = {
    source: options.source,
    unit_id: unitId,
    project,
    [options.identityKey]: identity,
    game: options.game,
    ts: timestamp,
    pass: raw["pass"],
    metrics: options.decodeMetrics(metrics),
  }
  const reviewContext = readReviewContext(raw["review_context"], options)
  const curriculumContext = readCurriculumContext(raw["curriculum_context"], options)
  return {
    ...envelope,
    ...(reviewContext === undefined ? {} : { review_context: reviewContext }),
    ...(curriculumContext === undefined ? {} : { curriculum_context: curriculumContext }),
  } as ValidatedEvidenceEnvelope<TSource, TGame, TIdentityKey, TMetrics, TReason>
}

function readReviewContext<TReason extends ReviewReason>(
  raw: unknown,
  options: Pick<
    EvidenceEnvelopeValidationOptions<
      EvidenceSource,
      string,
      "encounter_id" | "scenario_id",
      unknown,
      TReason
    >,
    "reviewReasons" | "requireStreakCandidate"
  >,
): EvidenceReviewContext<TReason> | undefined {
  if (raw === undefined) return undefined
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence.review_context must be an object")
  }
  if (raw["unit_kind"] !== "concept") {
    throw new EvidenceValidationError("evidence.review_context.unit_kind must be concept")
  }
  const reason = options.reviewReasons.find((candidate) => candidate === raw["review_reason"])
  if (reason === undefined) {
    throw new EvidenceValidationError("evidence.review_context.review_reason is invalid")
  }
  if (raw["scheduler_source"] !== "learner-substrate") {
    throw new EvidenceValidationError(
      "evidence.review_context.scheduler_source must be learner-substrate",
    )
  }
  if (raw["verifier_required"] !== true) {
    throw new EvidenceValidationError("evidence.review_context.verifier_required must be true")
  }
  const streakCandidate = raw["streak_candidate"]
  if (
    (options.requireStreakCandidate || streakCandidate !== undefined) &&
    typeof streakCandidate !== "boolean"
  ) {
    throw new EvidenceValidationError(
      "evidence.review_context.streak_candidate must be boolean",
    )
  }
  return {
    unit_kind: "concept",
    scheduled_review: readBoolean(raw, "review_context.scheduled_review"),
    review_reason: reason,
    ...(typeof streakCandidate === "boolean" ? { streak_candidate: streakCandidate } : {}),
    scheduler_source: "learner-substrate",
    verifier_required: true,
  }
}

function readCurriculumContext(
  raw: unknown,
  options: Pick<
    EvidenceEnvelopeValidationOptions<
      EvidenceSource,
      string,
      "encounter_id" | "scenario_id",
      unknown,
      ReviewReason
    >,
    "requireCurriculumSignals"
  >,
): CurriculumContext | undefined {
  if (raw === undefined) return undefined
  if (!isRecord(raw)) {
    throw new EvidenceValidationError("evidence.curriculum_context must be an object")
  }
  const acceptedSignal = raw["accepted_signal"]
  const rejectedTrap = raw["rejected_trap"]
  if (
    (options.requireCurriculumSignals || acceptedSignal !== undefined) &&
    (typeof acceptedSignal !== "string" || acceptedSignal.trim() === "")
  ) {
    throw new EvidenceValidationError(
      "evidence.curriculum_context.accepted_signal must be a non-empty string",
    )
  }
  if (
    (options.requireCurriculumSignals || rejectedTrap !== undefined) &&
    (typeof rejectedTrap !== "string" || rejectedTrap.trim() === "")
  ) {
    throw new EvidenceValidationError(
      "evidence.curriculum_context.rejected_trap must be a non-empty string",
    )
  }
  return {
    concept: readNonEmptyString(raw, "curriculum_context.concept"),
    mechanic: readNonEmptyString(raw, "curriculum_context.mechanic"),
    ...(typeof acceptedSignal === "string" ? { accepted_signal: acceptedSignal } : {}),
    ...(typeof rejectedTrap === "string" ? { rejected_trap: rejectedTrap } : {}),
  }
}

function readNonEmptyString(source: Record<string, unknown>, key: string): string {
  const parts = key.split(".")
  const property = parts[parts.length - 1]
  const value = property === undefined ? undefined : source[property]
  if (typeof value !== "string" || value.trim() === "") {
    throw new EvidenceValidationError(`evidence.${key} must be a non-empty string`)
  }
  return value
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const parts = key.split(".")
  const property = parts[parts.length - 1]
  const value = property === undefined ? undefined : source[property]
  if (typeof value !== "boolean") {
    throw new EvidenceValidationError(`evidence.${key} must be boolean`)
  }
  return value
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
}

export interface EmitOptions {
  meta: EvidenceMeta
  pass: boolean
  metrics: Record<string, number | boolean | string>
  reviewSlice?: ReviewSliceLike
  now?: () => Date
}

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

function forwardToEmbeddingHost<T extends object>(record: T): void {
  if (typeof window === "undefined" || window.parent === window || typeof document === "undefined") {
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

// ponytail: no `declare global { interface Window }` augmentation here —
// each consumer (pixel-quest, voxelDojo) declares its own channel array
// type, and dualEmit writes through `as unknown as Record<string, unknown>`
// so it does not need window-typed property names.

/**
 * Dual-channel emit for any record shape.
 * Console line scraped by Playwright; window channel is in-page.
 * Never writes learner state.
 */
export function dualEmit<T extends object>(
  record: T,
  channel: "game" | "pixelquest" | "voxeldojo" = "game",
): T {
  if (typeof window !== "undefined") {
    const w = window as unknown as Record<string, unknown>
    if (channel === "game") {
      w["__gameEvidence"] = record
    } else if (channel === "pixelquest") {
      const prev = w["__pixelQuestEvidence"]
      w["__pixelQuestEvidence"] = [...(Array.isArray(prev) ? prev : []), record]
    } else {
      const prev = w["__voxelDojoEvidence"]
      w["__voxelDojoEvidence"] = [...(Array.isArray(prev) ? prev : []), record]
    }
    forwardToEmbeddingHost(record)
  }
  console.log(`EVIDENCE ${JSON.stringify(record)}`)
  return record
}

/** Dual-emit one typed teaching-game evidence record. Never writes learner state. */
export function emitEvidence(opts: EmitOptions): EvidenceRecord {
  const { meta, pass, metrics } = opts
  const now = opts.now ?? (() => new Date())
  const scheduled = opts.reviewSlice?.nextReviews.some((r) => r.unitId === meta.unitId) ?? false

  const record: EvidenceRecord = {
    source: meta.source,
    unit_id: meta.unitId,
    project: meta.project,
    scenario_id: meta.scenarioId,
    game: meta.game,
    ts: now().toISOString(),
    pass,
    metrics,
    review_context: {
      unit_kind: "concept",
      scheduled_review: scheduled,
      review_reason: scheduled ? "due" : "deepening",
      scheduler_source: "learner-substrate",
      verifier_required: true,
    },
    curriculum_context: meta.curriculum,
  }

  const channel = meta.source === "pixelquest" ? "pixelquest" : "voxeldojo"
  return dualEmit(record, meta.windowKey === "__gameEvidence" ? "game" : channel)
}
