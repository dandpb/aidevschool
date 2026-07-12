/**
 * Per-building meshes. The renderer keeps one `Group` per building in the
 * Town and rebuilds the contents whenever the stage advances. The `frame →
 * roofed` transition picks up the procedural variation (wall/roof colour,
 * roof style, height) committed by `BuildingConstruction` at that point.
 *
 * Stage visual reference (docs/concepts/CONCEPTS.md):
 *   plot        — dirt square + 4 corner stakes
 *   foundation  — concrete slab
 *   frame       — four walls, no roof, no windows
 *   roofed      — frame + roof + dark window panels
 *   inhabited   — roofed + warm point light per window
 *
 * Each building stays well under the 200-tri budget from the concept doc.
 */

import * as THREE from "three"
import { TILES } from "../sim/grid"
import type { BuildingVariation } from "../sim/variation"
import type { Building, ConstructionStage, Town } from "./state"

const HALF = TILES / 2

const WALL_HEIGHT_BY_STAGE: Record<ConstructionStage, number> = {
  plot: 0,
  foundation: 0.05,
  frame: 0.6,
  roofed: 0.85,
  inhabited: 0.85,
}

interface BuildingEntry {
  readonly root: THREE.Group
  stage: ConstructionStage | null
  lights: THREE.PointLight[]
}

export class BuildingsRenderer {
  readonly group = new THREE.Group()
  readonly #entries = new Map<string, BuildingEntry>()
  readonly #town: Town

  constructor(town: Town) {
    this.#town = town
    this.group.name = "buildings"
    this.sync()
  }

  sync(): void {
    const seen = new Set<string>()
    for (const building of this.#town.buildings) {
      seen.add(building.id)
      let entry = this.#entries.get(building.id)
      if (!entry) {
        const root = new THREE.Group()
        root.name = `building:${building.id}`
        this.group.add(root)
        entry = { root, stage: null, lights: [] }
        this.#entries.set(building.id, entry)
      }
      if (entry.stage !== building.stage) {
        this.#rebuild(entry, building)
        entry.stage = building.stage
      }
    }
    for (const [id, entry] of this.#entries) {
      if (!seen.has(id)) {
        this.group.remove(entry.root)
        this.#disposeGroup(entry.root)
        this.#entries.delete(id)
      }
    }
  }

  #rebuild(entry: BuildingEntry, building: Building): void {
    this.#disposeGroup(entry.root)
    entry.lights = []
    const wx = building.cell.x - HALF + 0.5
    const wz = building.cell.y - HALF + 0.5
    entry.root.position.set(wx, 0, wz)

    const construction = this.#town.constructions.get(building.id)
    const variation = construction?.getVariation() ?? null

    switch (building.stage) {
      case "plot":
        this.#buildPlot(entry.root)
        break
      case "foundation":
        this.#buildFoundation(entry.root)
        break
      case "frame":
        this.#buildFrame(entry.root, variation)
        break
      case "roofed":
        this.#buildRoofed(entry.root, variation)
        break
      case "inhabited":
        this.#buildInhabited(entry.root, variation, entry)
        break
    }
  }

  #buildPlot(root: THREE.Group): void {
    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.04, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }),
    )
    dirt.position.y = 0.04
    dirt.receiveShadow = true
    root.add(dirt)

    const stakeGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6)
    const stakeMat = new THREE.MeshStandardMaterial({ color: 0xeae0c0, roughness: 0.9 })
    for (const [dx, dz] of [
      [-0.4, -0.4],
      [0.4, -0.4],
      [0.4, 0.4],
      [-0.4, 0.4],
    ] as const) {
      const stake = new THREE.Mesh(stakeGeo, stakeMat)
      stake.position.set(dx, 0.13, dz)
      stake.castShadow = true
      root.add(stake)
    }
  }

  #buildFoundation(root: THREE.Group): void {
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.12, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.95 }),
    )
    slab.position.y = 0.06
    slab.castShadow = true
    slab.receiveShadow = true
    root.add(slab)
  }

  #buildFrame(root: THREE.Group, variation: BuildingVariation | null): void {
    const wallColor = new THREE.Color(variation?.wallColor ?? 0xc8b89a)
    const h = WALL_HEIGHT_BY_STAGE.frame
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.9 })
    const wallThickness = 0.08
    const wallSpecs: ReadonlyArray<readonly [number, number, number, number, number]> = [
      [0, h / 2, -0.4, 0.8, wallThickness], // back
      [0, h / 2, 0.4, 0.8, wallThickness], // front
      [-0.4, h / 2, 0, wallThickness, 0.8], // left
      [0.4, h / 2, 0, wallThickness, 0.8], // right
    ]
    for (const [x, y, z, w, d] of wallSpecs) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
      wall.position.set(x, y, z)
      wall.castShadow = true
      wall.receiveShadow = true
      root.add(wall)
    }
  }

  #buildRoofed(root: THREE.Group, variation: BuildingVariation | null): void {
    this.#buildFrame(root, variation)
    const roofColor = new THREE.Color(variation?.roofColor ?? 0xa04030)
    const h = WALL_HEIGHT_BY_STAGE.roofed
    if (variation?.roofStyle === "flat") {
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.08, 0.9),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 }),
      )
      roof.position.y = h + 0.05
      roof.castShadow = true
      root.add(roof)
    } else {
      // Pitched: a triangular prism extruded along Z. < 16 tris.
      const shape = new THREE.Shape()
      shape.moveTo(-0.45, 0)
      shape.lineTo(0, 0.3)
      shape.lineTo(0.45, 0)
      shape.closePath()
      const roofGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.9,
        bevelEnabled: false,
      })
      roofGeo.translate(0, 0, -0.45)
      const roof = new THREE.Mesh(
        roofGeo,
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.7 }),
      )
      roof.position.y = h
      roof.castShadow = true
      root.add(roof)
    }
    // Dark window panels on the front and back walls
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x1a1f2a,
      roughness: 0.3,
      metalness: 0.4,
    })
    for (const z of [-0.401, 0.401]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.25), winMat)
      win.position.set(0, 0.35, z)
      root.add(win)
    }
  }

  #buildInhabited(
    root: THREE.Group,
    variation: BuildingVariation | null,
    entry: BuildingEntry,
  ): void {
    this.#buildRoofed(root, variation)
    // Warm point light per window — small intensity so 20+ buildings don't
    // blow out the scene budget, and decay=2 so each light falls off fast.
    const light = new THREE.PointLight(0xffd089, 0.4, 3, 2)
    light.position.set(0, 0.4, 0)
    root.add(light)
    entry.lights.push(light)
  }

  #disposeGroup(root: THREE.Group): void {
    for (const child of [...root.children]) {
      root.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const m = child.material
        if (Array.isArray(m)) for (const x of m) x.dispose()
        else m.dispose()
      } else if (child instanceof THREE.PointLight) {
        child.dispose?.()
      }
    }
  }

  dispose(): void {
    for (const [, entry] of this.#entries) {
      this.group.remove(entry.root)
      this.#disposeGroup(entry.root)
    }
    this.#entries.clear()
  }
}
