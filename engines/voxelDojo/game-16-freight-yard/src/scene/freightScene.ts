import * as THREE from "three"
import { createViewport, type Viewport } from "../../../shared/viewport"
import type { GameState } from "../game/controller"
import { laneMessages } from "../game/controller"
import { type Message, partitionOf } from "../sim/queue"

const LANE_LENGTH = 16
const LANE_WIDTH = 1.4
const CAR_LENGTH = 1.0
const CAR_GAP = 0.25

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

export function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length] as string
}

/** Lay a partition lane along +X starting at xStart; cars queue toward +X (head = earliest). */
function laneOriginZ(laneIndex: number, total: number): number {
  const spacing = 3.2
  return (laneIndex - (total - 1) / 2) * spacing
}

function carPosition(laneZ: number, offset: number, tail: number): THREE.Vector3 {
  // center the queue of cars around x=0; earliest car (offset 0) at the leftmost (head) end
  const span = tail <= 1 ? 0 : (tail - 1) * (CAR_LENGTH + CAR_GAP)
  const startX = -span / 2
  const x = startX + offset * (CAR_LENGTH + CAR_GAP)
  return new THREE.Vector3(x, 0.5, laneZ)
}

/** Three.js projection of sim state. Renders only — all rules live in src/sim and src/game. */
export class FreightScene {
  private readonly viewport: Viewport
  private yard = new THREE.Group()
  private laneMeshes = new Map<number, THREE.Group>()
  private carMesh: THREE.InstancedMesh | null = null
  private crewMarkers = new Map<string, THREE.Mesh>()
  private offsetPosts = new Map<string, THREE.Mesh>()
  /** dispatched when a partition lane is clicked; level decides what to do with it */
  onLaneClick: ((partition: number) => void) | null = null
  onCarClick: ((partition: number, offset: number) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.viewport = createViewport(canvas, {
      background: "#0b0e14",
      fogNear: 30,
      fogFar: 75,
      cameraPosition: [0, 14, 22],
      controlsTarget: [0, 0, 0],
      minDistance: 6,
      maxDistance: 60,
      ambientIntensity: 0.65,
      keyIntensity: 1.1,
      keyPosition: [10, 18, 10],
    })

    this.viewport.scene.add(this.yard)
    // ground plane (the yard floor)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: "#141a26", roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.05
    this.yard.add(ground)

    canvas.addEventListener("pointerdown", (e) => this.pick(e))
  }

  private pick(e: PointerEvent): void {
    this.viewport.setPointerFromEvent(e)
    this.viewport.raycaster.setFromCamera(this.viewport.pointer, this.viewport.camera)
    // cars first (more specific): InstancedMesh hits carry instanceId
    if (this.carMesh) {
      const carHits = this.viewport.raycaster.intersectObject(this.carMesh)
      const hit = carHits[0]
      if (hit !== undefined && this.onCarClick) {
        const cars = this.carMesh.userData.cars as Message[]
        const car = hit.instanceId !== undefined ? cars[hit.instanceId] : undefined
        if (car) {
          this.onCarClick(car.partition, car.offset)
          return
        }
      }
    }
    const laneObjects = [...this.laneMeshes.values()].flatMap((g) => g.children)
    const laneHits = this.viewport.raycaster.intersectObjects(laneObjects)
    const first = laneHits[0]
    if (first) {
      const ud = first.object.userData as { partition?: number }
      if (ud.partition !== undefined && this.onLaneClick) this.onLaneClick(ud.partition)
    }
  }

  /** Rebuild the whole projection from a sim snapshot. */
  sync(state: GameState): void {
    this.syncLanes(state)
    this.syncCars(state)
    this.syncCrewsAndOffsets(state)
  }

  private syncLanes(state: GameState): void {
    const wanted = new Set<number>()
    for (let p = 0; p < state.level.partitionCount; p++) wanted.add(p)
    for (const [p, group] of this.laneMeshes) {
      if (!wanted.has(p)) {
        this.yard.remove(group)
        this.laneMeshes.delete(p)
      }
    }
    for (let p = 0; p < state.level.partitionCount; p++) {
      let group = this.laneMeshes.get(p)
      if (!group) {
        group = this.buildLane(p, state.level.partitionCount)
        this.laneMeshes.set(p, group)
        this.yard.add(group)
      }
      // tint the ties by current owner if any
      const owner = state.group.assignment.get(p)
      const ownerColor = owner
        ? colorForIndex(state.group.consumers.findIndex((c) => c.id === owner))
        : "#3d4663"
      const ties = group.userData.ties as THREE.Mesh[]
      for (const t of ties) {
        ;(t.material as THREE.MeshBasicMaterial).color = new THREE.Color(ownerColor)
      }
    }
  }

