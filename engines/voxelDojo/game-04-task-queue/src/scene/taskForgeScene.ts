import * as THREE from "three"
import type { MissionProjection, ProjectionContextHooks } from "../../../shared/projection"
import { prefersReducedMotion } from "../../../shared/reducedMotion"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"

/**
 * Three.js projection of the TASK FORGE sim. Renders only — all rules live in
 * src/sim and src/game (voxelDojo PLAN §2/§10).
 *
 * Layout: a central hopper (bounded priority queue — stacked ingots, glow =
 * priority, countdown ring = scheduled_for), N forge arms around it (worker
 * pool — only N ingots in flame at once), an annealing rack to the east
 * (retry/backoff), and a scrap chute to the west (DLQ). Forklifts dock north.
 */

const INGOT_COLORS: Record<string, number> = {
  clear: 0xa5d6a7, // green glow — clean success
  transient: 0xffd54f, // yellow — will crack once and retry
  poison: 0xef5350, // red crack pattern — must DLQ, never retry
}

interface IngotMeshes {
  mesh: THREE.Mesh
  ring: THREE.Mesh | null
}

export class TaskForgeScene implements MissionProjection<GameState> {
  private readonly viewport: Viewport
  private readonly canvas: HTMLCanvasElement
  private readonly group = new THREE.Group()
  private readonly hopperFrame: THREE.Mesh
  private readonly rack: THREE.Mesh
  private readonly chute: THREE.Mesh
  private readonly forklift: THREE.Group
  private readonly arms: THREE.Group[] = []
  private ingots = new Map<string, IngotMeshes>()
  private bars: THREE.Mesh[] = []
  private pulse = 0
  private disposed = false

