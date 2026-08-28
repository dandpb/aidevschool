import { isRecord } from "./hostMessageDecoder"

export type EvidenceSource = "pixelquest" | "voxeldojo"
export type ReviewReason = "due" | "deepening" | "overdue" | "interleaving" | "recurring-trap"

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
  attempt_id?: string
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

type IdentityKey = "encounter_id" | "scenario_id"
type AnyValidationOptions = EvidenceEnvelopeValidationOptions<
  EvidenceSource,
  string,
  IdentityKey,
  unknown,
  ReviewReason
>
type AnyValidatedEnvelope =
  | ValidatedEvidenceEnvelope<EvidenceSource, string, "encounter_id", unknown, ReviewReason>
  | ValidatedEvidenceEnvelope<EvidenceSource, string, "scenario_id", unknown, ReviewReason>

export function validateEvidenceEnvelope<
  TSource extends EvidenceSource,
  TGame extends string,
  TIdentityKey extends IdentityKey,
  TMetrics,
  TReason extends ReviewReason,
>(
  raw: unknown,
  options: EvidenceEnvelopeValidationOptions<TSource, TGame, TIdentityKey, TMetrics, TReason>,
): ValidatedEvidenceEnvelope<TSource, TGame, TIdentityKey, TMetrics, TReason>
export function validateEvidenceEnvelope(
  raw: unknown,
  options: AnyValidationOptions,
): AnyValidatedEnvelope {
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

  const shared = {
    source: options.source,
    unit_id: unitId,
    project,
    game: options.game,
    ts: timestamp,
    pass: raw["pass"],
    metrics: options.decodeMetrics(metrics),
    ...readAttemptId(raw),
  }
  const reviewContext = readReviewContext(raw["review_context"], options)
  const curriculumContext = readCurriculumContext(raw["curriculum_context"], options)
  const contexts = {
    ...(reviewContext === undefined ? {} : { review_context: reviewContext }),
    ...(curriculumContext === undefined ? {} : { curriculum_context: curriculumContext }),
  }
  if (options.identityKey === "encounter_id") {
    return { ...shared, encounter_id: identity, ...contexts }
  }
  return { ...shared, scenario_id: identity, ...contexts }
}

function readAttemptId(
  source: Record<string, unknown>,
): { attempt_id?: string } {
  const value = source["attempt_id"]
  if (value === undefined) return {}
  if (typeof value !== "string" || value.trim() === "") {
    throw new EvidenceValidationError("evidence.attempt_id must be a non-empty string")
  }
  return { attempt_id: value }
}

function readReviewContext(
  raw: unknown,
  options: Pick<AnyValidationOptions, "reviewReasons" | "requireStreakCandidate">,
): EvidenceReviewContext | undefined {
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
    throw new EvidenceValidationError("evidence.review_context.streak_candidate must be boolean")
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
  options: Pick<AnyValidationOptions, "requireCurriculumSignals">,
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

export function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const parts = key.split(".")
  const property = parts[parts.length - 1]
  const value = property === undefined ? undefined : source[property]
  if (typeof value !== "boolean") {
    throw new EvidenceValidationError(`evidence.${key} must be boolean`)
  }
  return value
}

export function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new EvidenceValidationError(`evidence.${key} must be a finite, non-negative number`)
  }
  return value
}
