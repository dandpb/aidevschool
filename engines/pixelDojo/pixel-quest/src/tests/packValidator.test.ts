import { describe, expect, it } from "vitest"
import { curriculumPack, curriculumUnitCount } from "../content/curriculumPack"
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

  it("accepts every curriculum module as a playable lab", () => {
    const pack = validateContentPack(curriculumPack)

    expect(pack.units).toHaveLength(curriculumUnitCount())
    expect(pack.regions).toHaveLength(curriculumUnitCount())
    expect(pack.encounters).toHaveLength(curriculumUnitCount())
    expect(pack.units.map((unit) => unit.project)).toContain("18_search_engine")
    expect(pack.regions[0]?.gates[0]?.nextRegionId).toBe("lab-02_key_value_store")
    expect(pack.regions.at(-1)?.gates[0]?.nextRegionId).toBeUndefined()
    expect(
      pack.encounters.find((encounter) => encounter.project === "02_key_value_store"),
    ).toMatchObject({
      kind: "sequence_flow",
      mechanicName: "TTL Cache",
    })
    expect(
      pack.encounters.find((encounter) => encounter.project === "11_load_balancer"),
    ).toMatchObject({
      kind: "route_health",
      mechanicName: "Health Router",
      goodRequestLabel: "no saudavel",
      badRequestLabel: "no degradado",
    })
    expect(
      pack.encounters.find((encounter) => encounter.project === "07_rest_api_auth"),
    ).toMatchObject({
      kind: "policy_gate",
      mechanicName: "Auth Gate",
      goodRequestLabel: "token autorizado",
      badRequestLabel: "escopo invalido",
    })
    expect(
      pack.encounters.find((encounter) => encounter.project === "09_plugin_system"),
    ).toMatchObject({
      kind: "policy_gate",
      mechanicName: "Plugin Host",
    })
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
