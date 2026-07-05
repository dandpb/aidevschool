import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { GameState } from "../game/controller"

const RING_RADIUS = 9
const RING_TILT = Math.PI / 6

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

const HEALTHY_COLOR = new THREE.Color("#4caf50") // green glow
const UNHEALTHY_COLOR = new THREE.Color("#e53935") // red glow
const UNREVEALED_COLOR = new THREE.Color("#7f8ab0") // muted (hidden until probed)

/** Three.js projection of sim state. Renders only — all rules live in src/sim and src/game. */
export class AirScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private ringGroup = new THREE.Group()
  private padMeshes = new Map<string, THREE.Mesh>()
  private probeBeams = new Map<string, THREE.Mesh>()
  private shipMesh: THREE.InstancedMesh | null = null
  private deck: THREE.Mesh
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private clock = new THREE.Clock()
  /** probe animation timer per pad (seconds remaining of the visible beam). */
  private probeTimers = new Map<string, number>()
  onPadClick: ((padId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 24, 60)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(0, 14, 24)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 60
    this.controls.minDistance = 8

    this.ringGroup.rotation.x = RING_TILT
    this.scene.add(this.ringGroup)

    // deck: a flat dark disc the pads sit on (the "airport")
    this.deck = new THREE.Mesh(
      new THREE.CylinderGeometry(RING_RADIUS + 2, RING_RADIUS + 2.6, 0.4, 48),
      new THREE.MeshStandardMaterial({ color: "#161b2a", flatShading: true }),
    )
    this.ringGroup.add(this.deck)

    // a faint guide ring marking where pads live
    const guide = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.05, 8, 96),
      new THREE.MeshBasicMaterial({ color: "#3d4663" }),
    )
    guide.rotation.x = Math.PI / 2
    this.ringGroup.add(guide)

    this.scene.add(new THREE.AmbientLight("#ffffff", 0.7))
    const key = new THREE.DirectionalLight("#ffffff", 1.2)
    key.position.set(8, 16, 8)
    this.scene.add(key)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => {
      this.animate(this.clock.getDelta())
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    })
  }

  private resize(): void {
    const el = this.renderer.domElement
    const w = el.clientWidth || el.parentElement?.clientWidth || 800
    const h = el.clientHeight || el.parentElement?.clientHeight || 600
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private pick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects([...this.padMeshes.values()])
    const first = hits[0]
    if (first && this.onPadClick) {
      const id = (first.object.userData as { padId?: string }).padId
      if (id) this.onPadClick(id)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. Cheap at this entity count. */
  sync(state: GameState): void {
    this.syncPads(state)
    this.syncShips(state)
  }

  /** Trigger the visible probe beam on every pad (called when the player fires a probe). */
  flashProbes(state: GameState): void {
    for (const b of state.backends) this.probeTimers.set(b.id, 1.0)
  }

  /** Position of a pad by its index on the ring (angle = i / N * 2π). */
  private padPosition(index: number, count: number): THREE.Vector3 {
    const angle = (index / count) * Math.PI * 2
    return new THREE.Vector3(Math.cos(angle) * RING_RADIUS, 0.4, Math.sin(angle) * RING_RADIUS)
  }

  private syncPads(state: GameState): void {
    const wanted = new Set(state.backends.map((b) => b.id))
    for (const [id, mesh] of this.padMeshes) {
      if (!wanted.has(id)) {
        this.ringGroup.remove(mesh)
        this.padMeshes.delete(id)
      }
    }
    const maxRouted = Math.max(1, ...state.backends.map((b) => b.routed))
    const revealed = state.revealed
    state.backends.forEach((b, i) => {
      let mesh = this.padMeshes.get(b.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 1.1, 0.5, 16),
          new THREE.MeshStandardMaterial({ flatShading: true }),
        )
        mesh.userData = { padId: b.id }
        this.ringGroup.add(mesh)
        this.padMeshes.set(b.id, mesh)
      }
      mesh.position.copy(this.padPosition(i, state.backends.length))
      const mat = mesh.material as THREE.MeshStandardMaterial
      const isRevealed = revealed.has(b.id)
      const baseColor = PALETTE[i % PALETTE.length] as string
      mat.color = new THREE.Color(baseColor)
      // Health = emissive glow. Hidden pads (not yet probed) are muted; healthy glows green;
      // unhealthy glows red. This is the load-bearing signal a screenshot must carry.
      if (!isRevealed) {
        mat.emissive = UNREVEALED_COLOR
        mat.emissiveIntensity = 0.1
      } else if (b.health === "healthy") {
        mat.emissive = HEALTHY_COLOR
        const heat = b.routed / maxRouted
        mat.emissiveIntensity = 0.25 + heat * 0.9
      } else {
        mat.emissive = UNHEALTHY_COLOR
        mat.emissiveIntensity = 0.7
      }
      mesh.scale.setScalar(0.9 + (b.routed / maxRouted) * 0.4)
    })
  }

  private syncShips(state: GameState): void {
    if (this.shipMesh) {
      this.ringGroup.remove(this.shipMesh)
      this.shipMesh.dispose()
      this.shipMesh = null
    }
    // Render one instanced ship per pending + completed prediction, lined up approaching the pads.
    // Completed predictions sit docked at their predicted pad; the pending ship hovers at center.
    const total = state.requests.length
    if (total === 0) return
    const mesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.3, 0.9, 6),
      new THREE.MeshStandardMaterial({ flatShading: true }),
      total,
    )
    const m = new THREE.Matrix4()
    const count = state.backends.length
    state.requests.forEach((req, i) => {
      const pred = state.predictions.find((p) => p.requestId === req.id)
      const padIdx = pred ? state.backends.findIndex((b) => b.id === pred.predictedPadId) : -1
      let pos: THREE.Vector3
      if (pred && padIdx >= 0) {
        // docked: above its chosen pad
        pos = this.padPosition(padIdx, count).setY(2.2)
      } else if (i === state.pendingIndex) {
        // the pending ship hovers over the deck center, ready to land
        pos = new THREE.Vector3(0, 4, 0)
      } else {
        // queued: stacked approaching from altitude
        pos = new THREE.Vector3(0, 4 + (i - state.pendingIndex) * 0.6, 0)
      }
      m.makeRotationFromEuler(new THREE.Euler(Math.PI, 0, 0))
      m.setPosition(pos)
      mesh.setMatrixAt(i, m)
      const color = pred?.error
        ? new THREE.Color("#e53935") // an error ship glows red
        : pred
          ? new THREE.Color(PALETTE[(padIdx >= 0 ? padIdx : 0) % PALETTE.length])
          : new THREE.Color("#e6e9f2")
      mesh.setColorAt(i, color)
    })
    this.ringGroup.add(mesh)
    this.shipMesh = mesh
  }

  private animate(dt: number): void {
    // tick probe-beam timers and refresh beam visibility
    for (const [id, remaining] of this.probeTimers) {
      const next = remaining - dt
      if (next <= 0) {
        this.probeTimers.delete(id)
        const beam = this.probeBeams.get(id)
        if (beam) {
          this.ringGroup.remove(beam)
          this.probeBeams.delete(id)
        }
      } else {
        this.probeTimers.set(id, next)
        this.ensureBeam(id)
        const beam = this.probeBeams.get(id)
        if (beam) {
          const mat = beam.material as THREE.MeshBasicMaterial
          mat.opacity = Math.max(0.15, next) // fades as the probe completes
        }
      }
    }
  }

  private ensureBeam(padId: string): void {
    if (this.probeBeams.has(padId)) return
    const mesh = this.padMeshes.get(padId)
    if (!mesh) return
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 6, 8),
      new THREE.MeshBasicMaterial({
        color: "#ffd54f",
        transparent: true,
        opacity: 0.8,
      }),
    )
    beam.position.copy(mesh.position).setY(mesh.position.y + 3)
    this.ringGroup.add(beam)
    this.probeBeams.set(padId, beam)
  }
}
