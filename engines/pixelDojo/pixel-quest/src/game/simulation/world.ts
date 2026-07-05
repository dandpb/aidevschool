import { type ContentPack, type Position, type Region, tileLegend } from "../../content/types"
import type { PixelQuestEvidenceRecord } from "../evidence/types"
import type { GamePhase } from "../phases/types"
import { createReviewTrack, updateReviewTrackFromEvidence } from "../review/reviewTrack"
import {
  createSkillOrbitState,
  type SkillOrbitDirection,
  selectedSkillOrbitRegionId,
  selectSkillOrbitStation,
} from "./skillOrbit"
import type { Direction, Interaction, TileView, WorldState } from "./types"

export function createWorld(pack: ContentPack, regionId: string): WorldState {
  const region = pack.regions.find((candidate) => candidate.id === regionId)
  if (region === undefined) {
    throw new Error(`Unknown region ${regionId}`)
  }
  return {
    pack,
    region,
    player: {
      position: region.start,
      facing: "north",
    },
    progress: {
      completedUnitIds: [],
      phase: "briefing",
      reviewTrack: createReviewTrack(),
    },
    skillOrbit: createSkillOrbitState(pack),
    mode: "briefing",
  }
}

export function movePlayer(world: WorldState, direction: Direction): WorldState {
  const destination = addDirection(world.player.position, direction)
  if (!isWalkable(world, destination)) {
    return {
      ...world,
      player: {
        ...world.player,
        facing: direction,
      },
    }
  }
  return {
    ...world,
    player: {
      position: destination,
      facing: direction,
    },
  }
}

export function setMode(world: WorldState, mode: WorldState["mode"]): WorldState {
  return { ...world, mode }
}

export function setPhase(world: WorldState, phase: GamePhase): WorldState {
  return {
    ...world,
    progress: {
      ...world.progress,
      phase,
    },
  }
}

export function enterWorld(world: WorldState): WorldState {
  return setPhase(setMode(world, "world"), "map")
}

export function enterSkillOrbit(world: WorldState): WorldState {
  const currentUnit = world.pack.units.find((unit) => unit.project === world.region.project)
  const returnMode = world.mode === "briefing" ? "briefing" : "world"
  return setPhase(
    {
      ...setMode(world, "skill-orbit"),
      skillOrbit: {
        selectedUnitId: currentUnit?.unit_id ?? world.skillOrbit.selectedUnitId,
        returnMode,
      },
    },
    "orbit",
  )
}

export function exitSkillOrbit(world: WorldState): WorldState {
  return world.skillOrbit.returnMode === "briefing"
    ? setPhase(setMode(world, "briefing"), "briefing")
    : enterWorld(world)
}

export function enterPractice(world: WorldState): WorldState {
  return setPhase(setMode(world, "practice"), "practice")
}

export function enterDuel(world: WorldState): WorldState {
  return setPhase(setMode(world, "encounter"), "duel")
}

// The circuit-breaker duel uses the same duel phase as a regular encounter but
// projects the route_health state through the 3D CircuitBreakerScene instead of
// the 2.5D world. Phase "duel" keeps the HUD, review-track and evidence flow
// identical — only the renderer dispatch differs (see WorldRenderer.sync).
export function enterCircuitBreakerDuel(world: WorldState): WorldState {
  return setPhase(setMode(world, "circuit-breaker"), "duel")
}

// The auth-gate duel uses the same duel phase as a regular encounter but
// projects the policy_gate state through the 3D PolicyGateScene instead of the
// 2.5D world. Phase "duel" keeps the HUD, review-track and evidence flow
// identical — only the renderer dispatch differs (see WorldRenderer.sync).
export function enterAuthGateDuel(world: WorldState): WorldState {
  return setPhase(setMode(world, "auth-gate"), "duel")
}

export function enterJournal(world: WorldState): WorldState {
  return setPhase(setMode(world, "journal"), "review")
}

export function enterGate(world: WorldState): WorldState {
  return setPhase(setMode(world, "dialogue"), "gate")
}

