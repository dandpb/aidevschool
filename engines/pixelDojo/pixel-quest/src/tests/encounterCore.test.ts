import { describe, expect, it } from "vitest"
import {
  applyEncounterStep,
  autoPassEncounterState,
  type EncounterAction,
  type EncounterDriver,
  type EncounterStepState,
} from "../game/encounters/encounterCore"
import type { EvidenceSourceDefinition } from "../game/evidence/emitter"

type FakeItem = {
  readonly good: boolean
}

type FakeState = EncounterStepState & {
  readonly items: readonly FakeItem[]
  readonly hits: number
  readonly misses: number
}

const NOW = new Date("2026-07-05T12:00:00.000Z")

const definition: EvidenceSourceDefinition = {
  id: "fake-encounter",
  unit_id: "U-00_fake",
  project: "00_fake",
  concept: "Shared encounter step engine",
  mechanicName: "Fake Gate",
  goodRequestLabel: "good item",
  badRequestLabel: "bad item",
}

function correctActionFor(item: FakeItem): EncounterAction {
  return item.good ? "admit" : "reject"
}

const driver: EncounterDriver<FakeState, FakeItem> = {
  itemsOf: (state) => state.items,
  correctAction: correctActionFor,
  applyAction: (state, item, action) =>
    action === correctActionFor(item)
      ? { ...state, hits: state.hits + 1 }
      : { ...state, misses: state.misses + 1 },
  outcomeOf: (state) => ({
    pass: state.misses === 0,
    metrics: {
      kind: "pixelquest-policy-gate",
      allowed: state.hits,
      denied: 0,
      policy_leaks: state.misses,
      false_denies: 0,
      heat_peak: 0,
      overheated: false,
    },
  }),
}

function createState(items: readonly FakeItem[]): FakeState {
  return { definition, index: 0, complete: false, items, hits: 0, misses: 0 }
}

function playAll(initial: FakeState, action: EncounterAction): FakeState {
  let state = initial
  for (let step = 0; step < initial.items.length; step += 1) {
    state = applyEncounterStep(state, action, NOW, driver)
  }
  return state
}

describe("encounter step engine", () => {
  it("advances one item per step and only completes on the last one", () => {
    const initial = createState([{ good: true }, { good: true }, { good: true }])

    const afterFirst = applyEncounterStep(initial, "admit", NOW, driver)

    expect(afterFirst.index).toBe(1)
    expect(afterFirst.complete).toBe(false)
    expect(afterFirst.evidence).toBeUndefined()

    const final = playAll(afterFirst, "admit")

    expect(final.index).toBe(3)
    expect(final.complete).toBe(true)
    expect(final.hits).toBe(3)
  })

  it("builds the evidence envelope from the definition on completion", () => {
    const final = playAll(createState([{ good: true }]), "admit")

    expect(final.evidence).toMatchObject({
      source: "pixelquest",
      unit_id: "U-00_fake",
      project: "00_fake",
      encounter_id: "fake-encounter",
      game: "PixelDojo Quest",
      ts: "2026-07-05T12:00:00.000Z",
      pass: true,
      curriculum_context: {
        concept: "Shared encounter step engine",
        mechanic: "Fake Gate",
        accepted_signal: "good item",
        rejected_trap: "bad item",
      },
    })
  })

  it("delegates the pass rule to the driver: wrong actions fail the outcome", () => {
    const final = playAll(createState([{ good: true }, { good: false }]), "admit")

    expect(final.complete).toBe(true)
    expect(final.hits).toBe(1)
    expect(final.misses).toBe(1)
    expect(final.evidence?.pass).toBe(false)
    const metrics = final.evidence?.metrics
    expect(metrics?.kind).toBe("pixelquest-policy-gate")
    if (metrics?.kind === "pixelquest-policy-gate") {
      expect(metrics.policy_leaks).toBe(1)
    }
  })

  it("guards completed states: further steps return the same state untouched", () => {
    const final = playAll(createState([{ good: true }]), "admit")

    const afterExtra = applyEncounterStep(final, "reject", NOW, driver)

    expect(afterExtra).toBe(final)
  })

  it("completes an encounter with no items instead of stepping past the list", () => {
    const final = applyEncounterStep(createState([]), "admit", NOW, driver)

    expect(final.complete).toBe(true)
    expect(final.hits).toBe(0)
    expect(final.misses).toBe(0)
    expect(final.evidence?.pass).toBe(true)
  })

  it("auto-pass plays the driver's correct action for every item", () => {
    const final = autoPassEncounterState(
      createState([{ good: true }, { good: false }, { good: true }]),
      NOW,
      driver,
    )

    expect(final.complete).toBe(true)
    expect(final.hits).toBe(3)
    expect(final.misses).toBe(0)
    expect(final.evidence?.pass).toBe(true)
  })

  it("auto-pass completes an already-empty encounter with evidence", () => {
    const final = autoPassEncounterState(createState([]), NOW, driver)

    expect(final.complete).toBe(true)
    expect(final.evidence?.pass).toBe(true)
  })
})
