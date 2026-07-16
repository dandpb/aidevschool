import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import { percentile } from "../sim/histogram"
import { N_BUCKETS } from "../sim/levels"

// Layout: bucket columns march along the X axis (value axis 0..1). Their height = bucket count.
// The p95 contour is a glowing horizontal ring at x = percentile value, y = a fixed watch height.
// The SLO plane is a translucent vertical... no — a horizontal plane at the SLO *value* on the X
// axis is confusing. We render the SLO as a translucent *wall* at x=slo (a plane facing the
// camera): terrain to its right = above the SLO. The alert recolors the wall + the contour ring.
const AXIS_LENGTH = 12 // total span of the value axis (0..1) in world units
const COLUMN_WIDTH = AXIS_LENGTH / N_BUCKETS
const AXIS_Z = 0 // columns sit along z=0
const Y_SCALE = 0.012 // world height per sample count (tuned for ~1000 samples → ~12 tall)
const WATCH_Y = 1.2 // contour ring floats just above the terrain ridge line

const CLEAR_COLOR = new THREE.Color("#4fc3f7") // cyan — alert silent
const FIRING_COLOR = new THREE.Color("#f06292") // red — alert firing
const CONTOUR_COLOR = new THREE.Color("#ffd54f") // amber percentile ring

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

/** Map a sample value in [0,1] to its world X position on the value axis. */
function valueToX(value: number): number {
  return value * AXIS_LENGTH - AXIS_LENGTH / 2
}

/** Center X of bucket `i`. */
function bucketCenterX(i: number): number {
  const step = 1 / N_BUCKETS
  return valueToX(step * i + step / 2)
}

/** World height for a bucket count. */
function countToY(count: number): number {
  return Math.max(0.05, count * Y_SCALE)
}

/**
 * Three.js projection of sim state. Renders only — all rules live in src/sim and src/game.
 * Histogram = height-scaled BoxGeometry columns (the terrain). The p95 contour = a glowing
 * horizontal ring at the percentile value. The SLO alert = a translucent vertical wall that
 * turns red when the percentile value crosses past it.
 */
export class ObservatoryScene {
  private readonly viewport: Viewport
  private terrainGroup = new THREE.Group()
  private columnMeshes: THREE.Mesh[] = []
  private contourRing: THREE.Mesh
  private contourBeam: THREE.Mesh
  private sloWall: THREE.Mesh
  private sloMaterial: THREE.MeshBasicMaterial
  private firingFlash: THREE.Mesh
  private firingMaterial: THREE.MeshBasicMaterial
  private clock = new THREE.Clock()
  private firing = false
  onBucketClick: ((bucket: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 26,
      fogFar: 64,
      cameraPosition: [0, 7, 18],
      controlsTarget: [0, 2, 0],
      minDistance: 8,
      maxDistance: 60,
      ambientIntensity: 0.8,
      keyIntensity: 1.0,
      keyPosition: [6, 14, 8],
      onFrame: () => {
        this.animate(this.clock.getElapsedTime())
      },
    })

    this.viewport.scene.add(this.terrainGroup)
    // faint reference grid floor for spatial anchoring
    const grid = new THREE.GridHelper(AXIS_LENGTH * 2.4, 24, "#1c2236", "#141a2b")
    grid.position.y = -0.02
    this.viewport.scene.add(grid)
    // value axis line (the floor of the histogram)
    const axis = new THREE.Mesh(
      new THREE.BoxGeometry(AXIS_LENGTH + 0.4, 0.06, 0.4),
      new THREE.MeshBasicMaterial({ color: "#3d4663" }),
    )
    axis.position.set(0, 0, AXIS_Z)
    this.terrainGroup.add(axis)

