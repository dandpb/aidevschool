import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"

const RING_RADIUS = 8
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

const ACK_COLOR = "#aed581" // green — aligned beam
const STALE_COLOR = "#f06292" // pink — stale / minority
const COMMIT_COLOR = "#ffd54f" // gold — the truth, the commit flash
const WATCH_COLOR = "#4fc3f7" // blue — watcher buoy
const BASE_COLOR = "#5a647f" // dim — unacked

function ringPoint(index: number, total: number, lift = 0): THREE.Vector3 {
  const angle = (index / total) * Math.PI * 2
  return new THREE.Vector3(Math.cos(angle) * RING_RADIUS, lift, Math.sin(angle) * RING_RADIUS)
}

interface TowerMeshes {
  group: THREE.Group
  body: THREE.Mesh
  beamPivot: THREE.Object3D
  beam: THREE.Mesh
  cap: THREE.Mesh
  id: string
}

/**
 * Three.js projection of consensus state. Lighthouses ring a coast; each has a beam.
 * Acked lighthouses re-aim their beam to the proposed value (aligned = same color/heading).
 * When quorum is reached every aligned beam flashes gold (the COMMIT). Watchers are small
 * buoys that light up on notify. A partition splits the ring into two arcs; the minority
 * arc glows pink and its beams stay split (cannot commit). Renders state only — all rules
 * live in src/sim and src/game.
 */
