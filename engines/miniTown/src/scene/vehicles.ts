/**
 * Three.js renderer for vehicles. The spec asks for:
 *
 *   - body: BoxGeometry 1.0 × 0.4 × 0.5, paint colour
 *   - hood: smaller BoxGeometry on top, same paint colour
 *   - 4 wheels: cylinders, 0.15 radius, 0.1 height, black
 *   - rotation: aligned with the path's heading
 *
 * One Group per vehicle, parented under `this.group`. The Group's
 * position is the car centre. The car is 1 unit long along +X (or
 * +Z — see below). The renderer reads `vehicle.currentCell`,
 * `vehicle.path`, `vehicle.pathIndex`, and `vehicle.progressAlongSegment`
 * to place the car between two cells when the segment progress is
 * non-zero.
 *
 * The car's "front" is +X by convention; the heading unit vector is
 * rotated to face the next waypoint. Wheel positions are static
 * (relative to the body) so the car rolls forward as a whole.
 */

import * as THREE from "three"
import type { Town } from "../scene/state"
import { TILES } from "../sim/grid"
import { segmentPoint } from "../sim/paths"
import type { Vehicle } from "../sim/vehicles"
import { disposeTree } from "./dispose"

const HALF = TILES / 2

interface VehicleEntry {
  readonly root: THREE.Group
}

const WHEEL_COLOR = "#1a1a1a"
const TIRE_RADIUS = 0.15
const TIRE_HEIGHT = 0.1
const BODY_LENGTH = 1.0
const BODY_WIDTH = 0.5
const BODY_HEIGHT = 0.4
const HOOD_LENGTH = 0.45
const HOOD_WIDTH = 0.46
const HOOD_HEIGHT = 0.18

export class VehiclesRenderer {
  readonly group = new THREE.Group()
  readonly #entries = new Map<string, VehicleEntry>()
  readonly #town: Town

  constructor(town: Town) {
    this.#town = town
    this.group.name = "vehicles"
    this.sync()
  }

  /** Pull the latest vehicle list from the Town and reconcile entries. */
  sync(): void {
    const seen = new Set<string>()
    for (const vehicle of this.#town.vehicles) {
      seen.add(vehicle.id)
      let entry = this.#entries.get(vehicle.id)
      if (!entry) {
        entry = this.#create(vehicle)
        this.#entries.set(vehicle.id, entry)
        this.group.add(entry.root)
      }
      this.#updateEntry(entry, vehicle)
    }
    for (const [id, entry] of this.#entries) {
      if (!seen.has(id)) {
        this.group.remove(entry.root)
        disposeTree(entry.root)
        this.#entries.delete(id)
      }
    }
  }

  #create(vehicle: Vehicle): VehicleEntry {
    const root = new THREE.Group()
    root.name = `vehicle:${vehicle.id}`

    // Body box.
    const bodyGeo = new THREE.BoxGeometry(BODY_LENGTH, BODY_HEIGHT, BODY_WIDTH)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: vehicle.color,
      roughness: 0.65,
      metalness: 0.2,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = TIRE_RADIUS + BODY_HEIGHT / 2
    body.castShadow = true
    body.receiveShadow = true
    root.add(body)

    // Hood — a smaller box on top, biased toward +X (the car's "front").
    const hoodGeo = new THREE.BoxGeometry(HOOD_LENGTH, HOOD_HEIGHT, HOOD_WIDTH)
    const hoodMat = new THREE.MeshStandardMaterial({
      color: vehicle.color,
      roughness: 0.55,
      metalness: 0.3,
    })
    const hood = new THREE.Mesh(hoodGeo, hoodMat)
    hood.position.set(0.15, TIRE_RADIUS + BODY_HEIGHT + HOOD_HEIGHT / 2, 0)
    hood.castShadow = true
    root.add(hood)

    // Four wheels as a child Group so we can scale / rotate them as a
    // unit. We use CylinderGeometry with `height` along Y; laying the
    // wheel flat on the road needs a rotation around Z by 90°.
    const wheels = new THREE.Group()
    wheels.name = "wheels"
    const wheelGeo = new THREE.CylinderGeometry(TIRE_RADIUS, TIRE_RADIUS, TIRE_HEIGHT, 10)
    const wheelMat = new THREE.MeshStandardMaterial({
      color: WHEEL_COLOR,
      roughness: 0.95,
    })
    const offsets: ReadonlyArray<readonly [number, number]> = [
      [BODY_LENGTH / 2 - 0.15, BODY_WIDTH / 2 + TIRE_HEIGHT / 2 - 0.02],
      [BODY_LENGTH / 2 - 0.15, -(BODY_WIDTH / 2 + TIRE_HEIGHT / 2 - 0.02)],
      [-BODY_LENGTH / 2 + 0.15, BODY_WIDTH / 2 + TIRE_HEIGHT / 2 - 0.02],
      [-BODY_LENGTH / 2 + 0.15, -(BODY_WIDTH / 2 + TIRE_HEIGHT / 2 - 0.02)],
    ]
    for (const [x, z] of offsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat)
      wheel.position.set(x, TIRE_RADIUS, z)
      wheel.rotation.z = Math.PI / 2
      wheel.castShadow = true
      wheels.add(wheel)
    }
    root.add(wheels)

    return { root }
  }

  #updateEntry(entry: VehicleEntry, vehicle: Vehicle): void {
    // Sub-cell position from path[pathIndex-1] → path[pathIndex].
    const point =
      vehicle.path.length > 0 && vehicle.pathIndex > 0
        ? segmentPoint(
            vehicle.path,
            vehicle.pathIndex,
            vehicle.progressAlongSegment,
            vehicle.currentCell,
          )
        : vehicle.currentCell
    entry.root.position.set(point.x - HALF + 0.5, 0, point.y - HALF + 0.5)

    // Heading — rotate the body to face the next waypoint.
    const heading = vehicle.heading()
    if (heading) {
      // The car's "front" is +X. We want +X to align with the heading
      // vector, so yaw is `atan2(heading.y, heading.x)`. Note the
      // Y-flip: in world space we move on XZ, not XY.
      entry.root.rotation.y = Math.atan2(-heading.y, heading.x)
    }
  }

  dispose(): void {
    for (const [, entry] of this.#entries) {
      this.group.remove(entry.root)
      disposeTree(entry.root)
    }
    this.#entries.clear()
  }
}
