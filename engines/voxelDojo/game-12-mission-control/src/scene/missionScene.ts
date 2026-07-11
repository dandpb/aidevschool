import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import { layers } from "../sim/dag"

const CONSTELLATION_RADIUS = 6
const DAG_X = -9 // DAG cluster sits to the left; constellation to the right
const DAG_LAYER_SPACING = 2.6
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

const READY_COLOR = new THREE.Color("#ffd54f") // amber pulse
const DONE_COLOR = new THREE.Color("#66bb6a") // green glow
const BLOCKED_COLOR = new THREE.Color("#3a4258") // dim grey
const DEP_ARROW = new THREE.Color("#5a6688")
const HALO_COLOR = new THREE.Color("#ffd54f")

function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length] as string
}

/** Deterministic point on a sphere from an index (Fibonacci spiral — even coverage). */
function spherePoint(index: number, total: number): THREE.Vector3 {
  const phi = Math.acos(1 - (2 * (index + 0.5)) / total)
  const theta = Math.PI * (1 + Math.sqrt(5)) * index
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * CONSTELLATION_RADIUS,
    Math.cos(phi) * CONSTELLATION_RADIUS * 0.8,
    Math.sin(phi) * Math.sin(theta) * CONSTELLATION_RADIUS,
  )
}

/** Lay a DAG out in topological layers (roots bottom, leaves top), sorted within each layer. */
function dagPoint(jobId: string, layer: Map<string, number>): THREE.Vector3 {
  const depth = layer.get(jobId) ?? 0
  const sameLayer = [...layer.entries()].filter(([, d]) => d === depth).map(([id]) => id)
  sameLayer.sort()
  const idxInLayer = sameLayer.indexOf(jobId)
  const span = sameLayer.length
  // center each layer horizontally
  const x = DAG_X + (idxInLayer - (span - 1) / 2) * 2.4
  const y = -3 + depth * DAG_LAYER_SPACING
  return new THREE.Vector3(x, y, 0)
}

/**
 * Three.js projection of sim state. Renders only — all rules live in src/sim and src/game.
 * Stations = icosahedra (leader wears an emissive halo + larger scale); DAG jobs = octahedra
 * joined by ArrowHelper dependency lines. Completed jobs glow green, ready jobs pulse amber,
 * blocked jobs stay dim.
 */
export class MissionScene {
  private readonly viewport: Viewport
  private stationGroup = new THREE.Group()
  private dagGroup = new THREE.Group()
  private stationMeshes = new Map<string, THREE.Mesh>()
  private stationHalos = new Map<string, THREE.Mesh>()
  private jobMeshes = new Map<string, THREE.Mesh>()
  private depArrows: THREE.ArrowHelper[] = []
  private clock = new THREE.Clock()
  onStationClick: ((stationId: string) => void) | null = null
  onJobClick: ((jobId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 22,
      fogFar: 60,
      cameraPosition: [-2, 4, 22],
      controlsTarget: [-2, 0, 0],
      minDistance: 8,
      maxDistance: 60,
      ambientIntensity: 0.75,
      keyIntensity: 1.1,
      onFrame: () => {
        this.animateReady(this.clock.getElapsedTime())
      },
    })