export class LighthouseScene {
  private readonly viewport: Viewport
  private root = new THREE.Group()
  private towers = new Map<string, TowerMeshes>()
  private buoys = new Map<string, THREE.Mesh>()
  private partitionArc: THREE.Line | null = null
  private flashIntensity = 0
  onLighthouseClick: ((nodeId: string) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 20,
      fogFar: 55,
      cameraPosition: [0, 12, 22],
      controlsTarget: [0, 2, 0],
      minDistance: 8,
      maxDistance: 50,
      ambientIntensity: 0.6,
      keyIntensity: 1.0,
      onFrame: () => {
        this.animateBeams()
      },
    })

    this.viewport.scene.add(this.root)
    // water disc
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(RING_RADIUS + 6, 64),
      new THREE.MeshStandardMaterial({ color: "#142036", roughness: 0.9, metalness: 0.1 }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.05
    this.root.add(water)
    // coast ring (the quorum ring the lighthouses sit on)
    const coast = new THREE.Mesh(
      new THREE.TorusGeometry(RING_RADIUS, 0.07, 8, 128),
      new THREE.MeshBasicMaterial({ color: "#2a3450" }),
    )
    coast.rotation.x = Math.PI / 2
    this.root.add(coast)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    const bodies = [...this.towers.values()].map((t) => t.body)
    const hits = this.viewport.raycaster.intersectObjects(bodies)
    const first = hits[0]
    if (first && this.onLighthouseClick) {
      const id = (first.object.userData as { nodeId?: string }).nodeId
      if (id) this.onLighthouseClick(id)
    }
  }

  /** Rebuild the projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncTowers(state)
    this.syncBuoys(state)
    this.syncPartition(state)
  }

  private towerIndex(nodeId: string, total: number): number {
    const m = /^lh-(\d+)$/.exec(nodeId)
    const i = m ? Number(m[1]) : 0
    return i % total
  }

  private syncTowers(state: GameState): void {
    const total = state.level.clusterSize
    const acked = new Set(state.ackedNodeIds)
    const committed = state.committedValue !== null
    // stale nodes (L4) are those whose nodeValue is still null but a commit exists,
    // OR minority-partition nodes (L3) that can't commit.
    const partitionSide = new Set(state.level.partitionSide)

    for (let i = 0; i < total; i++) {
      const id = `lh-${i}`
      let tower = this.towers.get(id)
      if (!tower) {
        tower = this.makeTower(id)
        this.towers.set(id, tower)
        this.root.add(tower.group)
      }
      const pos = ringPoint(this.towerIndex(id, total), total, 0)
      tower.group.position.copy(pos)

      const isAcked = acked.has(id)
      const isStalePartition = partitionSide.has(id)
      let color = BASE_COLOR
      if (committed) {
        // after commit, aligned (acked) beams flash gold; unacked holdouts go pink (stale)
        color = isAcked ? COMMIT_COLOR : STALE_COLOR
      } else if (isAcked) {
        color = ACK_COLOR
      } else if (isStalePartition && state.level.id === "L3") {
        color = STALE_COLOR
      }
      const mat = tower.body.material as THREE.MeshStandardMaterial
      mat.emissive = new THREE.Color(color)
      mat.emissiveIntensity = isAcked || committed ? 0.7 : 0.12
      ;(tower.beam.material as THREE.MeshBasicMaterial).color = new THREE.Color(color)
      ;(tower.beam.material as THREE.MeshBasicMaterial).opacity = isAcked || committed ? 0.55 : 0.12
      ;(tower.cap.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(color)
      ;(tower.cap.material as THREE.MeshStandardMaterial).emissiveIntensity =
        isAcked || committed ? 0.9 : 0.15
    }
    // arm the commit flash
    if (committed) this.flashIntensity = 1
  }

  private makeTower(id: string): TowerMeshes {
    const group = new THREE.Group()
    // tapered tower body (CylinderGeometry: radiusTop < radiusBottom)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.62, 2.6, 10),
      new THREE.MeshStandardMaterial({ color: "#cfd6e6", flatShading: true }),
    )
    body.position.y = 1.3
    body.userData = { nodeId: id }
    group.add(body)
    // light cap (the lamp room)
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.5, 10),
      new THREE.MeshStandardMaterial({
        color: "#ffd54f",
        emissive: "#ffd54f",
        emissiveIntensity: 0.3,
      }),
    )
    cap.position.y = 2.85
    group.add(cap)
    // beam — a long thin cone pivoting at the cap
    const beamPivot = new THREE.Object3D()
    beamPivot.position.y = 2.85
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 7, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: BASE_COLOR,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    beam.rotation.x = Math.PI / 2 // lay the cone on its side, pointing outward
    beam.position.set(0, 0, 3.5)
    beamPivot.add(beam)
    group.add(beamPivot)
    return { group, body, beamPivot, beam, cap, id }
  }

  private syncBuoys(state: GameState): void {
    const total = state.level.clusterSize
    const watcherEntries = Object.entries(state.level.watchers)
    // clear extras
    for (const [id, mesh] of this.buoys) {
      if (!watcherEntries.find(([nid]) => nid === id)) {
        this.root.remove(mesh)
        this.buoys.delete(id)
      }
    }
    const committed = state.committedValue !== null
    for (const [nodeId, keys] of watcherEntries) {
      let buoy = this.buoys.get(nodeId)
      if (!buoy) {
        buoy = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.28),
          new THREE.MeshStandardMaterial({
            color: WATCH_COLOR,
            emissive: WATCH_COLOR,
            emissiveIntensity: 0.2,
            flatShading: true,
          }),
        )
        buoy.userData = { nodeId }
        this.buoys.set(nodeId, buoy)
        this.root.add(buoy)
      }
      // place the buoy just outside its lighthouse
      const idx = this.towerIndex(nodeId, total)
      const base = ringPoint(idx, total, 0)
      buoy.position.copy(base.multiplyScalar(1.22).setY(0.5))
      const isLit = committed && keys.includes(state.level.key)
      const m = buoy.material as THREE.MeshStandardMaterial
      m.emissiveIntensity = isLit ? 1.2 : 0.2
      m.color = new THREE.Color(isLit ? COMMIT_COLOR : WATCH_COLOR)
      m.emissive = new THREE.Color(isLit ? COMMIT_COLOR : WATCH_COLOR)
    }
  }

  private syncPartition(state: GameState): void {
    if (this.partitionArc) {
      this.root.remove(this.partitionArc)
      this.partitionArc.geometry.dispose()
      this.partitionArc = null
    }
    if (state.level.id !== "L3" || state.level.partitionSide.length === 0) return
    const total = state.level.clusterSize
    const sideIdx = state.level.partitionSide.map((id) => this.towerIndex(id, total))
    // draw a divider line across the ring between the two sides
    const minI = Math.min(...sideIdx)
    const maxI = Math.max(...sideIdx)
    const a = ringPoint(minI - 0.5, total, 0.1)
    const b = ringPoint(maxI + 0.5, total, 0.1)
    const center = new THREE.Vector3(0, 0.1, 0)
    const geo = new THREE.BufferGeometry().setFromPoints([a, center, b])
    this.partitionArc = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: STALE_COLOR }))
    this.root.add(this.partitionArc)
  }

  /** Rotate every beam a little each frame (the sweeping lighthouse effect). */
  private animateBeams(): void {
    const t = performance.now() * 0.001
    let i = 0
    for (const tower of this.towers.values()) {
      tower.beamPivot.rotation.y = t * 0.6 + i * 0.7
      i++
    }
    // commit flash decay
    if (this.flashIntensity > 0) {
      this.flashIntensity = Math.max(0, this.flashIntensity - 0.01)
      for (const tower of this.towers.values()) {
        const mat = tower.cap.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.9 + this.flashIntensity * 2
      }
    }
  }
}
