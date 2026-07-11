import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import { bufferedTruth, streamingTruth } from "../sim/levels"

export const PALETTE = [
  "#4fc3f7", // fluid blue
  "#ffb74d", // overflow amber
  "#f06292", // overflow red
  "#aed581", // delivered green
  "#ba68c8",
  "#ffd54f",
  "#80cbc4",
  "#e0e0e0",
] as const

const FLUID_COLOR = 0x4fc3f7
const OVERFLOW_COLOR = 0xffb74d
const OVERFLOW_HOT = 0xf06292
const RIM_COLOR = 0xe6e9f2
const TANK_CHROME = 0x3d4663
const PIPE_COLOR = 0x5a6688
const SLUG_COLOR = 0x4fc3f7

// tank geometry (world units)
const TANK_W = 5
const TANK_H = 6
const TANK_D = 4
const TANK_BOTTOM_Y = 0
const TANK_CENTER_Y = TANK_BOTTOM_Y + TANK_H / 2
// pipe
const PIPE_RADIUS = 0.45
const PIPE_LENGTH = 6
const PIPE_END_X = -TANK_W / 2 // pipe meets the left wall of the tank
const PIPE_START_X = PIPE_END_X - PIPE_LENGTH

/** Map a byte value to a fluid level (Y) given a job's capacity, clamped to the tank interior. */
function bytesToLevel(bytes: number, capacity: number): number {
  const ratio = Math.min(1.2, Math.max(0, bytes / Math.max(1, capacity)))
  return TANK_BOTTOM_Y + ratio * TANK_H
}

/**
 * Three.js projection of sim state. Renders only — all rules live in src/sim and src/game.
 * Hero object: a transparent buffer tank with a fluid level plane, fed by a cylinder pipe.
 * Buffered mode floods the whole volume at once (level = size); stream mode feeds chunked slugs
 * one at a time (level stair-steps, settles at chunkSize). Overflow spills past the rim as a
 * Points cloud when size > capacity.
 */
export class PipelineScene {
  private readonly viewport: Viewport
  private clock = new THREE.Clock()

  // tank parts
  private fluidMesh: THREE.Mesh
  private fluidTargetY = TANK_BOTTOM_Y
  private fluidCurrentY = TANK_BOTTOM_Y
  private rimMesh: THREE.Mesh
  private levelLine: THREE.Mesh // capacity marker line at the rim

  // pipe + slugs
  private pipe: THREE.Mesh
  private slugs: THREE.Mesh[] = []

  // overflow particles
  private overflowPoints: THREE.Points | null = null
  private overflowVelocities: Float32Array | null = null
  private overflowMax = 400

  // buffer/stream lever
  private lever: THREE.Mesh
  private leverPivot: THREE.Group

  // resolved truth the scene is animating toward (set on sync)
  private resolvedOverflow = 0