  private buildLane(partition: number, total: number): THREE.Group {
    const g = new THREE.Group()
    const z = laneOriginZ(partition, total)
    // two rails (BoxGeometry) — the parallel track lane
    const railMat = new THREE.MeshStandardMaterial({
      color: "#6b7390",
      metalness: 0.3,
      roughness: 0.6,
    })
    for (const dz of [-LANE_WIDTH / 2, LANE_WIDTH / 2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(LANE_LENGTH, 0.12, 0.12), railMat)
      rail.position.set(0, 0.06, z + dz)
      g.add(rail)
    }
    // sleepers / ties (the partition marker strip)
    const ties: THREE.Mesh[] = []
    const tieCount = 16
    const tieGeo = new THREE.BoxGeometry(0.18, 0.08, LANE_WIDTH + 0.3)
    for (let i = 0; i < tieCount; i++) {
      const x = -LANE_LENGTH / 2 + (i + 0.5) * (LANE_LENGTH / tieCount)
      const tie = new THREE.Mesh(tieGeo, new THREE.MeshBasicMaterial({ color: "#3d4663" }))
      tie.position.set(x, 0.0, z)
      tie.userData = { partition }
      g.add(tie)
      ties.push(tie)
    }
    g.userData = { ties, partition }
    return g
  }

  /** Instanced freight cars: one box per message, tinted by partition (so a lane reads as one color). */
  private syncCars(state: GameState): void {
    if (this.carMesh) {
      this.yard.remove(this.carMesh)
      this.carMesh.dispose()
      this.carMesh = null
    }
    const cars: Message[] = []
    const tails: number[] = []
    for (let p = 0; p < state.level.partitionCount; p++) {
      const msgs = laneMessages(state.log, p)
      tails.push(msgs.length)
      for (const m of msgs) cars.push(m)
    }
    if (cars.length === 0) return
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(CAR_LENGTH, 0.8, LANE_WIDTH - 0.2),
      new THREE.MeshStandardMaterial({ flatShading: true }),
      cars.length,
    )
    const m = new THREE.Matrix4()
    cars.forEach((car, i) => {
      const tail = tails[car.partition] ?? 1
      const z = laneOriginZ(car.partition, state.level.partitionCount)
      m.setPosition(carPosition(z, car.offset, tail))
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, new THREE.Color(colorForIndex(car.partition)))
    })
    // Raycasting against InstancedMesh yields instanceId; map it back to a Message via userData.
    mesh.userData = { cars }
    this.yard.add(mesh)
    this.carMesh = mesh
  }

  /** Crew markers (colored spheres) at each lane's head; glowing offset posts at the cursor. */
  private syncCrewsAndOffsets(state: GameState): void {
    // crew markers: place one per consumer at the head of each lane they own
    const wantedCrews = new Set<string>()
    const ownerToPartitions = new Map<string, number[]>()
    for (const [partition, owner] of state.group.assignment) {
      wantedCrews.add(owner)
      const arr = ownerToPartitions.get(owner) ?? []
      arr.push(partition)
      ownerToPartitions.set(owner, arr)
    }
    // remove crews no longer present
    for (const [id, mesh] of this.crewMarkers) {
      if (!wantedCrews.has(id)) {
        this.yard.remove(mesh)
        this.crewMarkers.delete(id)
      }
    }
    for (const [owner, partitions] of ownerToPartitions) {
      const crewIdx = state.group.consumers.findIndex((c) => c.id === owner)
      const color = colorForIndex(crewIdx >= 0 ? crewIdx : 0)
      // a marker per owned lane at the head (-X end)
      for (const p of partitions) {
        const key = `${owner}#${p}`
        let mesh = this.crewMarkers.get(key)
        const z = laneOriginZ(p, state.level.partitionCount)
        const head = new THREE.Vector3(-LANE_LENGTH / 2 - 1.2, 0.9, z)
        if (!mesh) {
          mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.55),
            new THREE.MeshStandardMaterial({
              color,
              flatShading: true,
              emissive: color,
              emissiveIntensity: 0.4,
            }),
          )
          mesh.userData = { crewId: owner }
          this.yard.add(mesh)
          this.crewMarkers.set(key, mesh)
        }
        ;(mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(color)
        ;(mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(color)
        mesh.position.copy(head)
      }
    }

    // offset posts: a glowing post on each lane at the committed offset cursor
    const wantedPosts = new Set<string>()
    for (const [partition, offset] of state.group.offsets) {
      const id = `post#${partition}`
      wantedPosts.add(id)
      const tail = laneMessages(state.log, partition).length
      const z = laneOriginZ(partition, state.level.partitionCount)
      const pos = carPosition(z, Math.max(0, offset - 0.5), Math.max(1, tail))
      let post = this.offsetPosts.get(id)
      if (!post) {
        post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 1.4, 8),
          new THREE.MeshBasicMaterial({ color: "#ffd54f" }),
        )
        this.yard.add(post)
        this.offsetPosts.set(id, post)
      }
      pos.y = 0.9
      post.position.copy(pos)
    }
    for (const [id, post] of this.offsetPosts) {
      if (!wantedPosts.has(id)) {
        this.yard.remove(post)
        this.offsetPosts.delete(id)
      }
    }
  }
}

/** Re-exported so the scene + HUD share one partition math source. */
export { partitionOf }
