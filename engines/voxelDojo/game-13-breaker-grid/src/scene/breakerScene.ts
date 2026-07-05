import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { FlowRecord, GameState } from "../game/controller"
import type { CircuitState, District } from "../sim/breaker"

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

export const STATE_COLOR: Record<CircuitState, string> = {
  closed: "#aed581",
  open: "#f06292",
  half_open: "#ffd54f",
}

function colorFor(districtId: string, districts: readonly { id: string }[]): string {
  const idx = districts.findIndex((d) => d.id === districtId)
  return PALETTE[(idx >= 0 ? idx : districts.length) % PALETTE.length] as string
}

const GRID_SPACING = 6
const PILLAR_HEIGHT = 3

/** Position of district `i` on a square-ish grid. */
function gridPos(index: number, count: number): THREE.Vector3 {
  const cols = Math.ceil(Math.sqrt(count))
  const col = index % cols
  const row = Math.floor(index / cols)
  const cx = (cols - 1) / 2
  const cz = (Math.ceil(count / cols) - 1) / 2
  return new THREE.Vector3((col - cx) * GRID_SPACING, 0, (row - cz) * GRID_SPACING)
}

interface DistrictView {
  group: THREE.Group
  base: THREE.Mesh
  /** the hinged breaker bar — rotation encodes closed/open/half_open */
  switchBar: THREE.Mesh
  /** the downstream contact the bar touches when closed */
  contact: THREE.Mesh
  /** translucent bulkhead box; opacity scales with in-flight / cap */
  bulkhead: THREE.Mesh
  /** stack of in-flight pips inside the bulkhead */
  inFlightPips: THREE.InstancedMesh
  label: THREE.Sprite
  stateRing: THREE.Mesh
}

/**
 * Three.js projection of the breaker-grid sim. Renders only — every rule lives
 * in src/sim (breaker state machine, bulkhead) and src/game (controller). The
 * scene reads a GameState snapshot and re-projects it each sync().
 *
 * Hero objects: a grid of district substations. Each has a hinged breaker bar
 * (rotated to closed/half-open/open), a translucent bulkhead box whose opacity
 * grows with in-flight calls, and a stack of pips showing how full the bulkhead
 * is. Energy pulses (instanced spheres) travel the lines; short-circuited ones
 * burst red at the breaker instead of reaching the downstream.
 */
