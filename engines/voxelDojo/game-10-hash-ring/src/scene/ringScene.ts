import * as THREE from "three"
import type { GameState } from "../game/controller"
import { ringHash, ringPosition } from "../sim/hash"
import { type Anchor, anchorsOf, ownerOf } from "../sim/ring"
import { createViewport, type Viewport } from "../../../shared/viewport"

const RING_RADIUS = 10
const RING_TILT = Math.PI / 6
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

function colorFor(stationId: string, stations: readonly { id: string }[]): string {
  const idx = stations.findIndex((s) => s.id === stationId)
  return PALETTE[(idx >= 0 ? idx : stations.length) % PALETTE.length] as string
}

function ringPoint(fraction: number, lift = 0): THREE.Vector3 {
  const angle = fraction * Math.PI * 2
  return new THREE.Vector3(Math.cos(angle) * RING_RADIUS, lift, Math.sin(angle) * RING_RADIUS)
}

/** Three.js projection of sim state. Renders only — all rules live in src/sim and src/game. */
export class RingScene {
  private readonly viewport: Viewport
  private ringGroup = new THREE.Group()
  private stationMeshes = new Map<string, THREE.Mesh>()
  private ghostAnchors: THREE.InstancedMesh | null = null
  private keyMesh: THREE.InstancedMesh | null = null
  onStationClick: ((stationId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas)
    this.ringGroup.rotation.x = RING_TILT
    this.viewport.scene.add(this.ringGroup)
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.06, 8, 128),
      new THREE.MeshBasicMaterial({ color: "#3d4663" }),
    )
    torus.rotation.x = Math.PI / 2
    this.ringGroup.add(torus)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const hits = this.viewport.raycaster.intersectObjects([...this.stationMeshes.values()])
    const first = hits[0]
    if (first && this.onStationClick) {
      const id = (first.object.userData as { stationId?: string }).stationId
      if (id) this.onStationClick(id)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. Cheap at this entity count. */
  sync(state: GameState, loads: Map<string, number>): void {
    this.syncStations(state, loads)
    this.syncGhostAnchors(state)
    this.syncKeys(state)
  }

  private syncStations(state: GameState, loads: Map<string, number>): void {
    const wanted = new Set(state.stations.map((s) => s.id))
    for (const [id, mesh] of this.stationMeshes) {
      if (!wanted.has(id)) {
        this.ringGroup.remove(mesh)
        this.stationMeshes.delete(id)
      }
    }
    const maxLoad = Math.max(1, ...loads.values())
    for (const s of state.stations) {
      let mesh = this.stationMeshes.get(s.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.7),
          new THREE.MeshStandardMaterial({
            color: colorFor(s.id, state.stations),
            flatShading: true,
          }),
        )
        mesh.userData = { stationId: s.id }
        this.ringGroup.add(mesh)
        this.stationMeshes.set(s.id, mesh)
      }
      mesh.position.copy(ringPoint(ringPosition(ringHash(`${s.id}#0`)), 0))
      const load = loads.get(s.id) ?? 0
      const heat = load / maxLoad
      ;(mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(
        colorFor(s.id, state.stations),
      )
      ;(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.15 + heat * 0.85
      mesh.scale.setScalar(0.8 + heat * 0.6)
    }
  }

  private syncGhostAnchors(state: GameState): void {
    if (this.ghostAnchors) {
      this.ringGroup.remove(this.ghostAnchors)
      this.ghostAnchors.dispose()
      this.ghostAnchors = null
    }
    const primaries = new Set(state.stations.map((s) => ringHash(`${s.id}#0`)))
    const ghosts: Anchor[] = anchorsOf(state.stations).filter((a) => !primaries.has(a.hash))
    if (ghosts.length === 0) return
    const mesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.18),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7 }),
      ghosts.length,
    )
    const m = new THREE.Matrix4()
    ghosts.forEach((a, i) => {
      m.setPosition(ringPoint(ringPosition(a.hash), 0.2))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, new THREE.Color(colorFor(a.stationId, state.stations)))
    })
    this.ringGroup.add(mesh)
    this.ghostAnchors = mesh
  }

  /** Keys sit at their hash angle, tinted by owner — contiguous arcs become visible color bands. */
  private syncKeys(state: GameState): void {
    if (this.keyMesh) {
      this.ringGroup.remove(this.keyMesh)
      this.keyMesh.dispose()
      this.keyMesh = null
    }
    const entries = [...state.assignment.entries()]
    if (entries.length === 0) return
    const anchors = anchorsOf(state.stations)
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.22),
      new THREE.MeshStandardMaterial({ flatShading: true }),
      entries.length,
    )
    const m = new THREE.Matrix4()
    entries.forEach(([keyName], i) => {
      const h = ringHash(keyName)
      const jitter = 0.5 + ((h >>> 8) % 100) / 100
      m.setPosition(
        ringPoint(ringPosition(h), 0)
          .multiplyScalar(1 + jitter * 0.06)
          .setY(0.35 + jitter * 0.4),
      )
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, new THREE.Color(colorFor(ownerOf(h, anchors), state.stations)))
    })
    this.ringGroup.add(mesh)
    this.keyMesh = mesh
  }
}
