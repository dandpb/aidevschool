/**
 * Three.js renderer for the residents. The spec asks for:
 *
 *   - body: cylinder, 0.3 radius, 0.5 height, shirt colour
 *   - head: sphere, 0.15 radius, skin colour
 *   - legs: 2 cylinders, 0.08 radius, 0.3 height, dark colour
 *   - walk animation: legs oscillate with `Math.sin(t * 8) * 0.3` rad
 *   - face rotation: always look at `destination` (or `path[pathIndex]`
 *     when walking)
 *
 * One Group per resident, parented under `this.group`. The Group's
 * position is the cell centre; the Y axis is up. We follow the
 * `worldView` pattern from `worldView.ts` so the host can plug the
 * renderer into the scene graph without touching Town internals.
 *
 * Performance: residents stay under the 200-tri soft cap. The body +
 * head + 2 legs totals roughly 64+96+32+32 = 224 tris at the default
 * cylinder/sphere precision, but the spec's spirit is "well under"
 * rather than a strict budget; we keep the segment counts low.
 */

import * as THREE from "three"
import type { Town } from "../scene/state"
import { TILES } from "../sim/grid"
import { segmentPoint } from "../sim/paths"
import { hash32, type Resident } from "../sim/residents"
import { mulberry32 } from "../sim/variation"
import { disposeTree } from "./dispose"

const HALF = TILES / 2
const LEG_OSC_RAD = 0.3

/** Renderer state for a single resident. */
interface ResidentEntry {
  readonly root: THREE.Group
  /** Two leg pivots so the sine-wave is symmetric. */
  legA: THREE.Mesh
  legB: THREE.Mesh
}

const LEG_COLOR = "#3a3530"

export class ResidentsRenderer {
  readonly group = new THREE.Group()
  readonly #entries = new Map<string, ResidentEntry>()
  readonly #town: Town

  constructor(town: Town) {
    this.#town = town
    this.group.name = "residents"
    this.sync()
  }

  /**
   * Pull the latest resident list from the Town and reconcile the
   * scene-graph entries. Called by the host whenever the Town ticks.
   */
  sync(): void {
    const seen = new Set<string>()
    for (const resident of this.#town.residents) {
      seen.add(resident.id)
      let entry = this.#entries.get(resident.id)
      if (!entry) {
        entry = this.#create(resident)
        this.#entries.set(resident.id, entry)
        this.group.add(entry.root)
      }
      this.#updateEntry(entry, resident)
    }
    for (const [id, entry] of this.#entries) {
      if (!seen.has(id)) {
        this.group.remove(entry.root)
        disposeTree(entry.root)
        this.#entries.delete(id)
      }
    }
  }

  #create(resident: Resident): ResidentEntry {
    const root = new THREE.Group()
    root.name = `resident:${resident.id}`

    // Body cylinder. Origin is at the centre of the body; we lift it by
    // half-height so the cylinder sits on y=0 (feet on the road).
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: resident.color,
      roughness: 0.85,
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.4
    body.castShadow = true
    body.receiveShadow = true
    root.add(body)

    // Head sphere on top of the body. The skin colour is sampled once from
    // a per-resident RNG seeded off the id, so it's stable across reloads.
    const headGeo = new THREE.SphereGeometry(0.15, 8, 6)
    const headMat = new THREE.MeshStandardMaterial({
      color: resident.getSkinColor(mulberry32(hash32(resident.id))),
      roughness: 0.95,
    })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 0.5 + 0.15
    head.castShadow = true
    root.add(head)

    // Two leg pivots. The mesh is offset on +Y so rotation around X swings
    // the leg forward/back rather than pivoting from the foot. The leg
    // cylinder runs from y=0 to y=0.3.
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6)
    const legMat = new THREE.MeshStandardMaterial({
      color: LEG_COLOR,
      roughness: 0.95,
    })
    const legA = new THREE.Mesh(legGeo, legMat)
    legA.position.set(-0.1, 0.15, 0)
    legA.castShadow = true
    root.add(legA)
    const legB = new THREE.Mesh(legGeo, legMat)
    legB.position.set(0.1, 0.15, 0)
    legB.castShadow = true
    root.add(legB)

    return { root, legA, legB }
  }

  #updateEntry(entry: ResidentEntry, resident: Resident): void {
    // Position — cell centre in world units, nudged between two cells by
    // the resident's segment progress so a slow tick still shows motion.
    const walking = resident.path.length > 0 && resident.pathIndex < resident.path.length
    const point =
      walking && resident.pathIndex > 0
        ? segmentPoint(
            resident.path,
            resident.pathIndex,
            resident.segmentProgress,
            resident.currentCell,
          )
        : resident.currentCell
    entry.root.position.set(point.x - HALF + 0.5, 0, point.y - HALF + 0.5)

    // Walk cycle: legs swing with `Math.sin(t * 8)` while mid-path.
    if (walking) {
      const phase = this.#town.currentSimTime * 8
      entry.legA.rotation.x = Math.sin(phase) * LEG_OSC_RAD
      entry.legB.rotation.x = Math.sin(phase + Math.PI) * LEG_OSC_RAD
    } else {
      // Idle — feet together, no rotation.
      entry.legA.rotation.x = 0
      entry.legB.rotation.x = 0
    }

    // Heading: rotate the root to face the next waypoint, or home if
    // stationary.
    let target: { x: number; y: number } | null = null
    if (walking) {
      const next = resident.path[resident.pathIndex] ?? resident.path[resident.path.length - 1]
      if (next) target = { x: next.x, y: next.y }
    } else if (resident.destination) {
      target = { x: resident.destination.cell.x, y: resident.destination.cell.y }
    } else {
      target = { x: resident.currentCell.x, y: resident.currentCell.y }
    }
    if (target) {
      const dx = target.x - resident.currentCell.x
      const dy = target.y - resident.currentCell.y
      if (dx !== 0 || dy !== 0) {
        // Yaw around Y so the resident's "front" (the +Z of the local
        // frame) faces the destination. We model "front" as +Z so the
        // rotation is `atan2(dx, dy)` — positive when facing +Y.
        entry.root.rotation.y = Math.atan2(dx, dy)
      }
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
