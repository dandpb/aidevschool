/**
 * Coordinates the per-domain scene renderers (zones / roads / buildings) and
 * keeps them in sync with the Town. Subscribes to a Town change listener so
 * placeZone / recomputeRoads / tick updates flow through automatically.
 *
 * One WorldView per game session. The constructor parents all renderer
 * groups under a single `world` Group, which the scene module can hide or
 * move as a unit.
 */

import * as THREE from "three"
import { BuildingsRenderer } from "./buildings"
import { RoadsRenderer } from "./roads"
import type { Town } from "./state"
import { ZonesRenderer } from "./zones"

export class WorldView {
  readonly group: THREE.Group
  readonly zones: ZonesRenderer
  readonly roads: RoadsRenderer
  readonly buildings: BuildingsRenderer
  readonly #unsubscribe: () => void

  constructor(town: Town, parentScene: THREE.Scene) {
    this.group = new THREE.Group()
    this.group.name = "world"
    this.zones = new ZonesRenderer(town)
    this.roads = new RoadsRenderer(town)
    this.buildings = new BuildingsRenderer(town)
    this.group.add(this.zones.group, this.roads.group, this.buildings.group)
    parentScene.add(this.group)
    this.#unsubscribe = town.subscribe(() => this.sync())
  }

  /** Pull current Town state into all three renderers. */
  sync(): void {
    this.zones.sync()
    this.roads.sync()
    this.buildings.sync()
  }

  dispose(): void {
    this.#unsubscribe()
    this.zones.dispose()
    this.roads.dispose()
    this.buildings.dispose()
    this.group.parent?.remove(this.group)
  }
}

// Re-export so callers can `import { WorldView } from "./worldView"` without
// touching the Town class directly.
export { buildingVariation } from "../sim/variation"
