import { describe, expect, it, vi } from "vitest"
import type { LearnerSnapshot } from "../domain"

vi.mock("../data/learner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/learner")>()
  const snapshot = actual.learnerSnapshot

  return {
    learnerSnapshot: {
      ...snapshot,
      streak: {
        ...snapshot.streak,
        freezesEquipped: -1,
        freezesMax: Number.MAX_SAFE_INTEGER,
      },
    } satisfies LearnerSnapshot,
  }
})

import { renderLearnerDashboard } from "./learner"

describe("renderLearnerDashboard", () => {
  it("bounds malformed freeze counts before repeating glyphs", () => {
    const html = renderLearnerDashboard()

    expect(html).toContain("freezes: ··")
  })
})
