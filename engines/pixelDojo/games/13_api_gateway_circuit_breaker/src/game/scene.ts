// Breaker Grid — three.js scene.
//
// A 3D power substation embodying the circuit-breaker state machine:
//   - A massive center breaker LEVER with three hard-detented poses:
//       DOWN  = CLOSED  (horizontal, contact pads touching)
//       UP    = OPEN    (vertical, pads separated by a gap)
//       MID   = HALF_OPEN (diagonal, single spark-bridge)
//   - A COOLDOWN RING around the breaker base that drains while OPEN.
//   - CLIENT TERMINALS on the left (pulse sources).
//   - A REACTOR (upstream) on the right with a health ring.
//   - A FALLBACK BATTERY BANK below the breaker (503 fallback sink).
//   - PROBE SLOT indicators on the lever (3 dots, green when consumed).
//   - PULSE ORBS that travel along the bus from client -> breaker ->
//     reactor (admit) or breaker -> fallback (reject).
//
// The scene is a projection of the pure CircuitBreaker + wave state. It owns
// no game logic; main.ts drives it via setBreakerState / spawnPulse / etc.

import * as THREE from "three"
import type { BreakerState, ReactorResult } from "./wave"

const COLOR_BG = 0x06080d
const COLOR_GRID = 0x1a2535
const COLOR_LEVER = 0xcfa64a
const COLOR_BASE = 0x2a3548
const COLOR_REACTOR_OK = 0x7ac46b
const COLOR_REACTOR_BAD = 0xff6b6b
const COLOR_FALLBACK = 0x4a9eff
const COLOR_PULSE = 0xf6dd88
const COLOR_PULSE_FAIL = 0xff6b6b
const COLOR_COOLDOWN = 0xff8c42
const COLOR_PROBE_OFF = 0x3a4458
const COLOR_PROBE_ON = 0x7ac46b
const COLOR_GROUND = 0x0a0e16

type PulseAnim = {
  mesh: THREE.Mesh
  from: THREE.Vector3
  to: THREE.Vector3
  startMs: number
  durationMs: number
  color: number
  done: boolean
}

export type BreakerSceneState = {
  readonly breakerState: BreakerState
  readonly cooldownFraction: number // 1 = just tripped, 0 = drained
  readonly thresholdCrossed: boolean
  readonly failureRate: number // 0..1
  readonly probeSlotsUsed: number
  readonly probeSlotsTotal: number
}

