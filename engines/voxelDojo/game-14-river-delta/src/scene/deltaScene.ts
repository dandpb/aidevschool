import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import type { StageEvent } from "../sim/pipeline"

const LAKE_RADIUS = 4
const HEADWATER_RADIUS = 11
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

const WATER_COLOR = new THREE.Color("#2a5a8c")
const DYE_COLOR = new THREE.Color("#ffb74d") // the dyed streak — warm amber against blue
const DROP_COLOR = new THREE.Color("#f06292") // dropped logs flash pink

/** Deterministic headwater position for a source around the delta rim. */
function headwater(i: number, total: number): THREE.Vector3 {
  const angle = (i / total) * Math.PI * 2
  return new THREE.Vector3(
    Math.cos(angle) * HEADWATER_RADIUS,
    3.5,
    Math.sin(angle) * HEADWATER_RADIUS,
  )
}

/** The lake center (sink) — all tributaries converge here. */
const LAKE_CENTER = new THREE.Vector3(0, -2.2, 0)

/** A point along a tributary curve: bezier from headwater to a stage node to the lake. */
function tributaryPoint(srcPos: THREE.Vector3, stagePos: THREE.Vector3, t: number): THREE.Vector3 {
  // quadratic bezier: srcPos → stagePos → LAKE_CENTER
  const oneMinusT = 1 - t
  return new THREE.Vector3()
    .addScaledVector(srcPos, oneMinusT * oneMinusT)
    .addScaledVector(stagePos, 2 * oneMinusT * t)
    .addScaledVector(LAKE_CENTER, t * t)
}

/**
 * Three.js projection of sim state. Renders only — all rules live in src/sim and src/game.
 *
 * Layout: each source has a headwater at the rim; its tributary tube arcs down through
 * the shared stage nodes (torus-knot rapids) into the central lake. Un-dyed log-craft are
 * blue; the dyed streak is amber. Click a headwater to predict source / inject dye.
 */
export class DeltaScene {
  private readonly viewport: Viewport
  private deltaGroup = new THREE.Group()
  private lakeMesh: THREE.Mesh
  private headwaterMeshes = new Map<string, THREE.Mesh>()
  private tributaryLines: THREE.Line[] = []
  private rapidMeshes = new Map<string, THREE.Mesh>()
  private logMesh: THREE.InstancedMesh | null = null
  private logColorAttr: THREE.InstancedBufferAttribute | null = null
  private clock = new THREE.Clock()
  onHeadwaterClick: ((sourceId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 26,
      fogFar: 64,
      cameraPosition: [0, 10, 22],
      controlsTarget: [0, 0, 0],
      minDistance: 8,
      maxDistance: 60,
      ambientIntensity: 0.75,
      keyIntensity: 1.1,
      onFrame: () => {
        this.animateLogs(this.clock.getElapsedTime())
        this.animateLake(this.clock.getElapsedTime())
      },
    })

    this.viewport.scene.add(this.deltaGroup)
    // lake plane (the sink)
    this.lakeMesh = new THREE.Mesh(
      new THREE.CircleGeometry(LAKE_RADIUS, 48),
      new THREE.MeshStandardMaterial({
        color: "#1a3a5c",
        emissive: "#0a2238",
        emissiveIntensity: 0.6,
        roughness: 0.4,
        metalness: 0.3,
        side: THREE.DoubleSide,
      }),
    )
    this.lakeMesh.rotation.x = -Math.PI / 2
    this.lakeMesh.position.copy(LAKE_CENTER).setY(LAKE_CENTER.y - 0.4)
    this.deltaGroup.add(this.lakeMesh)
    // a faint reference grid for spatial anchoring
    const grid = new THREE.GridHelper(40, 40, "#1c2236", "#141a2b")
    grid.position.y = LAKE_CENTER.y - 0.6
    this.deltaGroup.add(grid)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const hits = this.viewport.raycaster.intersectObjects([...this.headwaterMeshes.values()])
    const first = hits[0]
    if (first && this.onHeadwaterClick) {
      const id = (first.object.userData as { sourceId?: string }).sourceId
      if (id) this.onHeadwaterClick(id)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncTributaries(state)
    this.syncLogs(state)
  }

