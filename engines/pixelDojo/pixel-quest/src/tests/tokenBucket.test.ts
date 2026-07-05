import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import { applyEncounterAction, createTokenBucketState } from "../game/encounters/tokenBucket"
import { validateEvidenceRecord } from "../game/evidence/evidence"

describe("token bucket encounter", () => {
  it("emits passing evidence when legit traffic is admitted and abuse is rejected", () => {
    const encounter = tokenBucketEncounter()
    let state = createTokenBucketState(encounter)
    for (const request of encounter.requests) {
      state = applyEncounterAction(
        state,
        request.type === "legit" ? "admit" : "reject",
        new Date("2026-06-11T12:00:00.000Z"),
      )
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(true)
    expect(validateEvidenceRecord(state.evidence)).toMatchObject({
      project: "03_url_shortener",
      unit_id: "U-03_url_shortener",
      pass: true,
      curriculum_context: {
        concept: "Codigos curtos, colisao e redirecionamento confiavel",
        mechanic: "Slug Router",
        accepted_signal: "slug unico",
        rejected_trap: "colisao de slug",
      },
    })
  })

  it("emits failing evidence when abuse is admitted", () => {
    const encounter = tokenBucketEncounter()
    let state = createTokenBucketState(encounter)
    for (let index = 0; index < encounter.requests.length; index += 1) {
      state = applyEncounterAction(state, "admit", new Date("2026-06-11T12:00:00.000Z"))
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(false)
    const metrics = state.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-token-bucket")
    if (metrics?.kind === "pixelquest-token-bucket") {
      expect(metrics.abusive_admitted).toBeGreaterThan(0)
    }
  })
})

function tokenBucketEncounter() {
  const { pack } = loadCorePack()
  const encounter = pack.encounters.find((candidate) => candidate.project === "03_url_shortener")
  if (encounter === undefined || encounter.kind !== "token_bucket") {
    throw new Error("expected curriculum token bucket encounter")
  }
  return encounter
}