export class BreakerScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private gridGroup = new THREE.Group()
  private districtViews = new Map<string, DistrictView>()
  private pulseMesh: THREE.InstancedMesh | null = null
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private clock = 0
  onDistrictClick: ((districtId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 30, 70)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(10, 12, 18)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 50
    this.controls.minDistance = 6
    this.controls.target.set(0, 1, 0)

    this.scene.add(this.gridGroup)
    // ground plane (the "grid")
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ color: "#121622" }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.01
    this.gridGroup.add(ground)
    const grid = new THREE.GridHelper(60, 30, "#2a3148", "#1a2030")
    this.gridGroup.add(grid)

    this.scene.add(new THREE.AmbientLight("#ffffff", 0.8))
    const key = new THREE.DirectionalLight("#ffffff", 1.1)
    key.position.set(10, 18, 8)
    this.scene.add(key)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => {
      this.clock += 0.016
      this.animateSwitches()
      this.animatePulses()
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
    const targets: THREE.Object3D[] = []
    for (const v of this.districtViews.values()) targets.push(v.base, v.bulkhead, v.switchBar)
    const hits = this.raycaster.intersectObjects(targets, false)
    const first = hits[0]
    if (first && this.onDistrictClick) {
      const id = (first.object.userData as { districtId?: string }).districtId
      if (id) this.onDistrictClick(id)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. Cheap at this entity count. */
  sync(state: GameState): void {
    this.syncDistricts(state)
    this.syncFlows(state)
  }

  private syncDistricts(state: GameState): void {
    const wanted = new Set(state.districts.map((d) => d.id))
    for (const [id, view] of this.districtViews) {
      if (!wanted.has(id)) {
        this.gridGroup.remove(view.group)
        this.districtViews.delete(id)
      }
    }
    const count = state.districts.length
    state.districts.forEach((d, i) => {
      let view = this.districtViews.get(d.id)
      if (!view) {
        view = this.buildDistrict(d, colorFor(d.id, state.districts), count, i)
        this.districtViews.set(d.id, view)
        this.gridGroup.add(view.group)
      }
      const pos = gridPos(i, count)
      view.group.position.copy(pos)
      this.updateDistrict(view, d, colorFor(d.id, state.districts))
    })
  }

  private buildDistrict(d: District, color: string, count: number, index: number): DistrictView {
    const group = new THREE.Group()
    const pos = gridPos(index, count)
    group.position.copy(pos)

    // base plinth
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 0.4, 12),
      new THREE.MeshStandardMaterial({ color: "#2a3148", flatShading: true }),
    )
    base.position.y = 0.2
    base.userData = { districtId: d.id }
    group.add(base)

    // pillar carrying the breaker
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, PILLAR_HEIGHT, 0.5),
      new THREE.MeshStandardMaterial({ color: "#3d4663", flatShading: true }),
    )
    pillar.position.y = PILLAR_HEIGHT / 2 + 0.4
    group.add(pillar)

    // downstream contact (top of pillar) — the bar touches it when CLOSED
    const contact = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.4,
        flatShading: true,
      }),
    )
    contact.position.set(0, PILLAR_HEIGHT + 0.4, 0)
    group.add(contact)

    // the hinged breaker bar — pivots from a hinge at z = -0.6
    const switchBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 1.4),
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.5,
        flatShading: true,
      }),
    )
    // pivot offset so rotating the group/bar swings the far end
    const hinge = new THREE.Group()
    hinge.position.set(0, PILLAR_HEIGHT + 0.4, -0.6)
    switchBar.position.set(0, 0, 0.7) // bar extends +z from the hinge
    switchBar.userData = { districtId: d.id }
    hinge.add(switchBar)
    group.add(hinge)
    // store hinge as userData so animateSwitches can swing it
    switchBar.userData.hinge = hinge

    // translucent bulkhead box surrounding the pillar base
    const bulkhead = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.4, 2.4),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
      }),
    )
    bulkhead.position.y = 1.4
    bulkhead.userData = { districtId: d.id }
    group.add(bulkhead)

    // state ring at the base — colored by current breaker state
    const stateRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({ color: STATE_COLOR[d.breaker.state] }),
    )
    stateRing.rotation.x = Math.PI / 2
    stateRing.position.y = 0.05
    group.add(stateRing)

    // in-flight pips (instanced, up to cap shown)
    const maxPips = Math.max(1, d.cap)
    const inFlightPips = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.6,
      }),
      maxPips,
    )
    inFlightPips.count = maxPips
    group.add(inFlightPips)

    const label = makeLabel(d.id, color)
    label.position.set(0, PILLAR_HEIGHT + 1.4, 0)
    group.add(label)

    return {
      group,
      base,
      switchBar,
      contact,
      bulkhead,
      inFlightPips,
      label,
      stateRing,
    }
  }

  private updateDistrict(view: DistrictView, d: District, color: string): void {
    const state = d.breaker.state
    // color the state ring by breaker state
    ;(view.stateRing.material as THREE.MeshBasicMaterial).color = new THREE.Color(
      STATE_COLOR[state],
    )
    // bar glow color follows district color
    const barMat = view.switchBar.material as THREE.MeshStandardMaterial
    barMat.color = new THREE.Color(color)
    barMat.emissive = new THREE.Color(color)
    barMat.emissiveIntensity = state === "open" ? 0.9 : 0.5

    // bulkhead opacity grows with in-flight load
    const load = Math.min(1, d.inFlight / Math.max(1, d.cap))
    ;(view.bulkhead.material as THREE.MeshBasicMaterial).opacity = 0.08 + load * 0.32

    // place visible in-flight pips as a stack inside the bulkhead
    const m = new THREE.Matrix4()
    const shown = Math.min(d.inFlight, view.inFlightPips.count)
    for (let i = 0; i < view.inFlightPips.count; i++) {
      if (i < shown) {
        const y = 0.6 + i * 0.34
        m.setPosition(0, y, 0)
        view.inFlightPips.setMatrixAt(i, m)
      } else {
        m.makeScale(0, 0, 0)
        view.inFlightPips.setMatrixAt(i, m)
      }
    }
    view.inFlightPips.instanceMatrix.needsUpdate = true
  }

  /** Swing breaker bars toward their target angle each frame (open = lifted). */
  private animateSwitches(): void {
    const flicker = 0.5 + 0.5 * Math.sin(this.clock * 18)
    for (const view of this.districtViews.values()) {
      const hinge = view.switchBar.userData.hinge as THREE.Group | undefined
      if (!hinge) continue
      const mat = view.switchBar.material as THREE.MeshStandardMaterial
      const isClosed = Math.abs(hinge.rotation.x) < 0.05
      // detect target from ring color is unreliable; we read the stored target set in updateDistrict
      const target = (view.switchBar.userData.targetAngle as number) ?? 0
      hinge.rotation.x += (target - hinge.rotation.x) * 0.18
      // half_open flicker
      const stateColor = (view.stateRing.material as THREE.MeshBasicMaterial).color
      if (stateColor.getHex() === new THREE.Color(STATE_COLOR.half_open).getHex()) {
        mat.emissiveIntensity = 0.3 + flicker * 0.8
      }
      void isClosed
    }
  }

  /** Spawn + travel energy pulses for the most recent flows. */
  private syncFlows(state: GameState): void {
    // set target angles for the swing animation based on current states
    for (const d of state.districts) {
      const view = this.districtViews.get(d.id)
      if (!view) continue
      const hinge = view.switchBar.userData.hinge as THREE.Group | undefined
      if (!hinge) continue
      const angle = d.breaker.state === "closed" ? 0 : d.breaker.state === "open" ? -1.1 : -0.5
      view.switchBar.userData.targetAngle = angle
    }
    // pulse spawning is driven by the controller's flow history; we spawn one
    // sphere per new flow record and animate it along the pillar this frame.
    this.spawnPulses(state.flows, state.districts)
  }

  private spawnPulses(flows: readonly FlowRecord[], districts: readonly District[]): void {
    if (flows.length === 0) return
    const count = state0(flows, districts)
    if (this.pulseMesh) {
      this.gridGroup.remove(this.pulseMesh)
      this.pulseMesh.dispose()
      this.pulseMesh = null
    }
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshStandardMaterial({
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.9,
      }),
      count,
    )
    const m = new THREE.Matrix4()
    const colClosed = new THREE.Color("#9ad28a")
    const colFail = new THREE.Color("#f06292")
    const colReject = new THREE.Color("#ffb74d")
    let idx = 0
    const districtIndex = new Map(districts.map((d, i) => [d.id, i] as const))
    for (let i = 0; i < flows.length && idx < count; i++) {
      const f = flows[i]
      if (!f) continue
      const di = districtIndex.get(f.districtId) ?? 0
      const base = gridPos(di, districts.length)
      // stack pulses along the pillar height by recency
      const t = 1 - i / Math.max(1, flows.length)
      const y = 0.5 + t * (PILLAR_HEIGHT + 0.3)
      m.setPosition(base.x, y, base.z)
      mesh.setMatrixAt(idx, m)
      const c = f.outcome === "served" ? colClosed : f.outcome === "failed" ? colFail : colReject
      mesh.setColorAt(idx, c)
      idx++
    }
    mesh.count = idx
    this.gridGroup.add(mesh)
    this.pulseMesh = mesh
  }

  private animatePulses(): void {
    if (!this.pulseMesh) return
    // gentle bob so the grid feels alive
    const m = new THREE.Matrix4()
    const count = this.pulseMesh.count
    for (let i = 0; i < count; i++) {
      this.pulseMesh.getMatrixAt(i, m)
      const pos = new THREE.Vector3().setFromMatrixPosition(m)
      pos.y += Math.sin(this.clock * 4 + i) * 0.01
      m.setPosition(pos)
      this.pulseMesh.setMatrixAt(i, m)
    }
    this.pulseMesh.instanceMatrix.needsUpdate = true
  }
}

/** Cap the number of pulses we render so a big wave stays cheap. */
function state0(flows: readonly FlowRecord[], districts: readonly District[]): number {
  void districts
  return Math.min(flows.length, 60)
}

function makeLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0)"
    ctx.fillRect(0, 0, 256, 64)
    ctx.font = "bold 30px ui-monospace, monospace"
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, 128, 32)
  }
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(2.4, 0.6, 1)
  return sprite
}
