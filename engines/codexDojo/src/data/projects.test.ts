import { describe, expect, it } from "vitest"
import { projects } from "./projects"

describe("projects data module", () => {
  it("exposes the 20 canonical projects (00-19) with contiguous ids", () => {
    expect(projects).toHaveLength(20)

    expect(projects.map((project) => project.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => `p${index.toString().padStart(2, "0")}`),
    )

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

  it("keeps p19 as the planned guided Dev journey family in the application phase", () => {
    const p19 = projects[19]
    if (p19 === undefined) {
      throw new Error("projects must include p19")
    }

    expect(p19.id).toBe("p19")
    expect(p19.title).toContain("Sequência Dev Guiada")
    expect(p19.phase).toBe("aplicacao_ia")
    expect(p19.level).toBe(0)
    // evidence[1] is the catalog status rendered by the substrate projection
    // (learner/substrate/catalog.py render_projects_ts); "planned" keeps p19
    // out of the implemented/scaffolded dashboard counts.
    expect(p19.evidence[1]).toBe("planned")
  })
})
