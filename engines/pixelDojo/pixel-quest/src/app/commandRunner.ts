import type { Direction } from "../game/simulation/types"
import type { RouteCommand } from "./actionRouter"

export type CommandHandlers = {
  readonly move: (direction: Direction) => void
  readonly applyEncounterInput: (action: "admit" | "reject") => void
  readonly startQuest: () => void
  readonly interact: () => void
  readonly openSkillOrbit: () => void
  readonly stepSkillOrbit: (direction: "previous" | "next") => void
  readonly openSelectedSkillOrbitLab: () => void
  readonly openHelp: () => void
  readonly openJournal: () => void
  readonly openPractice: () => void
  readonly startEncounter: () => void
  readonly closePanel: () => void
}

export function runRouteCommand(command: RouteCommand, handlers: CommandHandlers): void {
  switch (command.kind) {
    case "none":
      return
    case "move":
      handlers.move(command.action.direction)
      return
    case "apply-encounter":
      handlers.applyEncounterInput(command.action)
      return
    case "start-quest":
      handlers.startQuest()
      return
    case "interact":
      handlers.interact()
      return
    case "open-skill-orbit":
      handlers.openSkillOrbit()
      return
    case "orbit-previous":
      handlers.stepSkillOrbit("previous")
      return
    case "orbit-next":
      handlers.stepSkillOrbit("next")
      return
    case "select-skill-orbit":
      handlers.openSelectedSkillOrbitLab()
      return
    case "open-help":
      handlers.openHelp()
      return
    case "open-journal":
      handlers.openJournal()
      return
    case "open-practice":
      handlers.openPractice()
      return
    case "start-encounter":
      handlers.startEncounter()
      return
    case "close-panel":
      handlers.closePanel()
      return
  }
}
