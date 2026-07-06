// Metrics Observatory — three.js projection of the simulation state.
//
// Render-only: every rule lives in src/game/observatory.ts. The scene reads
// snapshots and updates meshes. The mechanics are:
//   - 8 translucent bucket columns arrayed left-to-right, each labelled `le=N`.
//   - Inside each column, a solid bar grows with the bucket's accepted count.
//   - Above the row, a horizontal cumulative ribbon (heights ∝ cumulative count).
//   - A translucent red disk (alert plane) the player lifts/lowers to a column edge.
//   - A claw cursor that slides between columns; the carried orb floats above it.

import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { BUCKET_BOUNDS, BUCKET_COUNT, type ObservatorySnapshot } from "../game/observatory"

const COLUMN_SPACING = 2.4
const COLUMN_HALF_WIDTH = 0.9
const COLUMN_HEIGHT = 4.5
const RIBBON_HEIGHT_MAX = 3.2
const BAR_MAX_COUNT = 12 // visual saturation: bar fills at 12 obs in one bucket

const PALETTE = [
  "#4fc3f7",
  "#29b6f6",
  "#66bb6a",
  "#9ccc65",
  "#ffb74d",
  "#ff8a65",
  "#f06292",
  "#ba68c8",
] as const

export interface SceneInput {
  readonly snapshot: ObservatorySnapshot
  readonly clawIdx: number
  readonly pendingValue: number | null
  readonly aimIdx: number
  readonly hasPendingPercentile: boolean
}

