import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { GameState } from "../game/controller"
import type { PredictionTarget } from "../sim/levels"

// The outermost wall's radius. Walls are placed by POSITION in the player's order (outermost =
// index 0), so a reorder visibly moves them — the L4 lesson. The avatar parks just outside this
// radius and walks inward along the +X spoke.
const OUTER_RADIUS = 9
const CITADEL_RADIUS = 0.9
const WALL_TUBE = 0.18
// The gates line up on one radial spoke (+X axis) so a request walks a straight line inward.
// Walls are full torus rings with an emissive gate-pillar marker on that spoke; the avatar
// walks along +X through them, keeping the "walk inward" reading unambiguous.

export const PALETTE = {
  logging: "#4fc3f7",
  auth: "#ffb74d",
  rateLimit: "#aed581",
  citadel: "#ffd54f",
  pass: "#66bb6a",
  reject: "#f06292",
  avatar: "#e6e9f2",
} as const

function wallColor(name: string): string {
  if (name === "logging") return PALETTE.logging
  if (name === "auth") return PALETTE.auth
  return PALETTE.rateLimit
}

/** Position along the inward spoke (east gate) at a given radius fraction. */
function spokePoint(radius: number, lift = 0): THREE.Vector3 {
  return new THREE.Vector3(radius, lift, 0)
}

/**
 * Three.js projection of sim state. Renders only — all rules live in src/sim and src/game.
 *
 * The hero object is the city itself: three concentric torus walls (logging → auth →
 * rate-limit) with a gap (gate) on the +X spoke, and a tall citadel beacon at the center.
 * The pending request avatar is an emissive icosahedron parked outside the logging wall; on
 * each prediction it walks inward along the spoke, flashing green if it passed every wall and
 * red if a wall rejected it (then thrown back outward).
 */