export function enterRegion(world: WorldState, regionId: string): WorldState {
  const region = world.pack.regions.find((candidate) => candidate.id === regionId)
  if (region === undefined) {
    throw new Error(`Unknown region ${regionId}`)
  }
  return {
    ...world,
    region,
    player: {
      position: region.start,
      facing: "north",
    },
    mode: "world",
    progress: {
      ...world.progress,
      phase: "map",
    },
  }
}

export function selectSkillOrbit(world: WorldState, direction: SkillOrbitDirection): WorldState {
  return {
    ...world,
    skillOrbit: selectSkillOrbitStation(world, direction),
  }
}

export function enterSelectedSkillOrbitRegion(world: WorldState): WorldState {
  const regionId = selectedSkillOrbitRegionId(world)
  return regionId === undefined ? world : enterRegion(world, regionId)
}

export function recordEvidence(world: WorldState, evidence: PixelQuestEvidenceRecord): WorldState {
  const nextCompleted = evidence.pass
    ? addUnique(world.progress.completedUnitIds, evidence.unit_id)
    : world.progress.completedUnitIds
  return {
    ...world,
    progress: {
      completedUnitIds: nextCompleted,
      phase: "evidence",
      reviewTrack: updateReviewTrackFromEvidence(world.progress.reviewTrack, evidence),
      latestEvidence: evidence,
    },
  }
}

export function getInteraction(world: WorldState): Interaction {
  const target = addDirection(world.player.position, world.player.facing)
  const npc = world.region.npcs.find((candidate) => samePosition(candidate.position, target))
  if (npc !== undefined) {
    return { kind: "npc", npc }
  }
  const gate = world.region.gates.find((candidate) => samePosition(candidate.position, target))
  if (gate !== undefined) {
    return {
      kind: "gate",
      gate,
      unlocked: isUnitCompleted(world, gate.requiresUnitId),
    }
  }
  return { kind: "none" }
}

export function getTileViews(region: Region): readonly TileView[] {
  const tiles: TileView[] = []
  for (let y = 0; y < region.map.height; y += 1) {
    const row = region.map.tiles[y] ?? ""
    for (let x = 0; x < region.map.width; x += 1) {
      const code = row.charAt(x)
      const kind = code in tileLegend ? tileLegend[code as keyof typeof tileLegend] : "wall"
      tiles.push({ position: { x, y }, kind })
    }
  }
  return tiles
}

export function isUnitCompleted(world: WorldState, unitId: string): boolean {
  return world.progress.completedUnitIds.includes(unitId)
}

export function getTileKind(region: Region, position: Position): TileView["kind"] {
  if (
    position.x < 0 ||
    position.y < 0 ||
    position.x >= region.map.width ||
    position.y >= region.map.height
  ) {
    return "wall"
  }
  const row = region.map.tiles[position.y]
  const code = row?.charAt(position.x) ?? "#"
  return code in tileLegend ? tileLegend[code as keyof typeof tileLegend] : "wall"
}

function isWalkable(world: WorldState, position: Position): boolean {
  if (world.region.npcs.some((npc) => samePosition(npc.position, position))) {
    return false
  }
  const gate = world.region.gates.find((candidate) => samePosition(candidate.position, position))
  if (gate !== undefined && !isUnitCompleted(world, gate.requiresUnitId)) {
    return false
  }
  const tile = getTileKind(world.region, position)
  return tile !== "wall" && tile !== "water"
}

function addDirection(position: Position, direction: Direction): Position {
  if (direction === "north") {
    return { x: position.x, y: position.y - 1 }
  }
  if (direction === "south") {
    return { x: position.x, y: position.y + 1 }
  }
  if (direction === "east") {
    return { x: position.x + 1, y: position.y }
  }
  return { x: position.x - 1, y: position.y }
}

function addUnique(values: readonly string[], next: string): readonly string[] {
  return values.includes(next) ? values : [...values, next]
}

function samePosition(left: Position, right: Position): boolean {
  return left.x === right.x && left.y === right.y
}
