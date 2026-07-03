import type { UnitDefinition } from "../../content/types"
import type { SkillOrbitState, WorldState } from "./types"

export type SkillOrbitDirection = "previous" | "next"

export type SkillOrbitStation = {
  readonly unitId: string
  readonly project: string
  readonly title: string
  readonly concept: string
  readonly mechanicName: string
  readonly index: number
  readonly total: number
  readonly completed: boolean
  readonly locked: boolean
}

export function createSkillOrbitState(pack: WorldState["pack"]): SkillOrbitState {
  const first = pack.units[0]
  if (first === undefined) {
    throw new Error("Skill orbit needs at least one curriculum unit")
  }
  return {
    selectedUnitId: first.unit_id,
    returnMode: "briefing",
  }
}

export function skillOrbitStations(world: WorldState): readonly SkillOrbitStation[] {
  return world.pack.units.map((unit, index) => ({
    unitId: unit.unit_id,
    project: unit.project,
    title: titleForUnit(world, unit),
    concept: unit.concept,
    mechanicName: mechanicForUnit(world, unit),
    index,
    total: world.pack.units.length,
    completed: world.progress.completedUnitIds.includes(unit.unit_id),
    locked: !unit.prerequisites.every((unitId) => world.progress.completedUnitIds.includes(unitId)),
  }))
}

export function selectedSkillOrbitStation(world: WorldState): SkillOrbitStation {
  const station =
    skillOrbitStations(world).find(
      (candidate) => candidate.unitId === world.skillOrbit.selectedUnitId,
    ) ?? skillOrbitStations(world)[0]
  if (station === undefined) {
    throw new Error("Skill orbit has no station to select")
  }
  return station
}

export function selectSkillOrbitStation(
  world: WorldState,
  direction: SkillOrbitDirection,
): SkillOrbitState {
  const units = world.pack.units
  const currentIndex = Math.max(
    0,
    units.findIndex((unit) => unit.unit_id === world.skillOrbit.selectedUnitId),
  )
  const delta = direction === "next" ? 1 : -1
  const nextIndex = (currentIndex + delta + units.length) % units.length
  const next = units[nextIndex]
  if (next === undefined) {
    return world.skillOrbit
  }
  return {
    ...world.skillOrbit,
    selectedUnitId: next.unit_id,
  }
}

export function selectedSkillOrbitRegionId(world: WorldState): string | undefined {
  const station = selectedSkillOrbitStation(world)
  if (station.locked) {
    return undefined
  }
  return world.pack.regions.find((region) => region.project === station.project)?.id
}

function titleForUnit(world: WorldState, unit: UnitDefinition): string {
  return (
    world.pack.encounters.find((encounter) => encounter.unit_id === unit.unit_id)?.title ??
    unit.project
  )
}

function mechanicForUnit(world: WorldState, unit: UnitDefinition): string {
  return (
    world.pack.encounters.find((encounter) => encounter.unit_id === unit.unit_id)?.mechanicName ??
    "Curriculum Lab"
  )
}