  /** wireable interactions (main.ts wires them to the controller) */
  onIngotClick: ((taskId: string) => void) | null = null
  onRackClick: (() => void) | null = null
  onChuteClick: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, hooks: ProjectionContextHooks = {}) {
    this.canvas = canvas
    this.viewport = createViewport(canvas, {
      background: "#06080f",
      fogNear: 26,
      cameraPosition: [10, 9, 14],
      minDistance: 8,
      maxDistance: 42,
      ambientIntensity: 0.65,
      keyIntensity: 1.05,
      onFrame: () => {
        if (prefersReducedMotion()) return
        this.pulse = Math.max(0, this.pulse - 0.02)
        this.animateArms()
      },
      ...hooks,
    })
    this.viewport.scene.add(this.group)

    // hopper frame (the bounded queue's walls)
    this.hopperFrame = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.3, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.4, roughness: 0.6 }),
    )
    this.hopperFrame.position.set(0, -0.4, 0)
    this.group.add(this.hopperFrame)

    // forge arms (worker pool) around the hopper
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group()
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 2.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x3d4663, metalness: 0.5, roughness: 0.5 }),
      )
      post.position.y = 1.3
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.5, 0.7),
        new THREE.MeshStandardMaterial({
          color: 0x80cbc4,
          emissive: 0x80cbc4,
          emissiveIntensity: 0.25,
        }),
      )
      head.position.y = 2.7
      head.name = "head"
      arm.add(post, head)
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      arm.position.set(Math.cos(angle) * 3.4, 0, Math.sin(angle) * 3.4)
      arm.lookAt(0, 0, 0)
      this.group.add(arm)
      this.arms.push(arm)
    }

    // annealing rack (retry/backoff) — east
    this.rack = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.24, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2c3550, metalness: 0.3, roughness: 0.7 }),
    )
    this.rack.position.set(6.2, 0.4, 0)
    this.rack.userData = { kind: "rack" }
    this.group.add(this.rack)

    // scrap chute (DLQ) — west
    this.chute = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.6, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x5c2b2b, roughness: 0.8 }),
    )
    this.chute.position.set(-6.2, 0.8, 0)
    this.chute.userData = { kind: "chute" }
    this.group.add(this.chute)

    // forklift (inbound) — docks north
    this.forklift = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf9a825, roughness: 0.6 }),
    )
    body.position.y = 0.55
    const fork = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.12, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x9e9e9e, metalness: 0.6 }),
    )
    fork.position.set(0, 0.3, 1.2)
    this.forklift.add(body, fork)
    this.forklift.position.set(0, 0, -7.5)
    this.forklift.visible = false
    this.group.add(this.forklift)

    canvas.addEventListener("pointerdown", this.onPointerDown)
  }

  mount(): void {}

  focus(): void {
    this.canvas.focus()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.canvas.removeEventListener("pointerdown", this.onPointerDown)
    this.viewport.dispose()
  }

  private readonly onPointerDown = (event: PointerEvent): void => this.pick(event)

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const targets: THREE.Object3D[] = [...this.ingots.values()].map((i) => i.mesh)
    const hits = this.viewport.raycaster.intersectObjects(targets, false)
    if (hits.length > 0) {
      const id = hits[0]?.object.userData["taskId"]
      if (typeof id === "string") this.onIngotClick?.(id)
      return
    }
    const fixed = this.viewport.raycaster.intersectObjects([this.rack, this.chute], false)
    const kind = fixed[0]?.object.userData["kind"]
    if (kind === "rack") this.onRackClick?.()
    if (kind === "chute") this.onChuteClick?.()
  }

  /** Rebuild the projection from a sim snapshot. Cheap at this entity count. */
  sync(state: GameState): void {
    // ── hopper ingots: stack by arrival, glow = priority, ring = scheduled_for
    const live = new Set<string>()
    state.queue.forEach((task, index) => {
      live.add(task.id)
      let entry = this.ingots.get(task.id)
      if (!entry) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.55, 0.9),
          new THREE.MeshStandardMaterial({
            color: INGOT_COLORS[task.kind] ?? 0xaab3cc,
            emissive: INGOT_COLORS[task.kind] ?? 0xaab3cc,
            emissiveIntensity: 0.15 + task.priority * 0.18,
            metalness: 0.35,
            roughness: 0.45,
          }),
        )
        mesh.userData = { taskId: task.id }
        entry = { mesh, ring: null }
        this.ingots.set(task.id, entry)
        this.group.add(mesh)
      }
      const lane = index % 2 === 0 ? -0.8 : 0.8
      const depth = index % 2 === 0 ? Math.floor(index / 2) : Math.floor(index / 2)
      entry.mesh.position.set(
        lane,
        0.1 + Math.floor(index / 2) * 0.62,
        depth % 2 === 0 ? 0.8 : -0.8,
      )
      // countdown ring while the scheduled_for gate is closed
      const waiting = task.scheduledFor > state.now
      if (waiting && !entry.ring) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.06, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0x4fc3f7 }),
        )
        ring.rotation.x = Math.PI / 2
        entry.ring = ring
        entry.mesh.add(ring)
      } else if (!waiting && entry.ring) {
        entry.mesh.remove(entry.ring)
        entry.ring.geometry.dispose()
        entry.ring = null
      }
    })
    for (const [id, entry] of this.ingots) {
      if (!live.has(id) && !state.running.some((r) => r.task.id === id)) {
        this.group.remove(entry.mesh)
        entry.mesh.geometry.dispose()
        ;(entry.mesh.material as THREE.Material).dispose()
        this.ingots.delete(id)
      }
    }

    // ── hopper full pulse (backpressure boundary made visible)
    const full = state.queue.length >= state.level.capacity
    const frameMat = this.hopperFrame.material as THREE.MeshStandardMaterial
    frameMat.emissive = new THREE.Color(full ? 0xef5350 : 0x000000)
    frameMat.emissiveIntensity = full ? 0.8 : 0
    if (full) this.pulse = 1

    // ── arms: busy ones hold their ingot in flame; parked ones droop
    this.arms.forEach((arm, i) => {
      const slot = state.running[i]
      const head = arm.getObjectByName("head")
      if (head) {
        const mat = head as THREE.Mesh
        const m = mat.material as THREE.MeshStandardMaterial
        m.emissiveIntensity = slot ? 0.9 : 0.25
        m.emissive = new THREE.Color(state.paused ? 0x7f8ab0 : slot ? 0xff8a65 : 0x80cbc4)
      }
      arm.rotation.x = state.paused ? 0.9 : slot ? -0.25 : 0
    })

    // ── annealing rack: queued retries rest here until their beat
    const rackMat = this.rack.material as THREE.MeshStandardMaterial
    const waiting = state.queue.filter((t) => t.scheduledFor > state.now && t.retries > 0).length
    rackMat.emissive = new THREE.Color(waiting > 0 ? 0xffd54f : 0x000000)
    rackMat.emissiveIntensity = waiting > 0 ? 0.5 : 0

    // ── scrap chute glow when the DLQ grew
    const chuteMat = this.chute.material as THREE.MeshStandardMaterial
    chuteMat.emissive = new THREE.Color(state.dlqIds.length > 0 ? 0xef5350 : 0x000000)
    chuteMat.emissiveIntensity = state.dlqIds.length > 0 ? 0.45 : 0

    // ── forklift: visible while an inbound is docking
    this.forklift.visible = state.inbound !== null
    if (state.inbound) {
      this.forklift.position.z = -7.5 + Math.max(0, 1 - (state.dockDeadline - state.now) / 2) * 3.2
    }

    // ── cooled bars pile (successes)
    const targetBars = Math.min(24, state.succeededIds.length)
    while (this.bars.length < targetBars) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.22, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xa5d6a7, metalness: 0.3, roughness: 0.5 }),
      )
      const i = this.bars.length
      bar.position.set(
        5 + (i % 4) * 1.0,
        0.15 + Math.floor(i / 4) * 0.3,
        -5 + Math.floor(i / 4) * 0.8,
      )
      this.bars.push(bar)
      this.group.add(bar)
    }
  }

  private animateArms(): void {
    const t = performance.now() * 0.001
    this.arms.forEach((arm, i) => {
      const head = arm.getObjectByName("head")
      if (head) head.position.y = 2.7 + Math.sin(t * 2 + i) * 0.08
    })
    if (this.pulse > 0) {
      const mat = this.hopperFrame.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.4 + Math.sin(t * 8) * 0.4 * this.pulse
    }
  }
}