export class BreakerGridScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly leverPivot: THREE.Group
  private readonly cooldownRing: THREE.Mesh
  private readonly reactorCore: THREE.Mesh
  private readonly reactorHealthRing: THREE.Mesh
  private readonly probeSlots: THREE.Mesh[]
  private readonly fallbackCells: THREE.Mesh[]
  private readonly clientTerminals: THREE.Mesh[]
  private readonly pulses: PulseAnim[] = []
  private readonly leverTargetRotation = new THREE.Vector3()

  // Fixed world positions for pulse routing.
  private readonly breakerPos = new THREE.Vector3(0, 1.2, 0)
  private readonly reactorPos = new THREE.Vector3(6.5, 2.2, 0)
  private readonly fallbackPos = new THREE.Vector3(0, -2.2, 2.5)
  private readonly clientStart = new THREE.Vector3(-7, 2.4, 0)

  private width = 800
  private height = 600
  private reactorFlashUntil = 0
  private reactorFlashColor = COLOR_REACTOR_OK

  constructor(holder: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(COLOR_BG, 1)
    holder.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(COLOR_BG, 16, 32)

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 100)
    this.camera.position.set(0, 4.5, 13)
    this.camera.lookAt(0, 0.5, 0)

    this.addLights()
    this.addGround()
    this.addClientTerminals()
    const reactorCore = this.addReactor()
    this.reactorCore = reactorCore
    this.reactorHealthRing = this.buildRing(2.2, 0.05, COLOR_REACTOR_OK, this.reactorPos, Math.PI / 2)
    this.fallbackCells = this.addFallbackBank()
    this.leverPivot = this.addBreakerLever()
    this.cooldownRing = this.buildRing(2.6, 0.12, COLOR_COOLDOWN, new THREE.Vector3(0, 0.15, 0), 0)
    this.cooldownRing.visible = false
    this.probeSlots = this.addProbeSlots()

    this.resizeFromHolder(holder)
  }

  private addLights(): void {
    const ambient = new THREE.AmbientLight(0xb0c4de, 0.55)
    this.scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(4, 10, 6)
    this.scene.add(dir)
    const breakerPoint = new THREE.PointLight(0xf6dd88, 0.6, 12)
    breakerPoint.position.set(0, 3, 2)
    this.scene.add(breakerPoint)
  }

  private addGround(): void {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: COLOR_GROUND, roughness: 0.95 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -2.8
    this.scene.add(ground)

    const grid = new THREE.GridHelper(40, 40, COLOR_GRID, COLOR_GRID)
    grid.position.y = -2.79
    this.scene.add(grid)
  }

  private addClientTerminals(): void {
    this.clientTerminals = []
    const offsets = [-1.6, 0, 1.6]
    for (const z of offsets) {
      const term = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 1.4, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x3a4458, roughness: 0.7 }),
      )
      term.position.set(-7, -1.4, z)
      this.scene.add(term)
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.5),
        new THREE.MeshBasicMaterial({ color: 0x4a9eff }),
      )
      screen.position.set(-6.4, -1.1, z)
      screen.rotation.y = Math.PI / 2
      this.scene.add(screen)
      this.clientTerminals.push(term)
    }
    // Input bus rail from terminals toward breaker.
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(5.5, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4a5468, emissive: 0x1a2535 }),
    )
    rail.position.set(-3.5, 1.0, 0)
    this.scene.add(rail)
  }

  private addReactor(): THREE.Mesh {
    // Reactor base pedestal.
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.2, 1.2, 12),
      new THREE.MeshStandardMaterial({ color: COLOR_BASE, roughness: 0.8 }),
    )
    pedestal.position.set(this.reactorPos.x, -1.6, 0)
    this.scene.add(pedestal)
    // Reactor core.
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.0, 1),
      new THREE.MeshStandardMaterial({
        color: COLOR_REACTOR_OK,
        emissive: COLOR_REACTOR_OK,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        flatShading: true,
      }),
    )
    core.position.copy(this.reactorPos)
    this.scene.add(core)
    // Output bus from breaker to reactor.
    const outBus = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.12, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x4a5468, emissive: 0x1a2535 }),
    )
    outBus.position.set(3.0, 1.0, 0)
    this.scene.add(outBus)
    return core
  }

  private addFallbackBank(): THREE.Mesh[] {
    const cells: THREE.Mesh[] = []
    for (let i = 0; i < 5; i += 1) {
      const cell = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.0, 0.8),
        new THREE.MeshStandardMaterial({
          color: COLOR_FALLBACK,
          emissive: COLOR_FALLBACK,
          emissiveIntensity: 0.2,
          roughness: 0.6,
        }),
      )
      cell.position.set(-2.4 + i * 1.2, -2.0, 2.6)
      this.scene.add(cell)
      cells.push(cell)
    }
    // Chute from breaker down to fallback bank.
    const chute = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 2.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2a3548 }),
    )
    chute.position.set(0, -0.5, 1.6)
    this.scene.add(chute)
    return cells
  }

  private addBreakerLever(): THREE.Group {
    const pivot = new THREE.Group()
    pivot.position.set(0, 1.2, 0)
    this.scene.add(pivot)

    // Base pedestal.
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 2.0, 10),
      new THREE.MeshStandardMaterial({ color: COLOR_BASE, roughness: 0.8 }),
    )
    base.position.y = -1.0
    pivot.add(base)

    // Contact pad (the fixed side on the reactor bus).
    const padFixed = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x6a7488, metalness: 0.6, roughness: 0.4 }),
    )
    padFixed.position.set(1.6, 0, 0)
    pivot.add(padFixed)

    // The lever arm (the moving side).
    const arm = new THREE.Group()
    const armMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.35, 0.35),
      new THREE.MeshStandardMaterial({
        color: COLOR_LEVER,
        emissive: 0x3a2a10,
        metalness: 0.5,
        roughness: 0.4,
      }),
    )
    armMesh.position.x = 1.1
    arm.add(armMesh)
    // Moving contact pad at the tip.
    const padMoving = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xcfa64a, metalness: 0.7, roughness: 0.3 }),
    )
    padMoving.position.x = 2.4
    arm.add(padMoving)
    // Grip handle at the back.
    const grip = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a3548, roughness: 0.6 }),
    )
    grip.position.x = -0.3
    arm.add(grip)
    pivot.add(arm)

    return pivot
  }

  private addProbeSlots(): THREE.Mesh[] {
    const slots: THREE.Mesh[] = []
    for (let i = 0; i < 3; i += 1) {
      const slot = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        new THREE.MeshStandardMaterial({
          color: COLOR_PROBE_OFF,
          emissive: COLOR_PROBE_OFF,
          emissiveIntensity: 0.2,
        }),
      )
      slot.position.set(0.5 + i * 0.5, 0.4, 0)
      this.leverPivot.add(slot)
      slots.push(slot)
    }
    return slots
  }

  private buildRing(
    radius: number,
    tube: number,
    color: number,
    position: THREE.Vector3,
    rotationX: number,
  ): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 48),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.85,
      }),
    )
    ring.position.copy(position)
    ring.rotation.x = rotationX
    this.scene.add(ring)
    return ring
  }

  // --- Public API driven by main.ts ---

  sync(state: BreakerSceneState, now: number): void {
    // Lever target rotation by state.
    let target = 0
    if (state.breakerState === "CLOSED") {
      target = 0 // horizontal
    } else if (state.breakerState === "OPEN") {
      target = -Math.PI / 2 // vertical (UP)
    } else {
      target = -Math.PI / 4 // diagonal (MID)
    }
    this.leverTargetRotation.set(0, 0, target)

    // Cooldown ring visible while OPEN, opacity scales with remaining fraction.
    if (state.breakerState === "OPEN") {
      this.cooldownRing.visible = true
      const mat = this.cooldownRing.material as THREE.MeshStandardMaterial
      mat.opacity = 0.3 + state.cooldownFraction * 0.6
      const scale = 1 + (1 - state.cooldownFraction) * 0.15
      this.cooldownRing.scale.setScalar(scale)
    } else {
      this.cooldownRing.visible = false
    }

    // Reactor health color from failure rate + threshold flash.
    const reactorMat = this.reactorCore.material as THREE.MeshStandardMaterial
    const flashing = now < this.reactorFlashUntil
    if (flashing) {
      reactorMat.color.setHex(this.reactorFlashColor)
      reactorMat.emissive.setHex(this.reactorFlashColor)
      reactorMat.emissiveIntensity = 0.8
    } else {
      const bad = state.failureRate >= 0.4 || state.thresholdCrossed
      const hex = bad ? COLOR_REACTOR_BAD : COLOR_REACTOR_OK
      reactorMat.color.setHex(hex)
      reactorMat.emissive.setHex(hex)
      reactorMat.emissiveIntensity = 0.3 + state.failureRate * 0.4
    }
    const ringMat = this.reactorHealthRing.material as THREE.MeshStandardMaterial
    ringMat.color.setHex(state.thresholdCrossed ? COLOR_REACTOR_BAD : COLOR_REACTOR_OK)
    ringMat.emissive.setHex(state.thresholdCrossed ? COLOR_REACTOR_BAD : COLOR_REACTOR_OK)

    // Probe slots: first N lit green.
    for (let i = 0; i < this.probeSlots.length; i += 1) {
      const slot = this.probeSlots[i]
      if (slot === undefined) {
        continue
      }
      const lit = i < state.probeSlotsUsed
      const mat = slot.material as THREE.MeshStandardMaterial
      mat.color.setHex(lit ? COLOR_PROBE_ON : COLOR_PROBE_OFF)
      mat.emissive.setHex(lit ? COLOR_PROBE_ON : COLOR_PROBE_OFF)
      mat.emissiveIntensity = lit ? 0.9 : 0.2
    }
  }

  // Spawn a pulse from the client terminal toward the breaker, then onward.
  spawnClientPulse(): void {
    const mesh = this.makePulse(COLOR_PULSE)
    mesh.position.copy(this.clientStart)
    this.scene.add(mesh)
    this.pulses.push({
      mesh,
      from: this.clientStart.clone(),
      to: this.breakerPos.clone(),
      startMs: performance.now(),
      durationMs: 700,
      color: COLOR_PULSE,
      done: false,
    })
  }

  // Continue a pulse from the breaker to the reactor (ADMIT).
  spawnAdmitPulse(result: ReactorResult): void {
    const color = result === "SUCCESS" ? COLOR_PULSE : COLOR_PULSE_FAIL
    const mesh = this.makePulse(color)
    mesh.position.copy(this.breakerPos)
    this.scene.add(mesh)
    this.pulses.push({
      mesh,
      from: this.breakerPos.clone(),
      to: this.reactorPos.clone(),
      startMs: performance.now(),
      durationMs: 600,
      color,
      done: false,
    })
    this.reactorFlashUntil = performance.now() + 400
    this.reactorFlashColor = color
  }

  // Drop a pulse from the breaker to the fallback bank (REJECT / fail-fast).
  spawnRejectPulse(): void {
    const mesh = this.makePulse(COLOR_FALLBACK)
    mesh.position.copy(this.breakerPos)
    this.scene.add(mesh)
    this.pulses.push({
      mesh,
      from: this.breakerPos.clone(),
      to: this.fallbackPos.clone(),
      startMs: performance.now(),
      durationMs: 800,
      color: COLOR_FALLBACK,
      done: false,
    })
  }

  private makePulse(color: number): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.9,
      }),
    )
  }

  // Advance animations and render one frame.
  render(): void {
    const now = performance.now()
    // Smoothly lerp lever rotation toward target.
    const cur = this.leverPivot.rotation.z
    const target = this.leverTargetRotation.z
    this.leverPivot.rotation.z = cur + (target - cur) * 0.18

    // Advance pulses.
    for (const pulse of this.pulses) {
      if (pulse.done) {
        continue
      }
      const t = Math.min(1, (now - pulse.startMs) / pulse.durationMs)
      pulse.mesh.position.lerpVectors(pulse.from, pulse.to, t)
      if (t >= 1) {
        pulse.done = true
        this.scene.remove(pulse.mesh)
        pulse.mesh.geometry.dispose()
      }
    }
    // Compact the pulse pool.
    for (let i = this.pulses.length - 1; i >= 0; i -= 1) {
      const pulse = this.pulses[i]
      if (pulse !== undefined && pulse.done) {
        this.pulses.splice(i, 1)
      }
    }

    // Gentle parallax on the camera from pointer position (mouse interaction).
    this.camera.position.x = this.cameraParallaxX
    this.camera.position.y = 4.5 + this.cameraParallaxY * 0.4
    this.camera.lookAt(0, 0.5, 0)

    this.renderer.render(this.scene, this.camera)
  }

  private cameraParallaxX = 0
  private cameraParallaxY = 0
  setPointer(nx: number, ny: number): void {
    // nx, ny in [-1, 1].
    this.cameraParallaxX = nx * 1.6
    this.cameraParallaxY = ny
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return
    }
    this.width = width
    this.height = height
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  private resizeFromHolder(holder: HTMLElement): void {
    const rect = holder.getBoundingClientRect()
    this.resize(rect.width, rect.height)
  }

  dispose(): void {
    this.renderer.dispose()
    const parent = this.renderer.domElement.parentElement
    if (parent !== null) {
      parent.removeChild(this.renderer.domElement)
    }
  }
}
