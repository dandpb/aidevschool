/**
 * Resident population. Called by the Town's late-inhabit hook (and via
 * `spawnResidentsForTown` on demand) to populate the town with residents
 * for each inhabited residential building, then assign them to nearby
 * inhabited workspaces.
 *
 * Caps:
 *   - Up to MAX_RESIDENTS residents total (default 50 — matches the spec).
 *   - 1..3 residents per inhabited residential building (uniform).
 *   - A resident's workplace must be ≤ WORK_RADIUS cells (Manhattan) from
 *     their home. Unplaceable residents stay as homemakers (workId = null).
 *
 * Determinism: the Town's per-instance RNG governs all rolls. The same
 * sequence of `placeZone` calls in the same order yields the same resident
 * layout.
 */

import type { Building, Town } from "../scene/state"
import { manhattan } from "./paths"
import { Resident } from "./residents"

/** Performance cap from the spec. */
export const MAX_RESIDENTS = 50
/** Min residents per inhabited residential building. */
const MIN_PER_HOME = 1
/** Max residents per inhabited residential building. */
const MAX_PER_HOME = 3
/** Max Manhattan distance from home to a candidate workplace. */
const WORK_RADIUS = 8

/**
 * Idempotent population pass. Walks the inhabited residential buildings
 * and, for each, rolls 1..3 residents if the cap has not been hit. Then
 * assigns each resident without a `workId` to a random inhabited workspace
 * within the radius.
 */
export function spawnResidentsForTown(town: Town): void {
  const residentials: Building[] = []
  const workspaces: Building[] = []
  for (const building of town.buildings) {
    if (building.stage !== "inhabited") continue
    const zone = town.findZoneById(building.zoneId)
    if (!zone) continue
    if (zone.type === "residential") residentials.push(building)
    else if (zone.type === "workspace") workspaces.push(building)
  }
  if (residentials.length === 0) return
  if (town.residents.length >= MAX_RESIDENTS) return

  // Map homeId -> resident count already spawned for that home, so we
  // don't double-spawn on repeated ticks.
  const existingPerHome = new Map<string, number>()
  for (const resident of town.residents) {
    existingPerHome.set(resident.homeId, (existingPerHome.get(resident.homeId) ?? 0) + 1)
  }

  for (const home of residentials) {
    const existing = existingPerHome.get(home.id) ?? 0
    if (existing >= MAX_PER_HOME) continue
    const target = MIN_PER_HOME + Math.floor(town.rng() * (MAX_PER_HOME - MIN_PER_HOME + 1))
    const toSpawn = Math.min(target - existing, MAX_PER_HOME - existing)
    for (let i = 0; i < toSpawn; i++) {
      if (town.residents.length >= MAX_RESIDENTS) return
      const id = `p-${home.id}-${existing + i + 1}-${town.residents.length + 1}`
      const resident = new Resident(id, home.id, null, home.cell)
      town.addResident(resident)
    }
  }

  // Second pass: assign work. Walk residents whose workId is null and
  // try each workspace in shuffled order.
  const shuffledWorkspaces = shuffle(town, workspaces.slice())
  for (const resident of town.residents) {
    if (resident.workId !== null) continue
    if (shuffledWorkspaces.length === 0) break
    for (const ws of shuffledWorkspaces) {
      if (manhattan(ws.cell, resident.currentCell) <= WORK_RADIUS) {
        resident.workId = ws.id
        break
      }
    }
  }
}

function shuffle<T>(town: Town, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(town.rng() * (i + 1))
    const tmp = arr[i] as T
    const swap = arr[j] as T
    arr[i] = swap
    arr[j] = tmp
  }
  return arr
}
