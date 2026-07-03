import type { RegionNpc } from "../content/types"
import type { WorldState } from "../game/simulation/types"
import { enterGate, enterRegion, getInteraction, setMode } from "../game/simulation/world"

export type InteractionFlowResult =
  | {
      readonly kind: "dialogue"
      readonly world: WorldState
      readonly npc: RegionNpc
      readonly dialogue: string
    }
  | {
      readonly kind: "gate-message"
      readonly world: WorldState
      readonly label: string
    }
  | {
      readonly kind: "region"
      readonly world: WorldState
    }
  | {
      readonly kind: "none"
    }

export function applyInteractionFlow(
  world: WorldState,
  dialogues: Readonly<Record<string, string>>,
): InteractionFlowResult {
  const interaction = getInteraction(world)
  if (interaction.kind === "npc") {
    return {
      kind: "dialogue",
      world: setMode(world, "dialogue"),
      npc: interaction.npc,
      dialogue: dialogues[interaction.npc.dialogueRef] ?? "",
    }
  }
  if (interaction.kind === "gate") {
    if (interaction.unlocked && interaction.gate.nextRegionId !== undefined) {
      return {
        kind: "region",
        world: enterRegion(world, interaction.gate.nextRegionId),
      }
    }
    return {
      kind: "gate-message",
      world: enterGate(world),
      label: interaction.unlocked ? interaction.gate.unlockedLabel : interaction.gate.lockedLabel,
    }
  }
  return { kind: "none" }
}
