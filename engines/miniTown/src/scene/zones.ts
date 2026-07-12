/**
 * Zone foundation slabs. Until a building advances past `plot`, this is the
 * only visual cue that a cell has been "zoned" — a flat coloured slab on the
 * ground. Once construction begins, the building renderer takes over and the
 * slab is hidden.
 *
 * Colour per docs/concepts/CONCEPTS.md:
 *   residential  → light blue
 *   shop         → light green
 *   workspace    → light yellow
 */

import * as THREE from "three"
import type { ZoneType } from "../scene/state"
import { TILES } from "../sim/grid"
import type { Town } from "./state"

const ZONE_COLORS: Record<ZoneType, number> = {
  residential: 0x9ec5e8, // light blue
  shop: 0xaedca0, // light green
  workspace: 0xf0d97a, // light yellow
}

const HALF = TILES / 2

interface ZoneSlab {
  readonly mesh: THREE.Mesh
  /** True until the matching building has progressed past `plot`. */
  visible: boolean
}

export class ZonesRenderer {
  readonly group = new THREE.Group()
  #slabs = new Map<string, ZoneSlab>()
  #town: Town

  constructor(town: Town) {
    this.#town = town
    this.group.name = "zones"
    this.sync()
  }

  /** Add slabs for new zones; hide slabs whose buildings have started. */
  sync(): void {
    const seen = new Set<string>()
    for (const zone of this.#town.zones) {
      seen.add(zone.id)
      let entry = this.#slabs.get(zone.id)
      if (!entry) {
        const geo = new THREE.BoxGeometry(0.92, 0.05, 0.92)
        const mat = new THREE.MeshStandardMaterial({
          color: ZONE_COLORS[zone.type],
          roughness: 0.8,
        })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.set(zone.cell.x - HALF + 0.5, 0.025, zone.cell.y - HALF + 0.5)
        mesh.receiveShadow = true
        this.group.add(mesh)
        entry = { mesh, visible: true }
        this.#slabs.set(zone.id, entry)
      }
      // Once construction is past `plot` the building renderer takes over.
      const building = this.#town.buildings.find((b) => b.zoneId === zone.id)
      const stage = building?.stage ?? "plot"
      const shouldShow = stage === "plot"
      if (entry.visible !== shouldShow) {
        entry.mesh.visible = shouldShow
        entry.visible = shouldShow
      }
    }
    for (const [id, entry] of this.#slabs) {
      if (!seen.has(id)) {
        this.group.remove(entry.mesh)
        entry.mesh.geometry.dispose()
        const m = entry.mesh.material
        if (Array.isArray(m)) for (const x of m) x.dispose()
        else m.dispose()
        this.#slabs.delete(id)
      }
    }
  }

  dispose(): void {
    for (const [, entry] of this.#slabs) {
      entry.mesh.geometry.dispose()
      const m = entry.mesh.material
      if (Array.isArray(m)) for (const x of m) x.dispose()
      else m.dispose()
    }
    this.#slabs.clear()
  }
}