export class CheckpointScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private cityGroup = new THREE.Group()
  private wallMeshes = new Map<string, THREE.Mesh>()
  private gateMeshes = new Map<string, THREE.Mesh>()
  private citadel: THREE.Mesh
  private avatar: THREE.Mesh
  private avatarLight: THREE.PointLight
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private clock = new THREE.Clock()
  /** animation state for the walking/recoiling avatar */
  private anim: {
    from: number
    to: number
    t: number
    duration: number
    reject: boolean
    active: boolean
  } = { from: OUTER_RADIUS + 1.5, to: 0, t: 0, duration: 0.9, reject: false, active: false }
  /** predicted-reject wall flash timers (wall name → seconds remaining) */
  private flashes = new Map<string, number>()
  onGateClick: ((target: PredictionTarget) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#0b0e14")
    this.scene.fog = new THREE.Fog("#0b0e14", 24, 60)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200)
    this.camera.position.set(6, 11, 18)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 50
    this.controls.minDistance = 8
    this.controls.target.set(0, 0.5, 0)

    this.cityGroup.rotation.y = 0
    this.scene.add(this.cityGroup)

    // faint reference floor grid for spatial anchoring
    const grid = new THREE.GridHelper(36, 36, "#1c2236", "#141a2b")
    grid.position.y = -0.6
    this.cityGroup.add(grid)

    // lighting: ambient + one key directional, per the 3d-style guide
    this.scene.add(new THREE.AmbientLight("#ffffff", 0.7))
    const key = new THREE.DirectionalLight("#ffffff", 1.1)
    key.position.set(8, 16, 8)
    this.scene.add(key)

    // citadel beacon at center (the handler)
    this.citadel = new THREE.Mesh(
      new THREE.ConeGeometry(CITADEL_RADIUS, 2.6, 6),
      new THREE.MeshStandardMaterial({
        color: PALETTE.citadel,
        emissive: PALETTE.citadel,
        emissiveIntensity: 0.6,
        flatShading: true,
      }),
    )
    this.citadel.position.set(0, 0.7, 0)
    this.cityGroup.add(this.citadel)
    const beaconLight = new THREE.PointLight(PALETTE.citadel, 0.8, 8)
    beaconLight.position.set(0, 2, 0)
    this.cityGroup.add(beaconLight)

    // request avatar (parked outside the outer wall until a wave starts)
    this.avatar = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32),
      new THREE.MeshStandardMaterial({
        color: PALETTE.avatar,
        emissive: PALETTE.avatar,
        emissiveIntensity: 0.5,
        flatShading: true,
      }),
    )
    this.avatar.position.copy(spokePoint(OUTER_RADIUS + 1.5, 0.5))
    this.cityGroup.add(this.avatar)
    this.avatarLight = new THREE.PointLight(PALETTE.avatar, 0.6, 4)
    this.cityGroup.add(this.avatarLight)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
    window.addEventListener("resize", () => this.resize())
    this.resize()
    this.renderer.setAnimationLoop(() => {
      this.controls.update()
      this.animate(this.clock.getDelta())
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
    const targets = [this.citadel, ...this.wallMeshes.values(), ...this.gateMeshes.values()]
    const hits = this.raycaster.intersectObjects(targets)
    const first = hits[0]
    if (!first || !this.onGateClick) return
    const target = (first.object.userData as { predicts?: PredictionTarget }).predicts
    if (target) this.onGateClick(target)
  }

  /** Rebuild the wall layout from a sim snapshot (handles L4 reordering). */
  sync(state: GameState): void {
    this.syncWalls(state)
    this.syncAvatar(state)
  }

  private syncWalls(state: GameState): void {
    // rebuild walls from scratch when the order changes (cheap: ≤3 walls)
    for (const mesh of this.wallMeshes.values()) {
      this.cityGroup.remove(mesh)
      mesh.geometry.dispose()
    }
    for (const mesh of this.gateMeshes.values()) {
      this.cityGroup.remove(mesh)
      mesh.geometry.dispose()
    }
    this.wallMeshes.clear()
    this.gateMeshes.clear()

    // assign radii by POSITION in the order (outermost = index 0), not by name, so a reorder
    // visibly moves walls — the L4 lesson.
    const outer = 9
    const step = 2.7
    state.order.forEach((name, i) => {
      const radius = outer - i * step
      const color = wallColor(name)
      // full torus wall
      const wall = new THREE.Mesh(
        new THREE.TorusGeometry(radius, WALL_TUBE, 10, 96),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.25,
          flatShading: true,
        }),
      )
      wall.rotation.x = Math.PI / 2
      wall.userData = { wallName: name, predicts: wallToPrediction(name) as PredictionTarget }
      this.cityGroup.add(wall)
      this.wallMeshes.set(`${name}-${i}`, wall)

      // gate marker on the +X spoke (a small emissive pillar in the gap)
      const gate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.7,
          flatShading: true,
        }),
      )
      gate.position.copy(spokePoint(radius, 0.1))
      gate.userData = { wallName: name, predicts: wallToPrediction(name) as PredictionTarget }
      this.cityGroup.add(gate)
      this.gateMeshes.set(`${name}-${i}`, gate)
    })
  }

  private syncAvatar(state: GameState): void {
    const resolved = state.lastResolved
    if (resolved && this.anim.active === false) {
      // kick off the walk animation toward the citadel, or recoil at the rejecting wall
      const rejectWall = resolved.result.rejectedAt
      this.anim.from = OUTER_RADIUS + 1.5
      this.anim.reject = rejectWall !== null
      this.anim.to = rejectWall === null ? 0 : radiusForWall(rejectWall, state.order)
      this.anim.t = 0
      this.anim.active = true
      if (rejectWall) this.flashes.set(rejectWall, 0.6)
      const mat = this.avatar.material as THREE.MeshStandardMaterial
      mat.emissive = new THREE.Color(rejectWall ? PALETTE.reject : PALETTE.pass)
    }
    if (state.phase === "briefing") {
      // park the avatar outside the outer wall, neutral color
      this.anim.active = false
      this.avatar.position.copy(spokePoint(OUTER_RADIUS + 1.5, 0.5))
      const mat = this.avatar.material as THREE.MeshStandardMaterial
      mat.emissive = new THREE.Color(PALETTE.avatar)
    }
  }

  private animate(dt: number): void {
    const t = this.clock.elapsedTime
    // citadel slow bob + spin
    this.citadel.rotation.y = t * 0.4
    this.citadel.position.y = 0.7 + Math.sin(t * 1.5) * 0.05

    // avatar walk / recoil
    if (this.anim.active) {
      this.anim.t = Math.min(1, this.anim.t + dt / this.anim.duration)
      const eased = this.anim.reject ? easeOutBack(this.anim.t) : easeInOut(this.anim.t)
      const r = this.anim.from + (this.anim.to - this.anim.from) * eased
      // recoil: after reaching the reject wall, bounce back outward
      const recoil = this.anim.reject && this.anim.t > 0.6 ? (this.anim.t - 0.6) * 4 : 0
      this.avatar.position.copy(spokePoint(r + recoil, 0.5))
      if (this.anim.t >= 1) this.anim.active = false
    }

    // wall reject flashes
    for (const [name, remain] of this.flashes) {
      const next = remain - dt
      if (next <= 0) {
        this.flashes.delete(name)
        this.resetWallEmissive(name)
      } else {
        this.flashes.set(name, next)
        this.flashWall(name, remain)
      }
    }

    this.avatarLight.position.copy(this.avatar.position)
  }

  private wallMeshFor(name: string): THREE.Mesh | undefined {
    for (const [key, mesh] of this.wallMeshes) {
      if (key.startsWith(`${name}-`)) return mesh
    }
    return undefined
  }

  private flashWall(name: string, remain: number): void {
    const mesh = this.wallMeshFor(name)
    if (!mesh) return
    const mat = mesh.material as THREE.MeshStandardMaterial
    const intensity = 0.25 + (remain / 0.6) * 1.4
    mat.emissive = new THREE.Color(PALETTE.reject)
    mat.emissiveIntensity = intensity
  }

  private resetWallEmissive(name: string): void {
    const mesh = this.wallMeshFor(name)
    if (!mesh) return
    const mat = mesh.material as THREE.MeshStandardMaterial
    mat.emissive = new THREE.Color(wallColor(name))
    mat.emissiveIntensity = 0.25
  }
}

function wallToPrediction(wallName: string): PredictionTarget {
  if (wallName === "logging") return "logging"
  if (wallName === "auth") return "auth"
  return "rate-limit"
}

/** radius of a named wall given the current order (outer = index 0). */
function radiusForWall(name: string, order: readonly string[]): number {
  const idx = order.indexOf(name)
  return 9 - (idx < 0 ? 0 : idx) * 2.7
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2
}
