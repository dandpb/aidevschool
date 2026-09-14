import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import type { SimTask } from "../sim/queue"

// TASK FORGE scene — renders only; every rule lives in src/sim + src/game (plan §2:
// queue -> hopper stack, arms -> worker pool, annealing rack -> backoff, scrap chute -> DLQ).

const HOPPER_X = -3
const RACK_X = 4.5
const CHUTE_X = 9

const KIND_COLORS: Record<SimTask["kind"], number> = {
  clear: 0xaed581,
  cracked: 0xffd54f,
  poison: 0xf06292,
}

function priorityGlow(priority: number): number {
  return 0.15 + priority * 0.3
}

/** Three.js projection of sim state. No gameplay truth here. */
export class ForgeScene {
  private readonly viewport: Viewport
  private readonly forge = new THREE.Group()
  private readonly ingots = new Map<string, THREE.Mesh>()
  private readonly arms = new Map<string, THREE.Group>()

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas)
    this.viewport.scene.add(this.forge)
    this.buildStatic()
  }

  private buildStatic(): void {
    // hopper frame
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.3, 4.2),
      new THREE.MeshStandardMaterial({ color: 0x3d4663, flatShading: true }),
    )
    frame.position.set(HOPPER_X, -0.2, 0)
    this.forge.add(frame)

    // annealing rack
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.25, 2),
      new THREE.MeshStandardMaterial({ color: 0x54608c, flatShading: true }),
    )
    rack.position.set(RACK_X, -0.15, 0)
    this.forge.add(rack)

    // scrap chute (DLQ)
    const chute = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x8c3845, flatShading: true }),
    )
    chute.position.set(CHUTE_X, 0.5, 0)
    this.forge.add(chute)

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x12182a }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.4
    this.forge.add(floor)
  }

  /** Rebuild the projection from a sim snapshot (cheap at this entity count). */
  sync(state: GameState): void {
    this.syncArms(state)
    this.syncIngots(state)
  }

  private syncArms(state: GameState): void {
    for (const w of state.queue.workers) {
      let arm = this.arms.get(w.id)
      if (!arm) {
        arm = new THREE.Group()
        const piston = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 1.6, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x4fc3f7, flatShading: true }),
        )
        piston.position.y = 0.8
        arm.add(piston)
        this.forge.add(arm)
        this.arms.set(w.id, arm)
      }
      const idx = Number(w.id.slice(-1))
      const angle = (idx / Math.max(1, state.queue.workers.length)) * Math.PI * 2
      const parked = state.queue.paused
      arm.position.set(HOPPER_X + Math.cos(angle) * 3, parked ? -0.4 : 0, Math.sin(angle) * 3)
      arm.rotation.y = parked ? 0.6 : 0
      const busy = w.busyWith !== null
      const mat = this.firstMaterial(arm)
      if (mat) mat.color.setHex(busy ? 0xffb74d : 0x4fc3f7)
    }
  }

  private firstMaterial(group: THREE.Group): THREE.MeshStandardMaterial | null {
    const child = group.children[0] as THREE.Mesh | undefined
    return (child?.material as THREE.MeshStandardMaterial) ?? null
  }

  private syncIngots(state: GameState): void {
    const wanted = new Set(state.queue.tasks.map((t) => t.id))
    for (const [id, mesh] of this.ingots) {
      if (!wanted.has(id)) {
        this.forge.remove(mesh)
        this.ingots.delete(id)
      }
    }
    const queue = state.queue.tasks.filter(
      (t) => t.status === "queued" || t.status === "retry_wait",
    )
    let slot = 0
    for (const t of state.queue.tasks) {
      let mesh = this.ingots.get(t.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.4, 0.55),
          new THREE.MeshStandardMaterial({ flatShading: true }),
        )
        this.forge.add(mesh)
        this.ingots.set(t.id, mesh)
      }
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color.setHex(KIND_COLORS[t.kind])
      mat.emissive.setHex(KIND_COLORS[t.kind])

      if (t.status === "queued" || t.status === "retry_wait") {
        const waiting = t.status === "retry_wait"
        // stack: priority desc (brightest on top), FIFO within a band
        const level = Math.floor(slot / 4)
        const inRow = slot % 4
        const x = waiting ? RACK_X - 1 + inRow * 0.7 : HOPPER_X - 1.4 + inRow * 0.95
        const y = waiting ? 0.15 : 0.25 + level * 0.45
        mesh.position.set(x, y, waiting ? 0.4 : -0.6 + level * 0.2)
        const ringLeft =
          t.status === "queued"
            ? Math.max(0, t.scheduledFor - state.queue.now)
            : Math.max(0, (t.nextAttemptAt ?? 0) - state.queue.now)
        mat.emissiveIntensity =
          t.status === "retry_wait" ? 0.2 : Math.max(0.1, priorityGlow(t.priority) - ringLeft * 0.1)
        slot++
      } else if (t.status === "running") {
        const worker = state.queue.workers.find((w) => w.busyWith === t.id)
        const angle = worker
          ? (Number(worker.id.slice(-1)) / Math.max(1, state.queue.workers.length)) * Math.PI * 2
          : 0
        mesh.position.set(HOPPER_X + Math.cos(angle) * 3, 1.9, Math.sin(angle) * 3)
        mat.emissiveIntensity = 0.9
      } else if (t.status === "succeeded") {
        mesh.position.set(CHUTE_X - 2.5, 0.1 + (queue.length % 8) * 0.0, 1.6)
        mat.emissiveIntensity = 0.05
      } else {
        mesh.position.set(CHUTE_X, 1.35, 0)
        mat.emissiveIntensity = 0.05
      }
    }
  }
}
