import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { GameState } from "../game/controller"
import { HOST_CONTRACT } from "../sim/levels"

const RING_RADIUS = 6
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

function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length] as string
}

/** Position around the docking ring at a given fraction (0..1) and radius. */
function ringPoint(fraction: number, radius = RING_RADIUS, lift = 0): THREE.Vector3 {
  const angle = fraction * Math.PI * 2
  return new THREE.Vector3(Math.cos(angle) * radius, lift, Math.sin(angle) * radius)
}

interface PodView {
  group: THREE.Group
  body: THREE.Mesh
  connector: THREE.Mesh
  bubble: THREE.Mesh
  clamp: THREE.Mesh
  rail: THREE.Line
  id: string
  /** 0 = far end of the rail, 1 = seated at the port */
  approach: number
}

/**
 * Three.js projection of DOCKING BAY state. Renders only — all rules live in src/sim and src/game.
 *
 * Hero object: the host station (central ico core + a ring of docking ports). Pods glide in along
 * guide rails; on a successful dock a translucent force-field bubble snaps around the pod and the
 * clamp torus turns green (lock); on a contract mismatch the clamp turns red and the pod stays back.
 */
export class DockingScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private stage = new THREE.Group()
  private podMeshes = new Map<string, PodView>()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  onPodClick: ((podId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 18, 48)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(0, 8, 18)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 40
    this.controls.minDistance = 6
    this.controls.target.set(0, 0.5, 0)

    this.scene.add(this.stage)
    this.buildHost()
    this.scene.add(new THREE.AmbientLight("#ffffff", 0.7))
    const key = new THREE.DirectionalLight("#ffffff", 1.2)
    key.position.set(6, 14, 8)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight("#4fc3f7", 0.4)
    rim.position.set(-8, 4, -8)
    this.scene.add(rim)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => {
      this.controls.update()
      this.animatePods()
      this.renderer.render(this.scene, this.camera)
    })
  }

  private buildHost(): void {
    // Central core (the host station) — a hero icosahedron.
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4),
      new THREE.MeshStandardMaterial({ color: "#3d4663", flatShading: true, emissive: "#1a2030" }),
    )
    core.position.set(0, 0.6, 0)
    this.stage.add(core)
    // The ring the ports sit on.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.05, 8, 96),
      new THREE.MeshBasicMaterial({ color: "#3d4663" }),
    )
    ring.rotation.x = Math.PI / 2
    this.stage.add(ring)
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
    const targets: THREE.Object3D[] = []
    for (const v of this.podMeshes.values()) targets.push(v.body, v.connector)
    const hits = this.raycaster.intersectObjects(targets)
    const first = hits[0]
    if (first && this.onPodClick) {
      const id = (first.object.userData as { podId?: string }).podId
      if (id) this.onPodClick(id)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. Cheap at this entity count. */
  sync(state: GameState): void {
    if (state.level.id === "L1" || state.level.id === "L2") {
      this.syncPods(state)
    } else {
      // L3/L4 have no incoming-pod wave; clear stale pods.
      this.clearPods()
      if (state.level.id === "L3" && state.probe) this.syncProbe(state)
      if (state.level.id === "L4" && state.scenario) this.syncCapability(state)
    }
  }

  private syncPods(state: GameState): void {
    const wanted = new Set(state.pods.map((p) => p.id))
    for (const [id, view] of this.podMeshes) {
      if (!wanted.has(id)) {
        this.stage.remove(view.group)
        this.podMeshes.delete(id)
      }
    }
    state.pods.forEach((pod, i) => {
      let view = this.podMeshes.get(pod.id)
      if (!view) {
        view = this.makePod(pod.id, i / state.pods.length)
        this.podMeshes.set(pod.id, view)
        this.stage.add(view.group)
      }
      const truth = state.pods.find((p) => p.id === pod.id)
      const docked = truth ? truth.claimsContract.every((c) => HOST_CONTRACT.includes(c)) : false
      const predicted = state.dockPredictions.get(pod.id)
      // Approach eases toward the port as the wave progresses / resolves.
      const seated = state.phase === "cleared" || state.phase === "failed"
      view.approach = seated ? (docked ? 1 : 0.15) : view.approach
      this.stylePod(view, {
        color: colorFor(pod.id),
        docked,
        resolved: seated,
        predictedDock: predicted ?? null,
      })
    })
  }

  private syncProbe(state: GameState): void {
    const probe = state.probe
    if (!probe) return
    let view = this.podMeshes.get(probe.manifest.id)
    if (!view) {
      view = this.makePod(probe.manifest.id, 0)
      this.podMeshes.set(probe.manifest.id, view)
      this.stage.add(view.group)
    }
    const docked = state.phase === "cleared"
    view.approach = 1
    this.stylePod(view, {
      color: colorFor(probe.manifest.id),
      docked: true,
      resolved: docked,
      predictedDock: null,
      capSize: probe.sandboxCap.length,
    })
  }

  private syncCapability(state: GameState): void {
    const scenario = state.scenario
    if (!scenario) return
    let view = this.podMeshes.get(scenario.manifest.id)
    if (!view) {
      view = this.makePod(scenario.manifest.id, 0)
      this.podMeshes.set(scenario.manifest.id, view)
      this.stage.add(view.group)
    }
    const locked = state.phase === "cleared"
    view.approach = state.phase === "briefing" ? view.approach : 1
    this.stylePod(view, {
      color: colorFor(scenario.manifest.id),
      docked: true,
      resolved: locked,
      predictedDock: null,
      capSize: state.chosenCapabilities.length,
    })
  }

  private makePod(id: string, fraction: number): PodView {
    const group = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5),
      new THREE.MeshStandardMaterial({ color: "#aab3cc", flatShading: true }),
    )
    body.userData = { podId: id }
    // Connector nub encodes the pod's claimed shape.
    const connector = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.3),
      new THREE.MeshStandardMaterial({ color: "#ffd54f", flatShading: true }),
    )
    connector.position.set(0, 0, 0.6)
    connector.userData = { podId: id }
    // Clamp torus sits at the port.
    const clamp = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 8, 24),
      new THREE.MeshBasicMaterial({ color: "#7f8ab0" }),
    )
    // Force-field bubble (translucent sphere) wraps the pod when docked.
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 20, 16),
      new THREE.MeshBasicMaterial({
        color: "#4fc3f7",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    )
    // Guide rail from the port out toward the void.
    const port = ringPoint(fraction, RING_RADIUS, 0)
    const farEnd = ringPoint(fraction, RING_RADIUS + 5, 0)
    const railGeom = new THREE.BufferGeometry().setFromPoints([port, farEnd])
    const rail = new THREE.Line(
      railGeom,
      new THREE.LineBasicMaterial({ color: "#3d4663", transparent: true, opacity: 0.5 }),
    )
    this.stage.add(rail)
    group.add(body, connector, clamp, bubble)
    this.stage.add(group)
    return { group, body, connector, bubble, clamp, rail, id, approach: 0 }
  }

  private stylePod(
    view: PodView,
    opts: {
      color: string
      docked: boolean
      resolved: boolean
      predictedDock: boolean | null
      capSize?: number
    },
  ): void {
    const mat = view.body.material as THREE.MeshStandardMaterial
    mat.color = new THREE.Color(opts.color)
    mat.emissive = new THREE.Color(opts.color)
    mat.emissiveIntensity = opts.resolved ? (opts.docked ? 0.5 : 0.15) : 0.25
    // Clamp: green lock on dock, red on mismatch once resolved; neutral while predicting.
    const clampMat = view.clamp.material as THREE.MeshBasicMaterial
    if (opts.resolved) clampMat.color = new THREE.Color(opts.docked ? "#aed581" : "#f06292")
    else if (opts.predictedDock !== null)
      clampMat.color = new THREE.Color(opts.predictedDock ? "#ffd54f" : "#7f8ab0")
    else clampMat.color = new THREE.Color("#7f8ab0")
    // Bubble: visible only when docked, sized by capability count.
    const bubbleMat = view.bubble.material as THREE.MeshBasicMaterial
    bubbleMat.color = new THREE.Color(opts.color)
    bubbleMat.opacity = opts.docked ? 0.18 : 0
    const scale = 0.7 + (opts.capSize ?? 2) * 0.25
    view.bubble.scale.setScalar(opts.docked ? scale : 1)
  }

  /** Per-frame: ease each pod along its rail toward `approach` (0=far, 1=seated). */
  private animatePods(): void {
    for (const [id, view] of this.podMeshes) {
      const i = idIndex(id)
      const fraction = (i ?? 0) / Math.max(1, this.podMeshes.size)
      const port = ringPoint(fraction, RING_RADIUS, 0.5)
      const far = ringPoint(fraction, RING_RADIUS + 5, 0.5)
      const t = ease(view.approach)
      view.group.position.lerpVectors(far, port, t)
    }
  }

  private clearPods(): void {
    for (const view of this.podMeshes.values()) {
      this.stage.remove(view.group)
      this.stage.remove(view.rail)
    }
    this.podMeshes.clear()
  }
}

/** Ease a 0..1 approach param into a gentle ease-in-out curve. */
function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/** Recover the pod's index from its `pod-<n>` id (for ring placement). */
function idIndex(id: string): number | null {
  const m = /pod-(\d+)$/.exec(id)
  return m ? Number(m[1]) : null
}
