import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameController, GameState } from "../game/controller"

/**
 * Three.js projection of the warehouse sim. Renders only — all rules live in src/sim and src/game.
 * Shelves are colored box rows (bucket = shelf index); crates are an InstancedMesh that scales DOWN
 * with remaining TTL (a near-deadline crate is tiny/dim; a no-TTL crate stays full-size); the
 * picker-bot is a small low-poly body that docks at the hashed shelf.
 */

const AISLE_TILT = -Math.PI / 9
export const PALETTE = [
  "#4fc3f7",
  "#ffb74d",
  "#aed581",
  "#f06292",
  "#ba68c8",
  "#ffd54f",
  "#80cbc4",
  "#e0e0e0",
] as const

function shelfColor(shelf: number): string {
  return PALETTE[shelf % PALETTE.length] as string
}

/** Aisle position (x,z) for a shelf index across `n` shelves, evenly spaced along x. */
function shelfX(shelf: number, n: number): number {
  const spacing = 2.4
  return (shelf - (n - 1) / 2) * spacing
}

export class WarehouseScene {
  private readonly viewport: Viewport
  private world = new THREE.Group()
  private shelfGroup = new THREE.Group()
  private shelfMeshes = new Map<number, THREE.Mesh>()
  private crateMesh: THREE.InstancedMesh | null = null
  private bot: THREE.Group
  /** shelf the bot is currently docking at (-1 = idle/home) */
  private botTargetShelf = -1
  onShelfClick: ((shelf: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 22,
      fogFar: 60,
      cameraPosition: [0, 9, 18],
      controlsTarget: [0, 1.5, 0],
      minDistance: 6,
      maxDistance: 50,
      ambientIntensity: 0.7,
      keyIntensity: 1.1,
      onFrame: () => {
        this.animateBot()
      },
    })

    this.world.rotation.x = AISLE_TILT
    this.viewport.scene.add(this.world)
    this.world.add(this.shelfGroup)

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 30),
      new THREE.MeshStandardMaterial({ color: "#141a28", flatShading: true }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    this.world.add(floor)

    // picker-bot: a small low-poly body on a wheeled base
    this.bot = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.9),
      new THREE.MeshStandardMaterial({ color: "#cfd8dc", flatShading: true }),
    )
    body.position.y = 0.55
    const fork = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.08, 0.5),
      new THREE.MeshStandardMaterial({ color: "#90a4ae", flatShading: true }),
    )
    fork.position.set(0, 0.25, 0.5)
    this.bot.add(body, fork)
    this.bot.position.set(0, 0, 4)
    this.world.add(this.bot)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    if (!this.onShelfClick) return
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const hits = this.viewport.raycaster.intersectObjects([...this.shelfMeshes.values()])
    const first = hits[0]
    if (first) {
      const shelf = (first.object.userData as { shelf?: number }).shelf
      if (typeof shelf === "number") this.onShelfClick(shelf)
    }
  }

  /** Rebuild the projection from a sim snapshot + controller helpers. */
  sync(state: GameState, game: GameController): void {
    this.syncShelves(state, game)
    this.syncCrates(state, game)
  }

  private syncShelves(state: GameState, game: GameController): void {
    const n = state.store.shelfCount
    const loads = game.loads()
    const maxLoad = Math.max(1, ...loads)
    // remove shelves beyond the new count
    for (const [shelf, mesh] of this.shelfMeshes) {
      if (shelf >= n) {
        this.shelfGroup.remove(mesh)
        this.shelfMeshes.delete(shelf)
      }
    }
    for (let shelf = 0; shelf < n; shelf++) {
      let mesh = this.shelfMeshes.get(shelf)
      const load = loads[shelf] ?? 0
      const heat = load / maxLoad
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 0.3, 1.0),
          new THREE.MeshStandardMaterial({
            color: shelfColor(shelf),
            flatShading: true,
          }),
        )
        mesh.userData = { shelf }
        this.shelfGroup.add(mesh)
        this.shelfMeshes.set(shelf, mesh)
      }
      const heightTier = Math.min(1, heat)
      mesh.position.set(shelfX(shelf, n), 0.4 + heightTier * 0.4, 0)
      mesh.scale.set(1, 0.6 + heightTier * 1.6, 1)
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissive = new THREE.Color(shelfColor(shelf))
      mat.emissiveIntensity = 0.1 + heat * 0.7
    }
    // point the bot at the most recently active shelf on L1
    if (state.level.id === "L1" && state.phase === "predicting") {
      const lastPred = state.shelfPredictions[state.shelfPredictions.length - 1]
      this.botTargetShelf = lastPred ? lastPred.shelf : -1
    }
  }

  /** Crates scale down with remaining TTL (no-TTL crates stay full-size). */
  private syncCrates(state: GameState, game: GameController): void {
    if (this.crateMesh) {
      this.world.remove(this.crateMesh)
      this.crateMesh.dispose()
      this.crateMesh = null
    }
    const live = game.liveEntries()
    const entries = [...live.entries()]
    if (entries.length === 0) return
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ flatShading: true }),
      entries.length,
    )
    const m = new THREE.Matrix4()
    const n = state.store.shelfCount
    const now = state.now
    entries.forEach(([key, entry], i) => {
      const shelf = game.shelfOfKey(key)
      const stack = i % 8 // simple vertical stacking on the shelf
      const scale = decayScale(entry, now)
      const jitter = 0.5 + ((i * 37) % 100) / 100
      m.makeScale(scale, scale, scale)
      m.setPosition(
        shelfX(shelf, n) + (jitter - 0.5) * 0.5,
        0.8 + stack * 0.36 * scale,
        -0.1 + (jitter - 0.5) * 0.4,
      )
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, new THREE.Color(shelfColor(shelf)).multiplyScalar(0.6 + scale * 0.4))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    this.world.add(mesh)
    this.crateMesh = mesh
  }

  private animateBot(): void {
    const target = this.botTargetShelf
    if (target < 0) return
    const n = this.shelfMeshes.size
    const dest = shelfX(target, n)
    this.bot.position.x += (dest - this.bot.position.x) * 0.1
  }
}

/** A crate's visible scale from its remaining TTL: 1 = full health, shrinking toward 0 at deadline. */
function decayScale(entry: { deadline: number | null }, now: number): number {
  if (entry.deadline === null) return 1
  const remaining = entry.deadline - now
  if (remaining <= 0) return 0
  const window = 350 // matches L3 crateTtlMs; shrinks over the last window of life
  return Math.max(0.15, Math.min(1, remaining / window))
}
