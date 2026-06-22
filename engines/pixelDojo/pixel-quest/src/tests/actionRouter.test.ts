import { describe, expect, it } from "vitest"
import { routeAction } from "../app/actionRouter"

describe("action router", () => {
  it("starts the quest from briefing on confirm", () => {
    const command = routeAction({
      action: { kind: "confirm" },
      mode: "briefing",
      encounterComplete: false,
    })

    expect(command).toEqual({ kind: "start-quest" })
  })

  it("routes dialogue confirmation into practice before the duel", () => {
    const command = routeAction({
      action: { kind: "confirm" },
      mode: "dialogue",
      encounterComplete: false,
    })

    expect(command).toEqual({ kind: "open-practice" })
  })

  it("blocks help while an encounter is active", () => {
    const command = routeAction({
      action: { kind: "help" },
      mode: "encounter",
      encounterComplete: false,
    })

    expect(command).toEqual({ kind: "none" })
  })
})
