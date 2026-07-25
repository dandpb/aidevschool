import { describe, expect, it } from "vitest"
import type { LearnerSnapshot } from "./domain"
import { normalizeDashboardStats, normalizeSnapshot } from "./normalize"

const baseSnapshot: LearnerSnapshot = {
  activeUnit: {
    id: "U1",
    title: "Unit",
    project: "p01",
    state: "evaluating",
    retryCount: 1,
    retryLimit: 3,
  },
  gate: {
    implementationBlocked: false,
    unblockCondition: "attempt",
  },
  profile: {
    dreyfus: "competent",
    bloom: "apply",
    activeLanguage: "TypeScript",
    weeklyTimeHours: 5,
  },
  aidi: {
    current: 0.5,
    thresholdAmber: 0.6,
    thresholdRed: 0.75,
    measurementSource: "self_reported",
    trend: [{ date: "2026-01-01", value: 0.4, measurementSource: "event_computed" }],
  },
  topPitfalls: [{ id: "P1", description: "d", occurrences: 2, lastSeen: "2026-01-01" }],
  nextReviews: [{ unitId: "U1", title: "t", dueIn: "today", reason: "due" }],
  masteredCount: 1,
  scaffoldedCount: 5,
  streak: {
    current: 3,
    longest: 7,
    lastGateDate: "2026-01-01",
    freezesEquipped: 1,
    freezesMax: 2,
  },
  curr: 0.8,
  challenges: [],
}

describe("normalizeSnapshot", () => {
  it("returns valid data unchanged", () => {
    const normalized = normalizeSnapshot(baseSnapshot)

    expect(normalized.aidi.current).toBe(0.5)
    expect(normalized.streak.freezesEquipped).toBe(1)
    expect(normalized.streak.freezesMax).toBe(2)
    expect(normalized.curr).toBe(0.8)
  })

  it("coerces non-numeric AIDI and CURR fields to 0", () => {
    const malformed = {
      ...baseSnapshot,
      aidi: {
        ...baseSnapshot.aidi,
        current: "bad" as unknown as number,
        thresholdAmber: null as unknown as number,
        thresholdRed: undefined as unknown as number,
      },
      curr: "bad" as unknown as number,
    }

    const normalized = normalizeSnapshot(malformed)

    expect(normalized.aidi.current).toBe(0)
    expect(normalized.aidi.thresholdAmber).toBe(0)
    expect(normalized.aidi.thresholdRed).toBe(0)
    expect(normalized.curr).toBe(0)
  })

  it("caps streak freezes between 0 and 2 and bounds equipped by max", () => {
    const malformed = {
      ...baseSnapshot,
      streak: {
        ...baseSnapshot.streak,
        freezesEquipped: 10,
        freezesMax: -5,
      },
    }

    const normalized = normalizeSnapshot(malformed)

    expect(normalized.streak.freezesMax).toBe(0)
    expect(normalized.streak.freezesEquipped).toBe(0)
  })

  it("defaults unknown measurement sources and review reasons", () => {
    const firstReview = baseSnapshot.nextReviews[0]
    if (firstReview === undefined) {
      throw new Error("baseSnapshot must have at least one nextReview")
    }

    const malformed: LearnerSnapshot = {
      ...baseSnapshot,
      aidi: { ...baseSnapshot.aidi, measurementSource: "bad" as unknown as "self_reported" },
      nextReviews: [
        {
          unitId: firstReview.unitId,
          title: firstReview.title,
          dueIn: firstReview.dueIn,
          reason: "bad" as unknown as "overdue",
        },
      ],
    }

    const normalized = normalizeSnapshot(malformed)

    expect(normalized.aidi.measurementSource).toBe("self_reported")
    expect(normalized.nextReviews[0]?.reason).toBe("overdue")
  })
})

describe("normalizeDashboardStats", () => {
  it("clamps completion percent to [0, 100]", () => {
    expect(
      normalizeDashboardStats({ agents: 1, stages: 2, projects: 3, completionPercent: 150 })
        .completionPercent,
    ).toBe(100)
    expect(
      normalizeDashboardStats({ agents: 1, stages: 2, projects: 3, completionPercent: -10 })
        .completionPercent,
    ).toBe(0)
    expect(
      normalizeDashboardStats({ agents: 1, stages: 2, projects: 3, completionPercent: 42 })
        .completionPercent,
    ).toBe(42)
  })

  it("coerces malformed counts to numbers", () => {
    const normalized = normalizeDashboardStats({
      agents: "14" as unknown as number,
      stages: null as unknown as number,
      projects: undefined as unknown as number,
      completionPercent: "50" as unknown as number,
    })

    expect(normalized.agents).toBe(0)
    expect(normalized.stages).toBe(0)
    expect(normalized.projects).toBe(0)
    expect(normalized.completionPercent).toBe(0)
  })
})
