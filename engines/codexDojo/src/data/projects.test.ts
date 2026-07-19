import { describe, expect, it } from "vitest"
import { projects } from "./projects"

describe("projects data module", () => {
  it("exposes the 19 canonical projects (00-18) and canonical titles", () => {
    expect(projects).toHaveLength(19)

    const p00 = projects[0]
    if (p00 === undefined) {
      throw new Error("projects must not be empty")
    }

    expect(p00.id).toBe("p00")
    expect(p00.phase).toBe("aplicacao_ia")

    const p01 = projects[1]
    if (p01 === undefined) {
      throw new Error("projects must include p01")
    }

    expect(p01.id).toBe("p01")
    expect(p01.title).toContain("Rate Limiter")
  })
})
