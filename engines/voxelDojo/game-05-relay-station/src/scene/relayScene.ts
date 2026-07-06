import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { GameState } from "../game/controller"
import { sweepDead } from "../sim/relay"

const RING_RADIUS = 7
const RING_TILT = Math.PI / 6

/**
 * Link state colors — the load-bearing visual signal (PLAN §9).
 * green  = live AND subscribed to the broadcasting channel
 * grey   = connected but not subscribed (or no broadcast active)
 * dark/red = dead (dropped by heartbeat) or disconnected
 */
export const LINK_GREEN = "#4caf50"
export const LINK_GREY = "#5a6378"
export const LINK_DEAD = "#b34a3a"

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

/** Deterministic orbital position for a station id (mirrors a stable constellation). */
function orbitPoint(angle: number, lift = 0): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(angle) * RING_RADIUS, lift, Math.sin(angle) * RING_RADIUS)
}

/** Three.js projection of sim state. Renders only — all rules live in src/sim and src/game. */
export class RelayScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private world = new THREE.Group()
  private hub: THREE.Mesh
  private stationMeshes = new Map<string, THREE.Mesh>()
  private links: THREE.LineSegments | null = null
  private fanBeams: THREE.LineSegments | null = null
  private pulses: THREE.InstancedMesh | null = null
  private clock = new THREE.Clock()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  onStationClick: ((stationId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 20, 55)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(0, 10, 20)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 50
    this.controls.minDistance = 7

    this.world.rotation.x = RING_TILT
    this.scene.add(this.world)

    // central relay hub — the single hero object
    this.hub = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2),
      new THREE.MeshStandardMaterial({
        color: "#4fc3f7",
        emissive: "#4fc3f7",
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
    )
    this.world.add(this.hub)

    // orbit guide ring
    const guide = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.04, 8, 96),
      new THREE.MeshBasicMaterial({ color: "#2a3148", transparent: true, opacity: 0.5 }),
    )
    guide.rotation.x = Math.PI / 2
    this.world.add(guide)

    this.scene.add(new THREE.AmbientLight("#ffffff", 0.7))
    const key = new THREE.DirectionalLight("#ffffff", 1.1)
    key.position.set(8, 16, 8)
    this.scene.add(key)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  private resize(): void {
    const el = this.renderer.domElement
    const w = el.clientWidth || el.parentElement?.clientWidth || 800
    const h = el.clientHeight || el.parentElement?.clientHeight || 600
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private frame(): void {
    const t = this.clock.getElapsedTime()
    // hub slow spin
    this.hub.rotation.y = t * 0.4
    // stations orbit gently
    for (const mesh of this.stationMeshes.values()) {
      const base = mesh.userData.angle as number
      const speed = mesh.userData.orbitSpeed as number
      mesh.position.copy(orbitPoint(base + t * speed, 0))
    }
    // rebuild links each frame so they track the orbiting stations
    this.rebuildLinks()
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private pick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects([...this.stationMeshes.values()])
    const first = hits[0]
    if (first && this.onStationClick) {
      const id = (first.object.userData as { stationId?: string }).stationId
      if (id) this.onStationClick(id)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncStations(state)
    this.syncFanBeams(state)
  }

  private syncStations(state: GameState): void {
    const wanted = new Set(state.stations.map((s) => s.id))
    for (const [id, mesh] of this.stationMeshes) {
      if (!wanted.has(id)) {
        this.world.remove(mesh)
        this.stationMeshes.delete(id)
      }
    }
    const count = state.stations.length
    state.stations.forEach((spec, i) => {
      let mesh = this.stationMeshes.get(spec.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.5),
          new THREE.MeshStandardMaterial({ flatShading: true }),
        )
        mesh.userData = { stationId: spec.id }
        this.world.add(mesh)
        this.stationMeshes.set(spec.id, mesh)
      }
      const angle = (i / Math.max(1, count)) * Math.PI * 2
      mesh.userData.angle = angle
      mesh.userData.orbitSpeed = 0.05 + (i % 3) * 0.01 // gentle, deterministic per slot
      mesh.position.copy(orbitPoint(angle, 0))

      const mat = mesh.material as THREE.MeshStandardMaterial
      const connected = state.state.clients.has(spec.id)
      mat.color = new THREE.Color(connected ? PALETTE[i % PALETTE.length] : "#3a3a3a")
      mat.emissive = new THREE.Color(state.predicted.has(spec.id) ? "#ffd54f" : "#000000")
      mat.emissiveIntensity = state.predicted.has(spec.id) ? 0.6 : 0
    })
  }

  /** Laser links: hub↔station, colored by link state. Rebuilt each frame in frame(). */
  private rebuildLinks(): void {
    if (this.links) {
      this.world.remove(this.links)
      this.links.geometry.dispose()
      ;(this.links.material as THREE.Material).dispose()
      this.links = null
    }
    const pts: number[] = []
    const cols: number[] = []
    const origin = new THREE.Vector3(0, 0, 0)
    for (const mesh of this.stationMeshes.values()) {
      const live = Boolean(mesh.userData.live)
      const subscribed = Boolean(mesh.userData.subscribed)
      const dead = Boolean(mesh.userData.dead)
      const color = new THREE.Color(dead ? LINK_DEAD : subscribed && live ? LINK_GREEN : LINK_GREY)
      pts.push(origin.x, origin.y, origin.z, mesh.position.x, mesh.position.y, mesh.position.z)
      cols.push(color.r, color.g, color.b, color.r, color.g, color.b)
    }
    if (pts.length === 0) return
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3))
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3))
    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    })
    const lines = new THREE.LineSegments(geo, mat)
    this.world.add(lines)
    this.links = lines
  }

  /**
   * Broadcast fan beams — a second, brighter fan drawn only to the live+subscribed
   * set after a broadcast resolves. Plus heartbeat pulses along those links.
   */
  private syncFanBeams(state: GameState): void {
    // mark per-station liveness for the link colorer
    const cfg = state.level
    const { dropped } = sweepDead(state.state, cfg.now, cfg.timeoutMs)
    for (const mesh of this.stationMeshes.values()) {
      const id = mesh.userData.stationId as string
      const spec = state.stations.find((s) => s.id === id)
      const connected = state.state.clients.has(id)
      mesh.userData.live = connected
      mesh.userData.subscribed = connected && spec?.channel === state.broadcastChannel
      mesh.userData.dead = !connected || (spec?.connected === true && dropped.includes(id))
    }

    if (this.fanBeams) {
      this.world.remove(this.fanBeams)
      this.fanBeams.geometry.dispose()
      ;(this.fanBeams.material as THREE.Material).dispose()
      this.fanBeams = null
    }
    if (this.pulses) {
      this.world.remove(this.pulses)
      this.pulses.dispose()
      this.pulses = null
    }

    const delivered = state.lastBroadcast?.deliveredTo ?? []
    if (delivered.length === 0) return

    // fan beams — bright green, slightly thicker via offset duplicates
    const pts: number[] = []
    const origin = new THREE.Vector3(0, 0, 0)
    for (const id of delivered) {
      const mesh = this.stationMeshes.get(id)
      if (!mesh) continue
      pts.push(origin.x, origin.y, origin.z, mesh.position.x, mesh.position.y, mesh.position.z)
    }
    if (pts.length > 0) {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3))
      const mat = new THREE.LineBasicMaterial({
        color: LINK_GREEN,
        transparent: true,
        opacity: 0.9,
      })
      this.fanBeams = new THREE.LineSegments(geo, mat)
      this.world.add(this.fanBeams)
    }

    // heartbeat pulses — instanced small spheres along each delivered link
    const pulseGeo = new THREE.SphereGeometry(0.12, 8, 8)
    const pulseMat = new THREE.MeshBasicMaterial({ color: "#a5d6a7" })
    const pulses = new THREE.InstancedMesh(pulseGeo, pulseMat, delivered.length)
    const m = new THREE.Matrix4()
    delivered.forEach((id, i) => {
      const mesh = this.stationMeshes.get(id)
      if (!mesh) return
      // place at the midpoint of the link (a static "pulse caught mid-travel")
      const mid = mesh.position.clone().multiplyScalar(0.5)
      m.setPosition(mid)
      pulses.setMatrixAt(i, m)
    })
    this.world.add(pulses)
    this.pulses = pulses
  }
}
