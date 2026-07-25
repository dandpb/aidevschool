import { learnerSnapshot } from "./data/learner"
import type { LearnerSnapshot } from "./domain"
import type { DashboardStats } from "./progress"

const STREAK_FREEZE_CAP = 2

function normalizePercent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, value))
}

function normalizeFreezeCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.min(STREAK_FREEZE_CAP, Math.max(0, Math.trunc(value)))
}

function normalizeFiniteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return value
}

function normalizeWholeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }
  return Math.max(0, Math.trunc(value))
}

type RawTrendPoint = {
  readonly date?: unknown
  readonly value?: unknown
  readonly measurementSource?: unknown
}

function normalizeTrend(trend: unknown): LearnerSnapshot["aidi"]["trend"] {
  if (!Array.isArray(trend)) {
    return []
  }

  return trend.map((point) => {
    if (typeof point !== "object" || point === null) {
      return { date: "", value: 0, measurementSource: "self_reported" }
    }

    const rawPoint = point as RawTrendPoint
    const measurementSource =
      rawPoint.measurementSource === "event_computed" || rawPoint.measurementSource === "derived"
        ? rawPoint.measurementSource
        : "self_reported"

    return {
      date: typeof rawPoint.date === "string" ? rawPoint.date : "",
      value: normalizeFiniteNumber(rawPoint.value),
      measurementSource,
    }
  })
}

/**
 * Convert a raw generated LearnerSnapshot into a guaranteed-valid read model.
 *
 * All numeric fields are coerced to finite numbers, percentages are clamped to
 * [0, 100], and streak freeze counts are capped. String fields are left as-is;
 * HTML escaping is the renderer's responsibility.
 */
export function normalizeSnapshot(raw: LearnerSnapshot): LearnerSnapshot {
  const freezesMax = normalizeFreezeCount(raw.streak.freezesMax)

  return {
    activeUnit: {
      id: typeof raw.activeUnit.id === "string" ? raw.activeUnit.id : "",
      title: typeof raw.activeUnit.title === "string" ? raw.activeUnit.title : "",
      project: typeof raw.activeUnit.project === "string" ? raw.activeUnit.project : "",
      state: raw.activeUnit.state,
      retryCount: normalizeWholeNumber(raw.activeUnit.retryCount),
      retryLimit: normalizeWholeNumber(raw.activeUnit.retryLimit),
    },
    gate: {
      implementationBlocked: Boolean(raw.gate.implementationBlocked),
      unblockCondition:
        typeof raw.gate.unblockCondition === "string" ? raw.gate.unblockCondition : "",
    },
    profile: {
      dreyfus: raw.profile.dreyfus,
      bloom: raw.profile.bloom,
      activeLanguage:
        typeof raw.profile.activeLanguage === "string" ? raw.profile.activeLanguage : "",
      weeklyTimeHours: normalizeWholeNumber(raw.profile.weeklyTimeHours),
    },
    aidi: {
      current: normalizeFiniteNumber(raw.aidi.current),
      thresholdAmber: normalizeFiniteNumber(raw.aidi.thresholdAmber),
      thresholdRed: normalizeFiniteNumber(raw.aidi.thresholdRed),
      measurementSource:
        raw.aidi.measurementSource === "event_computed" || raw.aidi.measurementSource === "derived"
          ? raw.aidi.measurementSource
          : "self_reported",
      trend: normalizeTrend(raw.aidi.trend),
    },
    topPitfalls: Array.isArray(raw.topPitfalls)
      ? raw.topPitfalls.map((pitfall) => ({
          id: typeof pitfall.id === "string" ? pitfall.id : "",
          description: typeof pitfall.description === "string" ? pitfall.description : "",
          occurrences: normalizeWholeNumber(pitfall.occurrences),
          lastSeen: typeof pitfall.lastSeen === "string" ? pitfall.lastSeen : "",
        }))
      : [],
    nextReviews: Array.isArray(raw.nextReviews)
      ? raw.nextReviews.map((review) => ({
          unitId: typeof review.unitId === "string" ? review.unitId : "",
          title: typeof review.title === "string" ? review.title : "",
          dueIn: typeof review.dueIn === "string" ? review.dueIn : "",
          reason:
            review.reason === "due" ||
            review.reason === "interleaving" ||
            review.reason === "recurring-trap"
              ? review.reason
              : "overdue",
        }))
      : [],
    masteredCount: normalizeWholeNumber(raw.masteredCount),
    scaffoldedCount: normalizeWholeNumber(raw.scaffoldedCount),
    streak: {
      current: normalizeWholeNumber(raw.streak.current),
      longest: normalizeWholeNumber(raw.streak.longest),
      lastGateDate:
        raw.streak.lastGateDate === null || raw.streak.lastGateDate === undefined
          ? null
          : String(raw.streak.lastGateDate),
      freezesEquipped: Math.min(freezesMax, normalizeFreezeCount(raw.streak.freezesEquipped)),
      freezesMax,
    },
    curr: normalizeFiniteNumber(raw.curr),
    challenges: Array.isArray(raw.challenges) ? raw.challenges : [],
    ...(raw.predictions === undefined
      ? {}
      : {
          predictions: {
            count: normalizeWholeNumber(raw.predictions.count),
            byMetric: {
              latency: {
                correct: normalizeWholeNumber(raw.predictions.byMetric.latency.correct),
                total: normalizeWholeNumber(raw.predictions.byMetric.latency.total),
              },
              memory: {
                correct: normalizeWholeNumber(raw.predictions.byMetric.memory.correct),
                total: normalizeWholeNumber(raw.predictions.byMetric.memory.total),
              },
              throughput: {
                correct: normalizeWholeNumber(raw.predictions.byMetric.throughput.correct),
                total: normalizeWholeNumber(raw.predictions.byMetric.throughput.total),
              },
            },
          },
        }),
  }
}

export function getNormalizedLearnerSnapshot(): LearnerSnapshot {
  return normalizeSnapshot(learnerSnapshot)
}

/**
 * Clamp dashboard stats to render-safe values.
 *
 * The non-empty agent/stage/project catalog invariant is owned by app.ts at
 * mount time; this normalizer only sanitizes the numeric fields that flow into
 * CSS and text interpolation.
 */
export function normalizeDashboardStats(raw: DashboardStats): DashboardStats {
  return {
    agents: normalizeWholeNumber(raw.agents),
    stages: normalizeWholeNumber(raw.stages),
    projects: normalizeWholeNumber(raw.projects),
    completionPercent: normalizePercent(raw.completionPercent),
  }
}
