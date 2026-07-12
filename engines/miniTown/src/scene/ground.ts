import * as THREE from "three"

/**
 * Tile dimensions: 1 world unit per cell. The town is a 20x20 grid centred at the origin.
 * Total footprint = TILES × TILE_SIZE = 20 × 1 = 20 units.
 */
export const TILES = 20
export const TILE_SIZE = 1

/** Sage / moss tones, per docs/concepts/CONCEPTS.md. */
const GRASS_PALETTE = ["#7fa572", "#88b27a", "#6f9663", "#82ad75"] as const

/**
 * Cheap deterministic 2D hash → [0, 1). Stable per cell, so re-running
 * produces the same colour layout. Avoids Math.random in scene init.
 */
function cellHash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0
  n = (n ^ (n >>> 13)) * 1274126177
  return ((n ^ (n >>> 16)) >>> 0) / 0x100000000
}

/**
 * 20×20 grass field. One `InstancedMesh` for the tiles, one for the under-base
 * (avoids the gap you would see if individual cells sat on a transparent canvas).
 */
export class Ground {
  readonly group = new THREE.Group()
  readonly tiles: THREE.InstancedMesh
  readonly base: THREE.Mesh

  constructor() {
    const halfTiles = TILES / 2

    // Single flat slab beneath the tiles — guarantees the camera always sees
    // a continuous grass-coloured surface even when looking almost straight down.
    const baseGeo = new THREE.BoxGeometry(TILES, 0.1, TILES)
    const baseMat = new THREE.MeshStandardMaterial({ color: "#6f9663", roughness: 1 })
    this.base = new THREE.Mesh(baseGeo, baseMat)
    this.base.position.set(0, -0.05, 0)
    this.base.receiveShadow = true
    this.group.add(this.base)

    // Per-cell tile — thin box so the cell edges are visible at low pitch.
    const tileGeo = new THREE.BoxGeometry(TILE_SIZE * 0.98, 0.04, TILE_SIZE * 0.98)
    const tileMat = new THREE.MeshStandardMaterial({ roughness: 1 })
    this.tiles = new THREE.InstancedMesh(tileGeo, tileMat, TILES * TILES)
    this.tiles.receiveShadow = true

    const dummy = new THREE.Object3D()
    const colour = new THREE.Color()
    let i = 0
    for (let z = 0; z < TILES; z++) {
      for (let x = 0; x < TILES; x++) {
        const wx = x - halfTiles + 0.5
        const wz = z - halfTiles + 0.5
        dummy.position.set(wx, 0, wz)
        dummy.updateMatrix()
        this.tiles.setMatrixAt(i, dummy.matrix)

        // Per-cell hue from the sage palette, biased by a hash so neighbouring
        // cells look similar but not identical.
        const h = cellHash(x, z)
        const idx = Math.floor(h * GRASS_PALETTE.length) % GRASS_PALETTE.length
        const hex = GRASS_PALETTE[idx] ?? GRASS_PALETTE[0]
        colour.set(hex)
        // Subtle per-instance brightness wobble.
        const tint = 0.92 + cellHash(x + 17, z + 31) * 0.16
        colour.multiplyScalar(tint)
        this.tiles.setColorAt(i, colour)
        i++
      }
    }
    this.tiles.instanceMatrix.needsUpdate = true
    if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true

    this.group.name = "ground"
  }
}
