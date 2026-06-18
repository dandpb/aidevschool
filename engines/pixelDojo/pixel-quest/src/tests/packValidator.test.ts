import { describe, expect, it } from "vitest"
import corePackData from "../content/packs/core/pack.json"
import { PackValidationError, validateContentPack } from "../content/packValidator"

type MutableCorePack = {
  units: Array<{
    unit_id: string
    prerequisites: string[]
    encounter_ids: string[]
  }>
  encounters: Array<{
    id: string
    unit_id: string
  }>
}

describe("content pack validation", () => {
  it("accepts the core pack and preserves its unit contract", () => {
    const pack = validateContentPack(corePackData)

    expect(pack.id).toBe("core")
    expect(pack.units[0]?.unit_id).toBe("U0-sonda-rate-limiter-robustness")
    expect(pack.encounters[0]?.kind).toBe("token_bucket")
  })

  it("rejects an unknown prerequisite", () => {
    const raw = structuredClone(corePackData) as MutableCorePack
    const unit = raw.units[0]
    if (unit === undefined) {
      throw new Error("expected first unit")
    }
    unit.prerequisites.push("missing-unit")

    expect(() => validateContentPack(raw)).toThrow(PackValidationError)
  })

  it("rejects an unknown encounter reference", () => {
    const raw = structuredClone(corePackData) as MutableCorePack
    const unit = raw.units[0]
    if (unit === undefined) {
      throw new Error("expected first unit")
    }
    unit.encounter_ids = ["missing-encounter"]

    expect(() => validateContentPack(raw)).toThrow(PackValidationError)
  })
})
