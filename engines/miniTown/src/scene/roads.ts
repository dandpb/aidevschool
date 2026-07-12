/**
 * Road tiles. One small plane per road cell, sharing a procedural canvas
 * texture (dark asphalt + white centre stripe + edge lines). The texture is
 * generated once and disposed with the renderer.
 *
 * Geometry is a thin PlaneGeometry rotated to lie flat on the ground, with
 * a tiny Y offset so the slab from the zones renderer doesn't z-fight with
 * the road's white lines.
 */

import * as THREE from "three"
import { TILES } from "../sim/grid"
import type { Town } from "./state"

const HALF = TILES / 2

function makeRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas")
  c.width = 64
  c.height = 64
  const ctx = c.getContext("2d")
  if (!ctx) throw new Error("Road texture: 2D context unavailable")
  // Dark asphalt base
  ctx.fillStyle = "#3a3a3e"
  ctx.fillRect(0, 0, 64, 64)
  // Subtle speckle for asphalt feel (deterministic via seeded hash so
  // re-runs produce the same texture).
  let seed = 0xdeadbeef
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x100000000
  }
  for (let i = 0; i < 220; i++) {
    const v = 100 + Math.floor(rand() * 60)
    ctx.fillStyle = `rgba(${v},${v},${v},0.18)`
    ctx.fillRect(Math.floor(rand() * 64), Math.floor(rand() * 64), 1, 1)
  }
  // White centre stripe
  ctx.fillStyle = "#e8e8e8"
  ctx.fillRect(30, 0, 4, 64)
  // Subtle edge lines
  ctx.fillStyle = "#d0d0d0"
  ctx.fillRect(0, 0, 2, 64)
  ctx.fillRect(62, 0, 2, 64)
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

export class RoadsRenderer {
  readonly group = new THREE.Group()
  #meshes = new Map<string, THREE.Mesh>()
  #material: THREE.MeshStandardMaterial
  #town: Town

  constructor(town: Town) {
    this.#town = town
    this.#material = new THREE.MeshStandardMaterial({
      map: makeRoadTexture(),
      roughness: 0.95,
    })
    this.group.name = "roads"
    this.sync()
  }

  sync(): void {
    const seen = new Set<string>()
    for (const road of this.#town.roads) {
      seen.add(road.id)
      let mesh = this.#meshes.get(road.id)
      if (!mesh) {
        const geo = new THREE.PlaneGeometry(0.98, 0.98)
        mesh = new THREE.Mesh(geo, this.#material)
        mesh.rotation.x = -Math.PI / 2
        mesh.position.set(road.cell.x - HALF + 0.5, 0.04, road.cell.y - HALF + 0.5)
        mesh.receiveShadow = true
        this.group.add(mesh)
        this.#meshes.set(road.id, mesh)
      }
    }
    for (const [id, mesh] of this.#meshes) {
      if (!seen.has(id)) {
        this.group.remove(mesh)
        mesh.geometry.dispose()
        this.#meshes.delete(id)
      }
    }
  }

  dispose(): void {
    for (const [, mesh] of this.#meshes) {
      mesh.geometry.dispose()
    }
    this.#material.map?.dispose()
    this.#material.dispose()
    this.#meshes.clear()
  }
}
