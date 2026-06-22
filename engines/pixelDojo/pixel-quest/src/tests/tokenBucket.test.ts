import { describe, expect, it } from "vitest"
import { loadCorePack } from "../content/loadCorePack"
import { applyEncounterAction, createTokenBucketState } from "../game/encounters/tokenBucket"
import { validateEvidenceRecord } from "../game/evidence/evidence"

describe("token bucket encounter", () => {
  it("emits passing evidence when legit traffic is admitted and abuse is rejected", () => {
    const { pack } = loadCorePack()
    const encounter = pack.encounters[0]
    if (encounter === undefined || encounter.kind !== "token_bucket") {
      throw new Error("expected core encounter")
    }
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
      project: "01_rate_limiter",
      unit_id: "U0-sonda-rate-limiter-robustness",
      pass: true,
      curriculum_context: {
        concept: "Token bucket: capacidade, refill e rejeicao 429",
        mechanic: "Token Bucket",
        accepted_signal: "trafego legitimo",
        rejected_trap: "rajada abusiva",
      },
    })
  })

  it("emits failing evidence when abuse is admitted", () => {
    const { pack } = loadCorePack()
    const encounter = pack.encounters[0]
    if (encounter === undefined || encounter.kind !== "token_bucket") {
      throw new Error("expected core encounter")
    }
    let state = createTokenBucketState(encounter)
    for (let index = 0; index < encounter.requests.length; index += 1) {
      state = applyEncounterAction(state, "admit", new Date("2026-06-11T12:00:00.000Z"))
    }

    expect(state.complete).toBe(true)
    expect(state.evidence?.pass).toBe(false)
    expect(state.evidence?.metrics.abusive_admitted).toBeGreaterThan(0)
  })
})
