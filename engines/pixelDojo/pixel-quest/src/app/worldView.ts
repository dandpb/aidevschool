import type { EncounterDefinition } from "../content/types"
import { type SkillOrbitStation, selectedSkillOrbitStation } from "../game/simulation/skillOrbit"
import type { WorldState } from "../game/simulation/types"
import { getInteraction, isUnitCompleted } from "../game/simulation/world"

export type WorldHudParams = {
  readonly objective: string
  readonly completed: boolean
  readonly phase: WorldState["progress"]["phase"]
  readonly prompt: string
  readonly reviewTrack: WorldState["progress"]["reviewTrack"]
  readonly latestEvidence: WorldState["progress"]["latestEvidence"]
}

export type SkillOrbitHudParams = {
  readonly station: SkillOrbitStation
  readonly totalUnits: number
  readonly reviewTrack: WorldState["progress"]["reviewTrack"]
}

export function worldHudParams(
  world: WorldState,
  encounters: readonly EncounterDefinition[],
): WorldHudParams {
  return {
    objective: currentObjectiveText(world, encounters),
    completed: isUnitCompleted(world, currentUnitId(world, encounters)),
    phase: world.progress.phase,
    prompt: worldPrompt(world),
    reviewTrack: world.progress.reviewTrack,
    latestEvidence: world.progress.latestEvidence,
  }
}

export function skillOrbitHudParams(world: WorldState, totalUnits: number): SkillOrbitHudParams {
  return {
    station: selectedSkillOrbitStation(world),
    totalUnits,
    reviewTrack: world.progress.reviewTrack,
  }
}

export function currentObjectiveText(
  world: WorldState,
  encounters: readonly EncounterDefinition[],
): string {
  const unit = world.pack.units.find(
    (candidate) => candidate.unit_id === currentUnitId(world, encounters),
  )
  return unit === undefined ? world.region.name : `${world.region.name}: ${unit.concept}`
}

export function currentUnitId(
  world: WorldState,
  encounters: readonly EncounterDefinition[],
): string {
  return findEncounter(encounters, currentEncounterId(world)).unit_id
}

export function currentEncounterId(world: WorldState): string {
  const npc = world.region.npcs[0]
  if (npc === undefined) {
    throw new Error(`Region ${world.region.id} has no mentor`)
  }
  return npc.encounterId
}

export function findEncounter(
  encounters: readonly EncounterDefinition[],
  encounterId: string,
): EncounterDefinition {
  const encounter = encounters.find((candidate) => candidate.id === encounterId)
  if (encounter === undefined) {
    throw new Error(`Unknown encounter ${encounterId}`)
  }
  return encounter
}

export function worldPrompt(world: WorldState): string {
  const interaction = getInteraction(world)
  if (interaction.kind === "npc") {
    return "E: falar | O: orbita | J: diario | H: fases"
  }
  if (interaction.kind === "gate") {
    return "E: inspecionar gate | O: orbita | J: diario | H: fases"
  }
  return "Setas/WASD: mover | O: orbita | J: diario | H: fases"
}