  private syncTributaries(state: GameState): void {
    // prune stale headwaters + tributaries
    const wanted = new Set(state.level.sources)
    for (const [id, mesh] of this.headwaterMeshes) {
      if (!wanted.has(id)) {
        this.deltaGroup.remove(mesh)
        this.headwaterMeshes.delete(id)
      }
    }
    for (const line of this.tributaryLines) this.deltaGroup.remove(line)
    this.tributaryLines = []
    // prune stale rapids
    const wantedStages = new Set(state.level.pipeline.stages.map((s) => s.name))
    for (const [name, mesh] of this.rapidMeshes) {
      if (!wantedStages.has(name)) {
        this.deltaGroup.remove(mesh)
        this.rapidMeshes.delete(name)
      }
    }

    const total = state.level.sources.length
    const stageCount = state.level.pipeline.stages.length
    state.level.sources.forEach((src, i) => {
      const srcPos = headwater(i, total)
      // stage nodes sit on the shared channel between the rim and the lake
      const stagePos = srcPos.clone().multiplyScalar(0.45).setY(0.5)

      // headwater marker
      let mesh = this.headwaterMeshes.get(src)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.6),
          new THREE.MeshStandardMaterial({
            color: PALETTE[i % PALETTE.length],
            flatShading: true,
          }),
        )
        mesh.userData = { sourceId: src }
        this.deltaGroup.add(mesh)
        this.headwaterMeshes.set(src, mesh)
      }
      ;(mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(
        PALETTE[i % PALETTE.length],
      )
      // highlight the injected-dye source on L3
      const injected = state.injectSource === src
      ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = injected ? 1.2 : 0.3
      mesh.scale.setScalar(injected ? 1.6 : 1.1)
      mesh.position.copy(srcPos)

      // tributary curve — draw as a tube-less polyline (cheap, readable)
      const pts: THREE.Vector3[] = []
      for (let t = 0; t <= 1.0001; t += 0.05) pts.push(tributaryPoint(srcPos, stagePos, t))
      const geom = new THREE.BufferGeometry().setFromPoints(pts)
      const isDyeSrc =
        (state.level.id === "L3" || state.level.id === "L4") &&
        state.level.sources.slice(0, 2).includes(src)
      const line = new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({
          color: isDyeSrc ? "#ffb74d" : "#2a5a8c",
          transparent: true,
          opacity: isDyeSrc ? 0.95 : 0.55,
          linewidth: 2,
        }),
      )
      this.deltaGroup.add(line)
      this.tributaryLines.push(line)
    })

    // rapids — one torus knot per stage, placed near the lake on the shared channel
    state.level.pipeline.stages.forEach((stage, i) => {
      const angle = (i / Math.max(1, stageCount)) * Math.PI * 2
      const pos = new THREE.Vector3(
        Math.cos(angle) * LAKE_RADIUS * 1.4,
        -0.5,
        Math.sin(angle) * LAKE_RADIUS * 1.4,
      )
      let mesh = this.rapidMeshes.get(stage.name)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.TorusKnotGeometry(0.5, 0.16, 64, 8),
          new THREE.MeshStandardMaterial({
            color: "#7aa6d6",
            emissive: "#3a5a8c",
            emissiveIntensity: 0.5,
            flatShading: false,
          }),
        )
        mesh.userData = { stageName: stage.name }
        this.deltaGroup.add(mesh)
        this.rapidMeshes.set(stage.name, mesh)
      }
      mesh.position.copy(pos)
    })
  }

  /** Place instanced log-craft along their tributary curves; dye the correlated ones. */
  private syncLogs(state: GameState): void {
    if (this.logMesh) {
      this.deltaGroup.remove(this.logMesh)
      this.logMesh.dispose()
      this.logMesh = null
      this.logColorAttr = null
    }
    const total = state.level.sources.length
    const srcIndex = new Map(state.level.sources.map((s, i) => [s, i] as const))
    const logs = state.logs
    if (logs.length === 0) return
    // limit instance count for perf; spread remaining logs along the curve
    const MAX = Math.min(logs.length, 200)
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshStandardMaterial({ flatShading: true, vertexColors: false }),
      MAX,
    )
    const colorArr = new Float32Array(MAX * 3)
    const m = new THREE.Matrix4()
    const lastEventByLog = new Map<string, StageEvent>()
    for (const e of state.events) lastEventByLog.set(e.logId, e)
    for (let i = 0; i < MAX; i++) {
      const log = logs[i]
      if (!log) break
      const si = srcIndex.get(log.source) ?? 0
      const srcPos = headwater(si, total)
      const stagePos = srcPos.clone().multiplyScalar(0.45).setY(0.5)
      // spread along the curve deterministically by log index
      const t = (i / MAX) * 0.92 + 0.04
      const pos = tributaryPoint(srcPos, stagePos, t)
      m.setPosition(pos)
      mesh.setMatrixAt(i, m)
      const last = lastEventByLog.get(log.logId)
      const dropped = last !== undefined && !last.passed
      const dyed = log.correlationId === state.level.traceId
      const c = dropped ? DROP_COLOR : dyed ? DYE_COLOR : WATER_COLOR
      colorArr[i * 3] = c.r
      colorArr[i * 3 + 1] = c.g
      colorArr[i * 3 + 2] = c.b
    }
    this.logColorAttr = new THREE.InstancedBufferAttribute(colorArr, 3)
    mesh.geometry.setAttribute("color", this.logColorAttr as unknown as THREE.BufferAttribute)
    // per-instance color via instanceColor
    const ic = new Float32Array(MAX * 3)
    ic.set(colorArr)
    mesh.instanceColor = new THREE.InstancedBufferAttribute(
      ic,
      3,
    ) as unknown as THREE.InstancedBufferAttribute
    ;(mesh.material as THREE.MeshStandardMaterial).vertexColors = false
    this.deltaGroup.add(mesh)
    this.logMesh = mesh
    mesh.instanceMatrix.needsUpdate = true
  }

  private animateLogs(t: number): void {
    // spin the rapids so they read as turbulent "current"
    for (const mesh of this.rapidMeshes.values()) {
      mesh.rotation.x = t * 0.6
      mesh.rotation.y = t * 0.4
    }
  }

  private animateLake(t: number): void {
    // gentle emissive pulse on the lake so it reads as the active sink
    const mat = this.lakeMesh.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.5 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.5))
  }
}
