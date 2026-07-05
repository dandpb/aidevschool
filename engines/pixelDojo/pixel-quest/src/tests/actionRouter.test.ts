import { describe, expect, it } from "vitest"
import { type RouteState, routeAction } from "../app/actionRouter"
import type { InputAction } from "../game/input/actions"
import type { WorldMode } from "../game/simulation/types"

const ENCOUNTER_MODES: readonly WorldMode[] = ["encounter", "circuit-breaker", "auth-gate"]

function route(action: InputAction, mode: WorldMode, encounterComplete = false) {
  const state: RouteState = { action, mode, encounterComplete }
  return routeAction(state)
}

describe("action router", () => {
  describe("briefing", () => {
    it("starts the quest from briefing on confirm", () => {
      expect(route({ kind: "confirm" }, "briefing")).toEqual({ kind: "start-quest" })
    })

    it("opens the journal from briefing", () => {
      expect(route({ kind: "journal" }, "briefing")).toEqual({ kind: "open-journal" })
    })

    it("ignores actions without a briefing meaning", () => {
      expect(route({ kind: "cancel" }, "briefing")).toEqual({ kind: "none" })
      expect(route({ kind: "move", direction: "north" }, "briefing")).toEqual({ kind: "none" })
      expect(route({ kind: "admit" }, "briefing")).toEqual({ kind: "none" })
    })
  })

  describe("world", () => {
    it("routes movement with the original action attached", () => {
      const action: InputAction = { kind: "move", direction: "south" }

      expect(route(action, "world")).toEqual({ kind: "move", action })
    })

    it("interacts on confirm and opens the journal", () => {
      expect(route({ kind: "confirm" }, "world")).toEqual({ kind: "interact" })
      expect(route({ kind: "journal" }, "world")).toEqual({ kind: "open-journal" })
    })

    it("ignores encounter-only actions outside an encounter", () => {
      expect(route({ kind: "admit" }, "world")).toEqual({ kind: "none" })
      expect(route({ kind: "reject" }, "world")).toEqual({ kind: "none" })
      expect(route({ kind: "cancel" }, "world")).toEqual({ kind: "none" })
    })
  })

  describe("encounter driver seam (encounter, circuit-breaker, auth-gate)", () => {
    it("routes admit and reject to the encounter driver in every duel mode", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "admit" }, mode)).toEqual({
          kind: "apply-encounter",
          action: "admit",
        })
        expect(route({ kind: "reject" }, mode)).toEqual({
          kind: "apply-encounter",
          action: "reject",
        })
      }
    })

    it("still routes admit after completion — the completion guard lives in the driver layer", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "admit" }, mode, true)).toEqual({
          kind: "apply-encounter",
          action: "admit",
        })
      }
    })

    it("blocks confirm and journal until the encounter is complete", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "confirm" }, mode)).toEqual({ kind: "none" })
        expect(route({ kind: "journal" }, mode)).toEqual({ kind: "none" })
      }
    })

    it("closes on confirm and opens the journal once the encounter is complete", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "confirm" }, mode, true)).toEqual({ kind: "close-panel" })
        expect(route({ kind: "journal" }, mode, true)).toEqual({ kind: "open-journal" })
      }
    })

    it("always allows cancel to abandon the duel", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "cancel" }, mode)).toEqual({ kind: "close-panel" })
        expect(route({ kind: "cancel" }, mode, true)).toEqual({ kind: "close-panel" })
      }
    })

    it("ignores movement during a duel", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "move", direction: "east" }, mode)).toEqual({ kind: "none" })
      }
    })
  })

  describe("help shortcut", () => {
    it("blocks help while an encounter is active", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "help" }, mode)).toEqual({ kind: "none" })
      }
    })

    it("opens help once the encounter is complete", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "help" }, mode, true)).toEqual({ kind: "open-help" })
      }
    })

    it("opens help from every non-duel mode", () => {
      const modes: readonly WorldMode[] = [
        "briefing",
        "world",
        "dialogue",
        "practice",
        "skill-orbit",
        "journal",
        "help",
      ]
      for (const mode of modes) {
        expect(route({ kind: "help" }, mode)).toEqual({ kind: "open-help" })
      }
    })
  })

  describe("orbit shortcut", () => {
    it("opens the skill orbit from briefing", () => {
      expect(route({ kind: "orbit" }, "briefing")).toEqual({ kind: "open-skill-orbit" })
    })

    it("opens the skill orbit from the world", () => {
      expect(route({ kind: "orbit" }, "world")).toEqual({ kind: "open-skill-orbit" })
    })

    it("toggles the orbit closed when it is already open", () => {
      expect(route({ kind: "orbit" }, "skill-orbit")).toEqual({ kind: "close-panel" })
    })

    it("is blocked during a duel, even after completion", () => {
      for (const mode of ENCOUNTER_MODES) {
        expect(route({ kind: "orbit" }, mode)).toEqual({ kind: "none" })
        expect(route({ kind: "orbit" }, mode, true)).toEqual({ kind: "none" })
      }
    })

    it("is inert inside panels", () => {
      const modes: readonly WorldMode[] = ["dialogue", "practice", "journal", "help"]
      for (const mode of modes) {
        expect(route({ kind: "orbit" }, mode)).toEqual({ kind: "none" })
      }
    })
  })

  describe("dialogue", () => {
    it("routes dialogue confirmation into practice before the duel", () => {
      expect(route({ kind: "confirm" }, "dialogue")).toEqual({ kind: "open-practice" })
    })

    it("closes on cancel or journal and ignores everything else", () => {
      expect(route({ kind: "cancel" }, "dialogue")).toEqual({ kind: "close-panel" })
      expect(route({ kind: "journal" }, "dialogue")).toEqual({ kind: "close-panel" })
      expect(route({ kind: "move", direction: "west" }, "dialogue")).toEqual({ kind: "none" })
      expect(route({ kind: "admit" }, "dialogue")).toEqual({ kind: "none" })
    })
  })

  describe("practice", () => {
    it("starts the encounter on confirm", () => {
      expect(route({ kind: "confirm" }, "practice")).toEqual({ kind: "start-encounter" })
    })

    it("opens the journal, closes on cancel, ignores movement", () => {
      expect(route({ kind: "journal" }, "practice")).toEqual({ kind: "open-journal" })
      expect(route({ kind: "cancel" }, "practice")).toEqual({ kind: "close-panel" })
      expect(route({ kind: "move", direction: "north" }, "practice")).toEqual({ kind: "none" })
    })
  })

  describe("skill orbit", () => {
    it("opens the skill orbit from briefing", () => {
      expect(route({ kind: "orbit" }, "briefing")).toEqual({ kind: "open-skill-orbit" })
    })

    it("routes horizontal movement inside the skill orbit", () => {
      expect(route({ kind: "move", direction: "east" }, "skill-orbit")).toEqual({
        kind: "orbit-next",
      })
      expect(route({ kind: "move", direction: "west" }, "skill-orbit")).toEqual({
        kind: "orbit-previous",
      })
    })

    it("ignores vertical movement inside the skill orbit", () => {
      expect(route({ kind: "move", direction: "north" }, "skill-orbit")).toEqual({ kind: "none" })
      expect(route({ kind: "move", direction: "south" }, "skill-orbit")).toEqual({ kind: "none" })
    })

    it("selects the highlighted skill orbit station on confirm", () => {
      expect(route({ kind: "confirm" }, "skill-orbit")).toEqual({ kind: "select-skill-orbit" })
    })

    it("closes on cancel or journal", () => {
      expect(route({ kind: "cancel" }, "skill-orbit")).toEqual({ kind: "close-panel" })
      expect(route({ kind: "journal" }, "skill-orbit")).toEqual({ kind: "close-panel" })
    })
  })

  describe("journal and help panels", () => {
    it("closes on confirm, cancel, or journal", () => {
      const modes: readonly WorldMode[] = ["journal", "help"]
      for (const mode of modes) {
        expect(route({ kind: "confirm" }, mode)).toEqual({ kind: "close-panel" })
        expect(route({ kind: "cancel" }, mode)).toEqual({ kind: "close-panel" })
        expect(route({ kind: "journal" }, mode)).toEqual({ kind: "close-panel" })
      }
    })

    it("ignores movement and encounter actions", () => {
      const modes: readonly WorldMode[] = ["journal", "help"]
      for (const mode of modes) {
        expect(route({ kind: "move", direction: "east" }, mode)).toEqual({ kind: "none" })
        expect(route({ kind: "admit" }, mode)).toEqual({ kind: "none" })
        expect(route({ kind: "reject" }, mode)).toEqual({ kind: "none" })
      }
    })
  })
})