    // percentile contour ring (sits at the watched-percentile x value, glows amber)
    this.contourRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.06, 10, 40),
      new THREE.MeshBasicMaterial({ color: CONTOUR_COLOR.getHex() }),
    )
    this.contourRing.rotation.x = Math.PI / 2 // lay flat facing the camera axis
    this.terrainGroup.add(this.contourRing)
    // a thin vertical beam from the floor up through the contour (the percentile "read line")
    this.contourBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1, 0.05),
      new THREE.MeshBasicMaterial({
        color: CONTOUR_COLOR.getHex(),
        transparent: true,
        opacity: 0.5,
      }),
    )
    this.terrainGroup.add(this.contourBeam)

    // SLO alert wall — translucent, vertical, facing +Z (the camera). Turns red when firing.
    this.sloMaterial = new THREE.MeshBasicMaterial({
      color: CLEAR_COLOR.getHex(),
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    })
    this.sloWall = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 10), this.sloMaterial)
    this.sloWall.position.set(0, 5, AXIS_Z + COLUMN_WIDTH / 2)
    this.terrainGroup.add(this.sloWall)

    // firing flash — a faint red wash over the whole terrain when the alert is firing
    this.firingMaterial = new THREE.MeshBasicMaterial({
      color: FIRING_COLOR.getHex(),
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
    this.firingFlash = new THREE.Mesh(
      new THREE.PlaneGeometry(AXIS_LENGTH + 4, 14),
      this.firingMaterial,
    )
    this.firingFlash.position.set(0, 6, AXIS_Z - 1.5)
    this.viewport.scene.add(this.firingFlash)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const hits = this.viewport.raycaster.intersectObjects(this.columnMeshes)
    const first = hits[0]
    if (first && this.onBucketClick) {
      const bucket = (first.object.userData as { bucket?: number }).bucket
      if (bucket !== undefined) this.onBucketClick(bucket)
    }
  }

  /** Rebuild the projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncTerrain(state)
    this.syncContour(state)
    this.syncSlo(state)
  }

  private syncTerrain(state: GameState): void {
    // L4 renders two side-by-side distributions; otherwise the single histogram.
    const groups: { counts: number[]; xOffset: number }[] = []
    if (state.level.id === "L4") {
      const half = AXIS_LENGTH / 2 - 0.6
      state.distributions.forEach((d, i) => {
        const sign = i === 0 ? -1 : 1
        groups.push({ counts: d.histogram.counts, xOffset: sign * half })
      })
    } else {
      groups.push({ counts: state.histogram.counts, xOffset: 0 })
    }
    // total columns needed
    const total = groups.length * N_BUCKETS
    while (this.columnMeshes.length < total) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(COLUMN_WIDTH * 0.9, 1, COLUMN_WIDTH * 0.9),
        new THREE.MeshStandardMaterial({ flatShading: true }),
      )
      mesh.userData = { bucket: this.columnMeshes.length % N_BUCKETS }
      this.terrainGroup.add(mesh)
      this.columnMeshes.push(mesh)
    }
    while (this.columnMeshes.length > total) {
      const m = this.columnMeshes.pop() as THREE.Mesh
      this.terrainGroup.remove(m)
    }
    const maxCount = Math.max(1, ...groups.flatMap((g) => g.counts))
    let meshIdx = 0
    groups.forEach((g) => {
      for (let i = 0; i < N_BUCKETS; i++) {
        const mesh = this.columnMeshes[meshIdx] as THREE.Mesh
        meshIdx++
        const count = g.counts[i] ?? 0
        const h = countToY(count)
        mesh.scale.set(1, h, 1)
        mesh.position.set(bucketCenterX(i) + g.xOffset, h / 2, AXIS_Z)
        mesh.userData = { bucket: i }
        const mat = mesh.material as THREE.MeshStandardMaterial
        // cool→hot gradient by relative density so the tail reads as a ridge
        const heat = count / maxCount
        mat.color = heatColor(heat)
        mat.emissive = heatColor(heat * 0.6)
        mat.emissiveIntensity = 0.2 + heat * 0.5
      }
    })
  }

  private syncContour(state: GameState): void {
    // The watched percentile value → its x position; the ring sits on the ridge line.
    const pValue = percentile(state.histogram, state.level.watchP)
    if (state.level.id === "L4" || Number.isNaN(pValue)) {
      this.contourRing.visible = false
      this.contourBeam.visible = false
      return
    }
    this.contourRing.visible = true
    this.contourBeam.visible = true
    const x = valueToX(pValue)
    this.contourRing.position.set(x, WATCH_Y, AXIS_Z)
    const beamH = WATCH_Y * 2
    this.contourBeam.scale.set(1, beamH, 1)
    this.contourBeam.position.set(x, beamH / 2, AXIS_Z)
  }

  private syncSlo(state: GameState): void {
    const slo = state.setSlo ?? state.level.slo
    if (slo === null) {
      this.sloWall.visible = false
      return
    }
    this.sloWall.visible = true
    // L4 has no single histogram to judge — the wall sits at the SLO value across both groups.
    const x = valueToX(slo)
    this.sloWall.position.x = x
    // firing truth: does the watched percentile exceed the SLO? Computed from the histogram so the
    // scene stays a pure projection of GameState (no controller dependency).
    let firing = false
    if (state.level.id === "L4") {
      firing = state.distributions.some((d) => percentile(d.histogram, state.level.watchP) > slo)
    } else {
      firing = percentile(state.histogram, state.level.watchP) > slo
    }
    this.firing = firing
    this.sloMaterial.color = firing ? FIRING_COLOR.clone() : CLEAR_COLOR.clone()
    this.sloMaterial.opacity = firing ? 0.32 : 0.22
  }

  private animate(t: number): void {
    // pulse the contour ring so "the percentile" reads as alive
    const pulse = 1 + 0.08 * Math.sin(t * 3)
    this.contourRing.scale.setScalar(this.contourRing.visible ? pulse : 0)
    // breathing red wash when the alert is firing
    const target = this.firing ? 0.1 + 0.06 * (0.5 + 0.5 * Math.sin(t * 4)) : 0
    this.firingMaterial.opacity += (target - this.firingMaterial.opacity) * 0.1
  }
}

function heatColor(heat: number): THREE.Color {
  // cyan (low) → amber (mid) → red (high tail)
  const c = new THREE.Color()
  c.setHSL(0.55 - heat * 0.5, 0.7, 0.45 + heat * 0.1)
  return c
}
