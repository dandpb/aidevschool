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

  it("opens the skill orbit from briefing", () => {
    const command = routeAction({
      action: { kind: "orbit" },
      mode: "briefing",
      encounterComplete: false,
    })

    expect(command).toEqual({ kind: "open-skill-orbit" })
  })

  it("routes horizontal movement inside the skill orbit", () => {
    const nextCommand = routeAction({
      action: { kind: "move", direction: "east" },
      mode: "skill-orbit",
      encounterComplete: false,
    })
    const previousCommand = routeAction({
      action: { kind: "move", direction: "west" },
      mode: "skill-orbit",
      encounterComplete: false,
    })

    expect(nextCommand).toEqual({ kind: "orbit-next" })
    expect(previousCommand).toEqual({ kind: "orbit-previous" })
  })

  it("selects the highlighted skill orbit station on confirm", () => {
    const command = routeAction({
      action: { kind: "confirm" },
      mode: "skill-orbit",
      encounterComplete: false,
    })

    expect(command).toEqual({ kind: "select-skill-orbit" })
  })
})
