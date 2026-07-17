import { describe, expect, it, vi } from "vitest"
import type { LearnerSnapshot } from "../domain"

vi.mock("../progress", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../progress")>()
  const snapshot = actual.getLearnerSnapshot()

  return {
    ...actual,
    getLearnerSnapshot: (): LearnerSnapshot => ({
      ...snapshot,
      streak: {
        ...snapshot.streak,
        freezesEquipped: -1,
        freezesMax: Number.MAX_SAFE_INTEGER,
      },
    }),
  }
})

import { renderLearnerDashboard } from "./learner"

describe("renderLearnerDashboard", () => {
  it("bounds malformed freeze counts before repeating glyphs", () => {
    const html = renderLearnerDashboard()

    expect(html).toContain("freezes: ··")
  })
})
