import { describe, expect, it } from "vitest"
import { projects } from "./projects"

describe("projects data module", () => {
  it("exposes the 18 canonical projects and a canonical p01 title", () => {
    expect(projects).toHaveLength(18)

    const p01 = projects[0]
    if (p01 === undefined) {
      throw new Error("projects must not be empty")
    }

    expect(p01.id).toBe("p01")
    expect(p01.title).toContain("Rate Limiter")
  })
})