  onTankClick: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 22,
      fogFar: 60,
      cameraPosition: [6, 6, 14],
      controlsTarget: [0, TANK_CENTER_Y, 0],
      minDistance: 8,
      maxDistance: 40,
      ambientIntensity: 0.75,
      keyIntensity: 1.1,
      onFrame: () => {
        const dt = this.clock.getDelta()
        this.animate(dt, this.clock.getElapsedTime())
      },
    })

    // tank shell — transparent box (just edges + faint walls)
    const tankGeo = new THREE.BoxGeometry(TANK_W, TANK_H, TANK_D)
    const tankMat = new THREE.MeshBasicMaterial({
      color: TANK_CHROME,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    })
    const tankShell = new THREE.Mesh(tankGeo, tankMat)
    tankShell.position.y = TANK_CENTER_Y
    this.viewport.scene.add(tankShell)
    // tank wireframe edges so the box reads as a container
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(tankGeo),
      new THREE.LineBasicMaterial({ color: TANK_CHROME }),
    )
    edges.position.y = TANK_CENTER_Y
    this.viewport.scene.add(edges)

    // fluid level plane — sits inside the tank, rises with memory
    this.fluidMesh = new THREE.Mesh(
      new THREE.BoxGeometry(TANK_W - 0.2, 1, TANK_D - 0.2),
      new THREE.MeshStandardMaterial({
        color: FLUID_COLOR,
        transparent: true,
        opacity: 0.78,
        emissive: FLUID_COLOR,
        emissiveIntensity: 0.25,
      }),
    )
    this.fluidMesh.position.y = TANK_BOTTOM_Y
    this.viewport.scene.add(this.fluidMesh)

    // capacity rim — a glowing ring at the top of the tank marking the capacity limit
    this.rimMesh = new THREE.Mesh(
      new THREE.TorusGeometry(TANK_W * 0.62, 0.08, 8, 48),
      new THREE.MeshBasicMaterial({ color: RIM_COLOR }),
    )
    this.rimMesh.rotation.x = Math.PI / 2
    this.rimMesh.position.y = TANK_BOTTOM_Y + TANK_H
    this.rimMesh.scale.x = TANK_D / TANK_W
    this.viewport.scene.add(this.rimMesh)

    // capacity marker line inside the tank (the "100%" level)
    this.levelLine = new THREE.Mesh(
      new THREE.BoxGeometry(TANK_W - 0.1, 0.04, TANK_D - 0.1),
      new THREE.MeshBasicMaterial({ color: RIM_COLOR, transparent: true, opacity: 0.5 }),
    )
    this.levelLine.position.y = TANK_BOTTOM_Y + TANK_H
    this.viewport.scene.add(this.levelLine)

    // pipe feeding the tank from the left
    this.pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(PIPE_RADIUS, PIPE_RADIUS, PIPE_LENGTH, 20),
      new THREE.MeshStandardMaterial({ color: PIPE_COLOR, flatShading: true }),
    )
    this.pipe.rotation.z = Math.PI / 2
    this.pipe.position.set((PIPE_START_X + PIPE_END_X) / 2, TANK_BOTTOM_Y + TANK_H - 0.6, 0)
    this.viewport.scene.add(this.pipe)
    // pipe mouth ring at the tank wall
    const mouth = new THREE.Mesh(
      new THREE.TorusGeometry(PIPE_RADIUS, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: RIM_COLOR }),
    )
    mouth.rotation.y = Math.PI / 2
    mouth.position.set(PIPE_END_X, this.pipe.position.y, 0)
    this.viewport.scene.add(mouth)

    // buffer/stream lever — a pivoting bar to the right of the tank
    this.leverPivot = new THREE.Group()
    this.leverPivot.position.set(TANK_W / 2 + 2.2, TANK_CENTER_Y, 0)
    this.lever = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 2.4, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffd54f, flatShading: true }),
    )
    this.lever.position.y = 0
    this.leverPivot.add(this.lever)
    // lever knob
    const knob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.32),
      new THREE.MeshStandardMaterial({
        color: 0xffd54f,
        emissive: 0xffd54f,
        emissiveIntensity: 0.4,
      }),
    )
    knob.position.y = 1.2
    this.leverPivot.add(knob)
    // lever base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.6, 0.4, 16),
      new THREE.MeshStandardMaterial({ color: TANK_CHROME, flatShading: true }),
    )
    base.position.y = -1.4
    this.leverPivot.add(base)
    this.viewport.scene.add(this.leverPivot)

    // floor grid
    const grid = new THREE.GridHelper(40, 40, "#1c2236", "#141a2b")
    grid.position.y = TANK_BOTTOM_Y - 0.01
    this.viewport.scene.add(grid)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    // the whole tank volume is the click target (shell + fluid)
    const targets = [this.fluidMesh]
    const hits = this.viewport.raycaster.intersectObjects(targets)
    if (hits.length > 0 && this.onTankClick) this.onTankClick()
  }

  /** Rebuild the projection from a sim snapshot. */
  sync(state: GameState): void {
    const job = state.job
    const level = state.level

    // lever mode reflects the level's teaching mode
    this.setLeverVisual(level.mode)

    // compute the resolved truth this level animates toward
    if (level.mode === "buffered") {
      const truth = bufferedTruth(job, level.backpressure)
      this.resolvedOverflow = truth.overflowed
      this.fluidTargetY = bytesToLevel(truth.peakMem, job.capacity)
    } else {
      const truth = streamingTruth(job, job.chunkSize)
      this.resolvedOverflow = truth.overflowed
      // streamed peak = chunkSize, so the level settles at the chunk height
      this.fluidTargetY = bytesToLevel(truth.peakMem, job.capacity)
    }

    // rebuild slugs for stream mode (chunked slugs in the pipe)
    this.syncSlugs(state)

    // begin resolving animation once the player has acted (cleared/failed) OR during predicting we
    // show the *target* state so the level is readable. In predicting we keep level at 0 until the
    // player commits; once resolved we animate up.
    if (state.phase === "briefing" || state.phase === "predicting") {
      this.fluidTargetY = TANK_BOTTOM_Y
      this.clearOverflow()
    } else {
      if (this.resolvedOverflow > 0) this.spawnOverflow(this.resolvedOverflow, job.capacity)
    }
  }

  private syncSlugs(state: GameState): void {
    // remove old slugs
    for (const s of this.slugs) this.viewport.scene.remove(s)
    this.slugs = []
    if (state.level.mode !== "streaming") {
      return
    }
    const chunk = state.job.chunkSize
    const count = Math.min(12, Math.max(1, Math.ceil(state.job.size / Math.max(1, chunk))))
    const slugLen = 0.5
    for (let i = 0; i < count; i++) {
      const slug = new THREE.Mesh(
        new THREE.CylinderGeometry(PIPE_RADIUS * 0.78, PIPE_RADIUS * 0.78, slugLen, 14),
        new THREE.MeshStandardMaterial({
          color: SLUG_COLOR,
          emissive: SLUG_COLOR,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.9,
        }),
      )
      slug.rotation.z = Math.PI / 2
      // stagger slugs along the pipe
      const t = i / Math.max(1, count)
      slug.position.set(PIPE_START_X + t * PIPE_LENGTH, this.pipe.position.y, 0)
      slug.userData = { phase: t }
      this.viewport.scene.add(slug)
      this.slugs.push(slug)
    }
  }

  private setLeverVisual(mode: "buffered" | "streaming"): void {
    // buffered → lever tilts left (-35°); streaming → tilts right (+35°)
    const target = mode === "buffered" ? -0.6 : 0.6
    this.leverPivot.rotation.z += (target - this.leverPivot.rotation.z) * 0.15
  }

  private spawnOverflow(amount: number, capacity: number): void {
    const n = Math.min(this.overflowMax, Math.max(40, Math.round(amount * 4)))
    const positions = new Float32Array(n * 3)
    this.overflowVelocities = new Float32Array(n * 3)
    const topY = TANK_BOTTOM_Y + TANK_H
    for (let i = 0; i < n; i++) {
      // spawn around the rim, biased to spill over the side
      const angle = Math.random() * Math.PI * 2
      const r = TANK_W * 0.5
      positions[i * 3] = Math.cos(angle) * r * (TANK_D / TANK_W) * 1.05
      positions[i * 3 + 1] = topY + Math.random() * 0.3
      positions[i * 3 + 2] = Math.sin(angle) * r * 1.05
      // velocity: outward + down (gravity)
      this.overflowVelocities[i * 3] = Math.cos(angle) * (1.5 + Math.random() * 2)
      this.overflowVelocities[i * 3 + 1] = Math.random() * 1.5
      this.overflowVelocities[i * 3 + 2] = Math.sin(angle) * (1.5 + Math.random() * 2)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    const mat = new THREE.PointsMaterial({
      color: amount > capacity ? OVERFLOW_HOT : OVERFLOW_COLOR,
      size: 0.22,
      transparent: true,
      opacity: 0.95,
    })
    if (this.overflowPoints) {
      this.viewport.scene.remove(this.overflowPoints)
      this.overflowPoints.geometry.dispose()
      ;(this.overflowPoints.material as THREE.Material).dispose()
    }
    this.overflowPoints = new THREE.Points(geo, mat)
    this.viewport.scene.add(this.overflowPoints)
    void capacity
  }

  private clearOverflow(): void {
    if (this.overflowPoints) {
      this.viewport.scene.remove(this.overflowPoints)
      this.overflowPoints.geometry.dispose()
      ;(this.overflowPoints.material as THREE.Material).dispose()
      this.overflowPoints = null
    }
    this.overflowVelocities = null
  }

  private animate(dt: number, elapsed: number): void {
    // lerp the fluid level toward its target
    this.fluidCurrentY += (this.fluidTargetY - this.fluidCurrentY) * Math.min(1, dt * 3)
    // scale the fluid box so its top sits at the current level (box is 1 unit tall, anchored at bottom)
    const bottom = TANK_BOTTOM_Y
    const top = Math.max(bottom + 0.05, this.fluidCurrentY)
    const height = top - bottom
    this.fluidMesh.scale.y = height
    this.fluidMesh.position.y = bottom + height / 2

    // animate slugs traveling down the pipe (stream mode)
    const speed = 1.4
    for (const slug of this.slugs) {
      const phase = (slug.userData.phase as number) + dt * speed * 0.16
      const wrapped = phase % 1
      slug.userData.phase = wrapped
      slug.position.x = PIPE_START_X + wrapped * PIPE_LENGTH
      // fade slugs that have entered the tank
      const enteredTank = slug.position.x >= PIPE_END_X - 0.2
      ;(slug.material as THREE.MeshStandardMaterial).opacity = enteredTank ? 0.2 : 0.9
    }

    // gravity-integrate overflow particles
    if (this.overflowPoints && this.overflowVelocities) {
      const pos = this.overflowPoints.geometry.getAttribute("position") as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      const vel = this.overflowVelocities
      for (let i = 0; i < arr.length; i += 3) {
        let vx = vel[i] ?? 0
        let vy = vel[i + 1] ?? 0
        let vz = vel[i + 2] ?? 0
        vy -= 9.8 * dt // gravity
        arr[i] = (arr[i] ?? 0) + vx * dt
        arr[i + 1] = (arr[i + 1] ?? 0) + vy * dt
        arr[i + 2] = (arr[i + 2] ?? 0) + vz * dt
        // settle on the floor
        if ((arr[i + 1] ?? 0) < TANK_BOTTOM_Y) {
          arr[i + 1] = TANK_BOTTOM_Y
          vy = 0
          vx *= 0.6
          vz *= 0.6
        }
        vel[i] = vx
        vel[i + 1] = vy
        vel[i + 2] = vz
      }
      pos.needsUpdate = true
      ;(this.overflowPoints.material as THREE.PointsMaterial).opacity = Math.max(
        0.3,
        0.95 - (elapsed % 10) * 0.02,
      )
    }
  }
}