/** Builds the 3D bucket row, alert plane, claw and exposes sync(state). */
export class ObservatoryScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly bucketGroup = new THREE.Group()
  private readonly barMeshes: THREE.Mesh[] = []
  private readonly shellMeshes: THREE.Mesh[] = []
  private readonly ribbonMeshes: THREE.Mesh[] = []
  private readonly bucketLabels: THREE.Sprite[] = []
  private readonly alertPlane: THREE.Mesh
  private readonly clawGroup: THREE.Group
  private readonly alertLight: THREE.PointLight
  private clawIdx = 0
  private aimIdx = 0
  private pendingValue: number | null = null
  private hasPendingPercentile = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color("#07090f")
    this.scene.fog = new THREE.Fog("#07090f", 22, 50)

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200)
    this.camera.position.set(0, 8.5, 18)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxDistance = 40
    this.controls.minDistance = 10
    this.controls.target.set(0, 1.6, 0)

    // Lighting — cool fill from above, warm key from the camera.
    const ambient = new THREE.AmbientLight("#3d4663", 0.6)
    const dir = new THREE.DirectionalLight("#ffffff", 1.0)
    dir.position.set(6, 12, 8)
    this.scene.add(ambient, dir)
    this.alertLight = new THREE.PointLight("#f06292", 0, 14, 2)
    this.alertLight.position.set(0, 4, 0)
    this.scene.add(this.alertLight)

    // Floor — grid for depth perception.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: "#10131c", roughness: 0.95 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    this.scene.add(floor)
    const grid = new THREE.GridHelper(60, 60, "#1f2536", "#161b27")
    this.scene.add(grid)

    this.scene.add(this.bucketGroup)
    this.buildBuckets()

    // Alert plane — translucent red disk that hovers above the row.
    this.alertPlane = new THREE.Mesh(
      new THREE.CircleGeometry(COLUMN_SPACING * BUCKET_COUNT * 0.55, 48),
      new THREE.MeshBasicMaterial({
        color: "#f06292",
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      }),
    )
    this.alertPlane.rotation.x = -Math.PI / 2
    this.alertPlane.position.y = 0
    this.scene.add(this.alertPlane)

    // Claw — floats above the row at the selected column.
    this.clawGroup = new THREE.Group()
    const clawBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.18, 0.7),
      new THREE.MeshStandardMaterial({ color: "#ffd54f", emissive: "#554a1a" }),
    )
    const clawPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: "#aab3cc" }),
    )
    clawPole.position.y = 0.45
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "#4fc3f7",
        emissive: "#0d3a55",
        emissiveIntensity: 0.6,
      }),
    )
    orb.position.y = 1.05
    orb.name = "carried-orb"
    this.clawGroup.add(clawBase, clawPole, orb)
    this.scene.add(this.clawGroup)

    this.onResize()
    window.addEventListener("resize", this.onResize)
  }

  private onResize = (): void => {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth || window.innerWidth
    const h = canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private buildBuckets(): void {
    const halfCount = (BUCKET_COUNT - 1) / 2
    for (let i = 0; i < BUCKET_COUNT; i += 1) {
      const x = (i - halfCount) * COLUMN_SPACING
      const color = PALETTE[i] ?? "#ffffff"

      // Translucent shell — the bucket's full extent.
      const shellGeo = new THREE.BoxGeometry(
        COLUMN_HALF_WIDTH * 2,
        COLUMN_HEIGHT,
        COLUMN_HALF_WIDTH * 2,
      )
      const shellMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        wireframe: false,
      })
      const shell = new THREE.Mesh(shellGeo, shellMat)
      shell.position.set(x, COLUMN_HEIGHT / 2, 0)
      this.bucketGroup.add(shell)
      this.shellMeshes.push(shell)

      // Wireframe outline so the column reads as a container.
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(shellGeo),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
      )
      wire.position.copy(shell.position)
      this.bucketGroup.add(wire)

      // Solid inner bar — grows with count.
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(COLUMN_HALF_WIDTH * 1.6, 1, COLUMN_HALF_WIDTH * 1.6),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.85,
        }),
      )
      bar.position.set(x, 0.05, 0)
      bar.scale.y = 0.001
      this.bucketGroup.add(bar)
      this.barMeshes.push(bar)

      // Cumulative ribbon segment above the column.
      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(COLUMN_HALF_WIDTH * 1.7, 0.12, COLUMN_HALF_WIDTH * 1.7),
        new THREE.MeshStandardMaterial({
          color: "#aed581",
          emissive: "#2c4a1c",
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.85,
        }),
      )
      ribbon.position.set(x, COLUMN_HEIGHT + 0.6, 0)
      this.bucketGroup.add(ribbon)
      this.ribbonMeshes.push(ribbon)

      // Label sprite with the `le=` text.
      const label = makeTextSprite(leLabel(BUCKET_BOUNDS[i] ?? Infinity), "#ffd54f")
      label.position.set(x, COLUMN_HEIGHT + 1.4, 0)
      label.scale.set(1.6, 0.4, 1)
      this.bucketGroup.add(label)
      this.bucketLabels.push(label)

      // Index tick on the floor.
      const tickLabel = makeTextSprite(`idx ${i}`, "#7f8ab0")
      tickLabel.position.set(x, 0.05, 1.4)
      tickLabel.scale.set(0.9, 0.22, 1)
      this.bucketGroup.add(tickLabel)
    }
  }

  /** Reposition the alert plane to the column edge above `thresholdIdx`. */
  private updateAlertPlane(snapshot: ObservatorySnapshot): void {
    const idx = snapshot.alertThresholdLeIdx
    const mat = this.alertPlane.material as THREE.MeshBasicMaterial
    if (idx < 0) {
      mat.opacity = 0.05
      return
    }
    const halfCount = (BUCKET_COUNT - 1) / 2
    // Plane sits at the top edge of the threshold column.
    const x = (idx - halfCount) * COLUMN_SPACING
    this.alertPlane.position.x = x
    this.alertPlane.position.y = COLUMN_HEIGHT
    this.alertPlane.position.z = 0
    switch (snapshot.alertState) {
      case "pending":
        mat.color.set("#ffb74d")
        mat.opacity = 0.35
        this.alertLight.color.set("#ffb74d")
        this.alertLight.intensity = 1.4
        break
      case "firing":
        mat.color.set("#f06292")
        mat.opacity = 0.55
        this.alertLight.color.set("#f06292")
        this.alertLight.intensity = 2.4
        break
      case "resolved":
        mat.color.set("#4fc3f7")
        mat.opacity = 0.3
        this.alertLight.color.set("#4fc3f7")
        this.alertLight.intensity = 1.0
        break
      default:
        mat.color.set("#f06292")
        mat.opacity = 0.22
        this.alertLight.intensity = 0.0
    }
  }

  private updateClaw(): void {
    const halfCount = (BUCKET_COUNT - 1) / 2
    const x = (this.clawIdx - halfCount) * COLUMN_SPACING
    this.clawGroup.position.x = x
    this.clawGroup.position.y = COLUMN_HEIGHT + 1.9
    const orb = this.clawGroup.getObjectByName("carried-orb")
    if (orb) {
      orb.visible = this.pendingValue !== null
    }
  }

  sync(input: SceneInput): void {
    this.clawIdx = input.clawIdx
    this.aimIdx = input.aimIdx
    this.pendingValue = input.pendingValue
    this.hasPendingPercentile = input.hasPendingPercentile
    const snapshot = input.snapshot

    const maxCum = Math.max(1, ...snapshot.cumulativeCounts)
    for (let i = 0; i < BUCKET_COUNT; i += 1) {
      const count = snapshot.bucketCounts[i] ?? 0
      const cum = snapshot.cumulativeCounts[i] ?? 0
      const bar = this.barMeshes[i]
      if (bar) {
        const desired = (Math.min(count, BAR_MAX_COUNT) / BAR_MAX_COUNT) * (COLUMN_HEIGHT - 0.2)
        bar.scale.y = Math.max(0.001, desired)
        bar.position.y = bar.scale.y / 2 + 0.05
      }
      const ribbon = this.ribbonMeshes[i]
      if (ribbon) {
        const ribbonH = (cum / maxCum) * RIBBON_HEIGHT_MAX
        ribbon.scale.y = Math.max(0.5, ribbonH * 8)
        ribbon.position.y = COLUMN_HEIGHT + 0.6 + ribbonH / 2
        const mat = ribbon.material as THREE.MeshStandardMaterial
        if (this.hasPendingPercentile && i === this.aimIdx) {
          mat.color.set("#ffd54f")
          mat.emissive.set("#5a4a1a")
        } else {
          mat.color.set("#aed581")
          mat.emissive.set("#2c4a1c")
        }
      }
    }
    this.updateAlertPlane(snapshot)
    this.updateClaw()
  }

  render(): void {
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize)
    this.renderer.dispose()
  }
}

function leLabel(bound: number): string {
  if (bound === Infinity) return "le=+Inf"
  return `le=${bound}`
}

function makeTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = "bold 32px ui-monospace, Menlo, monospace"
    ctx.fillStyle = color
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true })
  return new THREE.Sprite(mat)
}