    this.viewport.scene.add(this.stationGroup)
    this.viewport.scene.add(this.dagGroup)
    // a faint reference grid floor for spatial anchoring
    const grid = new THREE.GridHelper(40, 40, "#1c2236", "#141a2b")
    grid.position.y = -6
    this.viewport.scene.add(grid)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const targets = [...this.stationMeshes.values(), ...this.jobMeshes.values()]
    const hits = this.viewport.raycaster.intersectObjects(targets)
    const first = hits[0]
    if (!first) return
    const ud = first.object.userData as { stationId?: string; jobId?: string }
    if (ud.stationId && this.onStationClick) this.onStationClick(ud.stationId)
    else if (ud.jobId && this.onJobClick) this.onJobClick(ud.jobId)
  }

  /** Rebuild the projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncStations(state)
    this.syncDag(state)
  }

  private syncStations(state: GameState): void {
    const wanted = new Set(state.stations.map((s) => s.id))
    for (const [id, mesh] of this.stationMeshes) {
      if (!wanted.has(id)) {
        this.stationGroup.remove(mesh)
        this.stationMeshes.delete(id)
        const halo = this.stationHalos.get(id)
        if (halo) {
          this.stationGroup.remove(halo)
          this.stationHalos.delete(id)
        }
      }
    }
    const total = state.stations.length
    const leaderId = state.election?.leaderId ?? null
    state.stations.forEach((s, i) => {
      let mesh = this.stationMeshes.get(s.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.7),
          new THREE.MeshStandardMaterial({ color: colorForIndex(i), flatShading: true }),
        )
        mesh.userData = { stationId: s.id }
        this.stationGroup.add(mesh)
        this.stationMeshes.set(s.id, mesh)
      }
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.color = new THREE.Color(colorForIndex(i))
      const isLeader = s.id === leaderId
      mat.emissive = isLeader ? HALO_COLOR.clone() : new THREE.Color(colorForIndex(i))
      mat.emissiveIntensity = isLeader ? 0.9 : 0.15
      mesh.position.copy(spherePoint(i, total))
      mesh.scale.setScalar(isLeader ? 1.5 : 1.0)

      // leader halo: a translucent, larger wireframe shell
      let halo = this.stationHalos.get(s.id)
      if (isLeader && !halo) {
        halo = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.25),
          new THREE.MeshBasicMaterial({
            color: HALO_COLOR,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
          }),
        )
        halo.userData = { haloFor: s.id }
        this.stationGroup.add(halo)
        this.stationHalos.set(s.id, halo)
      } else if (!isLeader && halo) {
        this.stationGroup.remove(halo)
        this.stationHalos.delete(s.id)
        halo = undefined
      }
      if (halo) halo.position.copy(mesh.position)
    })
  }

  private syncDag(state: GameState): void {
    if (state.jobs.length === 0) {
      this.clearDag()
      return
    }
    const layer = layers(state.jobs)
    // prune removed jobs
    const wanted = new Set(state.jobs.map((j) => j.id))
    for (const [id, mesh] of this.jobMeshes) {
      if (!wanted.has(id)) {
        this.dagGroup.remove(mesh)
        this.jobMeshes.delete(id)
      }
    }
    // (re)build dependency arrows from scratch — cheap at this node count
    this.clearArrows()
    const readySet = new Set(this.readyIds(state))
    for (const job of state.jobs) {
      let mesh = this.jobMeshes.get(job.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.55),
          new THREE.MeshStandardMaterial({ flatShading: true }),
        )
        mesh.userData = { jobId: job.id }
        this.dagGroup.add(mesh)
        this.jobMeshes.set(job.id, mesh)
      }
      const pos = dagPoint(job.id, layer)
      mesh.position.copy(pos)
      const mat = mesh.material as THREE.MeshStandardMaterial
      const completed = state.completed.has(job.id)
      const ready = readySet.has(job.id)
      if (completed) {
        mat.color = DONE_COLOR.clone()
        mat.emissive = DONE_COLOR.clone()
        mat.emissiveIntensity = 0.8
      } else if (ready) {
        mat.color = READY_COLOR.clone()
        mat.emissive = READY_COLOR.clone()
        mat.emissiveIntensity = 0.4
      } else {
        mat.color = BLOCKED_COLOR.clone()
        mat.emissive = new THREE.Color("#000000")
        mat.emissiveIntensity = 0
      }

      // draw arrows from each dependency to this job
      for (const dep of job.deps) {
        const depPos = dagPoint(dep, layer)
        const dir = new THREE.Vector3().subVectors(pos, depPos)
        const len = dir.length()
        if (len < 0.001) continue
        const arrow = new THREE.ArrowHelper(
          dir.normalize(),
          depPos.clone().add(new THREE.Vector3(0, 0, 0)),
          len,
          DEP_ARROW.getHex(),
          0.35,
          0.2,
        )
        // nudge arrows behind the nodes so they read as edges, not foreground
        arrow.line.translateZ(-0.3)
        this.dagGroup.add(arrow)
        this.depArrows.push(arrow)
      }
    }
  }

  private readyIds(state: GameState): string[] {
    return state.jobs
      .filter((j) => !state.completed.has(j.id) && j.deps.every((d) => state.completed.has(d)))
      .map((j) => j.id)
  }

  private animateReady(t: number): void {
    // pulse the emissive intensity of ready (amber) jobs so "unblocked" reads as alive
    const pulse = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(t * 4))
    for (const mesh of this.jobMeshes.values()) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (
        mat.emissive &&
        mat.emissive.getHex() === READY_COLOR.getHex() &&
        mat.emissiveIntensity > 0
      ) {
        mat.emissiveIntensity = pulse
      }
    }
    // spin the leader halo slowly so the "who is leader now" transfer is unmistakable
    for (const halo of this.stationHalos.values()) {
      halo.rotation.y = t * 0.6
      halo.rotation.x = t * 0.3
    }
  }

  private clearDag(): void {
    for (const mesh of this.jobMeshes.values()) this.dagGroup.remove(mesh)
    this.jobMeshes.clear()
    this.clearArrows()
  }

  private clearArrows(): void {
    for (const a of this.depArrows) {
      this.dagGroup.remove(a)
      a.dispose()
    }
    this.depArrows = []
  }
}
