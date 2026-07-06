// Raft Ring — 3D projection of the cluster. Read-only with respect to game
// state: every visual is derived from SceneState (a snapshot of the cluster
// + the player's target node + the latest dispatch outcome + finish flag).
// The scene never mutates the cluster, metrics, or wave — it only renders.
//
// Mapping (concept -> visual), per docs/plans/12_distributed_job_scheduler.md:
//   - Scheduler node    = numbered pedestal around the ring, with a vertical
//                         term beacon whose height = current term.
//   - Leader            = gold crown halo above its pedestal; gold beacon.
//   - Vote beam         = green line from each voting peer to the candidate,
//                         shown for a short window after an election.
//   - Worker            = cube on the outer ring with a billboarded token HUD
//                         (its lastSeenToken); flashes red on stale reject.
//   - Job queue         = stacked orbs at the center, sized + tinted by
//                         priority (critical huge white -> low small dim).
//   - Dispatch beam     = bright line from leader pedestal through the front
//                         orb to the accepting worker; the orb fades out.
//   - Partition curtain = translucent vertical plane between the two severed
//                         groups; obvious scanline tint, never fully opaque.
//   - Scoreboard        = HUD-style sprite above the ring: `T<k | leader N |
//                         token T`.

import {
  AmbientLight,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three"
import {
  NODE_COUNT,
  type NodeId,
  type NodeRole,
  type Partition,
  type Priority,
  type WorkerId,
  WORKER_COUNT,
} from "./cluster"

// Read-only snapshot the renderer consumes. Built each frame by main.ts from
// the live Cluster.
export type NodeView = {
  readonly id: NodeId
  readonly role: NodeRole
  readonly term: number
  readonly leaderToken: number
  readonly visibleSide: readonly NodeId[]
}

export type WorkerView = {
  readonly id: WorkerId
  readonly lastSeenToken: number
}

export type JobView = {
  readonly id: number
  readonly priority: Priority
  readonly accepted: boolean
}

export type SceneState = {
  readonly nodes: readonly NodeView[]
  readonly workers: readonly WorkerView[]
  readonly jobs: readonly JobView[]
  readonly currentLeader: NodeId | null
  readonly currentToken: number
  readonly partition: Partition | null
  readonly targetNode: NodeId
  // Pending visual pulses the game emits on input. Each carries an "until"
  // epoch-ms after which the visual effect stops.
  readonly electionPulse: { readonly candidate: NodeId; readonly voters: readonly NodeId[] } | null
  readonly dispatchPulse: {
    readonly leader: NodeId
    readonly worker: WorkerId
    readonly jobId: number | null
    readonly accepted: boolean
  } | null
  readonly rejectFlash: { readonly worker: WorkerId } | null
  readonly toast: { readonly text: string; readonly kind: "info" | "bad" | "good" } | null
  readonly finished: boolean
}

const RING_RADIUS = 5.2
const OUTER_RADIUS = 9
const PEDESTAL_HEIGHT = 0.5

const PRIORITY_RANK: Record<Priority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

// Priority -> (radius, color)
function priorityStyle(p: Priority): { readonly radius: number; readonly color: string } {
  switch (p) {
    case "critical":
      return { radius: 0.55, color: "#fdfdff" }
    case "high":
      return { radius: 0.45, color: "#ffe066" }
    case "normal":
      return { radius: 0.36, color: "#7cd5ff" }
    case "low":
      return { radius: 0.26, color: "#5a6a85" }
  }
}

function nodePosition(i: NodeId): Vector3 {
  const angle = (i / NODE_COUNT) * Math.PI * 2 - Math.PI / 2
  return new Vector3(Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS)
}

function workerPosition(i: WorkerId): Vector3 {
  // Workers sit between nodes on the outer ring — spread evenly.
  const angle = (i / WORKER_COUNT) * Math.PI * 2 + Math.PI / WORKER_COUNT
  return new Vector3(Math.cos(angle) * OUTER_RADIUS, 0.8, Math.sin(angle) * OUTER_RADIUS)
}

// ---- Sprite label helper (cheap billboarded text) -------------------------

function makeLabelTexture(text: string, color: string, bg = "rgba(8,12,20,0.85)"): CanvasTexture {
  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext("2d")
  if (ctx !== null) {
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "rgba(207,166,74,0.6)"
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4)
    ctx.fillStyle = color
    ctx.font = "bold 56px 'Courier New', monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  }
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function makeLabelSprite(text: string, color: string, scale = 1.6): Sprite {
  const tex = makeLabelTexture(text, color)
  const mat = new SpriteMaterial({ map: tex, depthTest: false, transparent: true })
  const sprite = new Sprite(mat)
  sprite.scale.set(scale, scale * 0.5, 1)
  return sprite
}

function setSpriteText(sprite: Sprite, text: string, color: string): void {
  const tex = makeLabelTexture(text, color)
  const old = sprite.material.map
  sprite.material.map = tex
  sprite.material.needsUpdate = true
  if (old !== null) old.dispose()
}

// ---- Scene -----------------------------------------------------------------

export class RaftRingScene {
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  private readonly renderer: WebGLRenderer
  private readonly ambient = new AmbientLight("#9ee0ff", 0.55)
  private readonly keyLight = new DirectionalLight("#f6dd88", 2.0)
  private readonly fillLight = new DirectionalLight("#67c2ff", 0.9)
  private readonly nodesGroup = new Group()
  private readonly workersGroup = new Group()
  private readonly queueGroup = new Group()
  private readonly curtainGroup = new Group()
  private readonly beamsGroup = new Group()

  // Per-node visuals
  private readonly nodeMeshes: Mesh[] = []
  private readonly nodeMaterials: MeshStandardMaterial[] = []
  private readonly beaconMeshes: Mesh[] = []
  private readonly beaconMaterials: MeshStandardMaterial[] = []
  private readonly crownMeshes: Mesh[] = []
  private readonly crownMaterials: MeshStandardMaterial[] = []
  private readonly nodeLabels: Sprite[] = []
  private readonly targetRing: Mesh

  // Per-worker visuals
  private readonly workerMeshes: Mesh[] = []
  private readonly workerMaterials: MeshStandardMaterial[] = []
  private readonly workerLabels: Sprite[] = []
  private workerLabelCache: string[] = []

  // Scoreboard
  private readonly scoreboard: Sprite

  // Pulse line objects (rebuilt each frame from SceneState)
  private pulseLine: Line | null = null

  constructor(private readonly container: HTMLElement) {
    const width = Math.max(container.clientWidth, 320)
    const height = Math.max(container.clientHeight, 240)
    this.camera = new PerspectiveCamera(50, width / height, 0.1, 100)
    this.camera.position.set(0, 11, 14)
    this.camera.lookAt(0, 0.6, 0)

    this.renderer = new WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.scene.background = new Color("#06080d")
    this.scene.add(this.ambient, this.keyLight, this.fillLight)
    this.keyLight.position.set(4, 9, 5)
    this.fillLight.position.set(-5, 4, -3)

    this.scene.add(this.nodesGroup, this.workersGroup, this.queueGroup, this.curtainGroup, this.beamsGroup)
    this.buildFloor()
    this.buildNodes()
    this.buildWorkers()
    this.targetRing = this.buildTargetRing()
    this.scene.add(this.targetRing)

    this.scoreboard = makeLabelSprite("T0  leader —  token 0", "#f6dd88", 7)
    this.scoreboard.position.set(0, 5.2, 0)
    this.scene.add(this.scoreboard)

    container.appendChild(this.renderer.domElement)
  }

  private buildFloor(): void {
    const floorGeo = new CircleGeometry(OUTER_RADIUS + 2, 64)
    const floorMat = new MeshStandardMaterial({
      color: "#0a1320",
      emissive: "#050a14",
      roughness: 0.9,
      metalness: 0.1,
    })
    const floor = new Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.05
    this.scene.add(floor)

    const ringGeo = new RingGeometry(RING_RADIUS - 0.05, RING_RADIUS + 0.05, 64)
    const ringMat = new MeshBasicMaterial({
      color: "#1d3247",
      transparent: true,
      opacity: 0.8,
    })
    const ring = new Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.01
    this.scene.add(ring)
  }

  private buildNodes(): void {
    const pedGeo = new CylinderGeometry(0.85, 1.0, PEDESTAL_HEIGHT, 24)
    for (let i = 0; i < NODE_COUNT; i += 1) {
      const mat = new MeshStandardMaterial({
        color: "#1a2940",
        emissive: "#0a1424",
        roughness: 0.7,
      })
      const mesh = new Mesh(pedGeo, mat)
      const pos = nodePosition(i as NodeId)
      mesh.position.set(pos.x, PEDESTAL_HEIGHT / 2, pos.z)
      this.nodesGroup.add(mesh)
      this.nodeMeshes.push(mesh)
      this.nodeMaterials.push(mat)

      // Term beacon — translucent cylinder, height scales with term.
      const beaconMat = new MeshStandardMaterial({
        color: "#3a5e85",
        emissive: "#1c3357",
        transparent: true,
        opacity: 0.45,
        roughness: 0.5,
      })
      const beaconGeo = new CylinderGeometry(0.35, 0.35, 1, 16)
      const beacon = new Mesh(beaconGeo, beaconMat)
      beacon.position.set(pos.x, PEDESTAL_HEIGHT + 0.5, pos.z)
      this.nodesGroup.add(beacon)
      this.beaconMeshes.push(beacon)
      this.beaconMaterials.push(beaconMat)

      // Crown — torus halo, hidden unless this node is a leader.
      const crownMat = new MeshStandardMaterial({
        color: "#ffd86b",
        emissive: "#a87018",
        roughness: 0.4,
        metalness: 0.6,
      })
      const crownGeo = new TorusGeometry(0.55, 0.07, 12, 32)
      const crown = new Mesh(crownGeo, crownMat)
      crown.position.set(pos.x, PEDESTAL_HEIGHT + 1.4, pos.z)
      crown.rotation.x = Math.PI / 2
      crown.visible = false
      this.nodesGroup.add(crown)
      this.crownMeshes.push(crown)
      this.crownMaterials.push(crownMat)

      const label = makeLabelSprite(`N${i}`, "#9ee0ff", 1.4)
      label.position.set(pos.x, PEDESTAL_HEIGHT + 2.3, pos.z)
      this.nodesGroup.add(label)
      this.nodeLabels.push(label)
    }
  }

  private buildWorkers(): void {
    const cubeGeo = new ConeGeometry(0.7, 1.2, 4)
    for (let i = 0; i < WORKER_COUNT; i += 1) {
      const mat = new MeshStandardMaterial({
        color: "#1f3a2e",
        emissive: "#0a1c14",
        roughness: 0.6,
      })
      const mesh = new Mesh(cubeGeo, mat)
      const pos = workerPosition(i as WorkerId)
      mesh.position.set(pos.x, pos.y, pos.z)
      this.workersGroup.add(mesh)
      this.workerMeshes.push(mesh)
      this.workerMaterials.push(mat)

      const label = makeLabelSprite("tok 0", "#7ac46b", 1.4)
      label.position.set(pos.x, pos.y + 1.3, pos.z)
      this.workersGroup.add(label)
      this.workerLabels.push(label)
      this.workerLabelCache.push("tok 0")
    }
  }

  private buildTargetRing(): Mesh {
    const geo = new RingGeometry(1.05, 1.25, 32)
    const mat = new MeshBasicMaterial({
      color: "#f6dd88",
      transparent: true,
      opacity: 0.85,
    })
    const ring = new Mesh(geo, mat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.06
    return ring
  }

  // Sync visuals to a snapshot of cluster state.
  sync(state: SceneState): void {
    // Nodes
    for (let i = 0; i < NODE_COUNT; i += 1) {
      const view = state.nodes[i]
      const mat = this.nodeMaterials[i]
      const beacon = this.beaconMeshes[i]
      const beaconMat = this.beaconMaterials[i]
      const crown = this.crownMeshes[i]
      const crownMat = this.crownMaterials[i]
      if (mat === undefined || beacon === undefined || crown === undefined) continue
      if (view === undefined) continue
      const pos = nodePosition(i as NodeId)
      const visibleCount = view.visibleSide.length
      const hasQuorum = visibleCount >= 3
      // Pedestal color: leader gold, candidate amber, follower blue, dim on
      // minority side.
      if (view.role === "leader") {
        mat.color.set("#3a2f0c")
        mat.emissive.set("#a87018")
      } else if (view.role === "candidate") {
        mat.color.set("#3a2410")
        mat.emissive.set("#5a3a18")
      } else {
        mat.color.set("#1a2940")
        mat.emissive.set("#0a1424")
      }
      // Dim if on minority side.
      if (!hasQuorum && state.partition !== null) {
        mat.emissive.multiplyScalar(0.4)
      }
      // Term beacon height = term * 0.6 + small floor; tint by role.
      const beaconH = Math.max(0.05, view.term * 0.6)
      beacon.scale.set(1, beaconH, 1)
      beacon.position.set(pos.x, PEDESTAL_HEIGHT + beaconH / 2, pos.z)
      if (view.role === "leader") {
        beaconMat.color.set("#ffd86b")
        beaconMat.emissive.set("#a87018")
        beaconMat.opacity = 0.7
      } else if (view.role === "candidate") {
        beaconMat.color.set("#e8a64a")
        beaconMat.emissive.set("#5a3a18")
        beaconMat.opacity = 0.55
      } else {
        beaconMat.color.set("#3a5e85")
        beaconMat.emissive.set("#1c3357")
        beaconMat.opacity = 0.4
      }
      // Crown visibility — only nodes that believe they're a leader show a
      // crown. The CANONICAL current leader shows gold; a partitioned stale
      // leader shows red (split-brain made visible).
      crown.visible = view.role === "leader"
      if (view.role === "leader") {
        const isCanonical = state.currentLeader === view.id
        if (isCanonical) {
          crownMat.color.set("#ffd86b")
          crownMat.emissive.set("#a87018")
        } else {
          crownMat.color.set("#ff6b6b")
          crownMat.emissive.set("#7a1a1a")
        }
      }
    }

    // Workers
    for (let i = 0; i < WORKER_COUNT; i += 1) {
      const view = state.workers[i]
      const mat = this.workerMaterials[i]
      const label = this.workerLabels[i]
      if (mat === undefined || label === undefined) continue
      if (view === undefined) continue
      const flashing = state.rejectFlash?.worker === i
      if (flashing) {
        mat.color.set("#5a1a1a")
        mat.emissive.set("#7a1a1a")
      } else {
        mat.color.set("#1f3a2e")
        mat.emissive.set("#0a1c14")
      }
      // Update token label only when it changed (avoids per-frame texture
      // churn).
      const labelText = `tok ${view.lastSeenToken}`
      const cached = this.workerLabelCache[i]
      if (cached !== labelText) {
        setSpriteText(label, labelText, "#7ac46b")
        this.workerLabelCache[i] = labelText
      }
    }

    // Job orbs (rebuild on every sync — cheap at N=8).
    this.refreshQueue(state)

    // Partition curtain
    this.refreshCurtain(state)

    // Pulse beams
    this.refreshPulses(state)

    // Target ring follows the focused node.
    const tpos = nodePosition(state.targetNode)
    this.targetRing.position.set(tpos.x, 0.06, tpos.z)
    this.targetRing.visible = !state.finished

    // Scoreboard
    const leaderTxt = state.currentLeader === null ? "—" : `N${state.currentLeader}`
    const scoreboardText = `T${state.currentToken}  leader ${leaderTxt}  token ${state.currentToken}`
    setSpriteText(this.scoreboard, scoreboardText, "#f6dd88")
  }

  private refreshQueue(state: SceneState): void {
    // Remove old orbs.
    for (const orb of this.queueOrbs) {
      this.queueGroup.remove(orb)
      orb.geometry.dispose()
    }
    this.queueOrbs.length = 0
    for (const mat of this.queueOrbMaterials) mat.dispose()
    this.queueOrbMaterials.length = 0

    // Re-build from pending (not-yet-accepted) jobs.
    const pending = state.jobs.filter((j) => !j.accepted)
    pending.sort((a, b) => {
      const ra = PRIORITY_RANK[a.priority]
      const rb = PRIORITY_RANK[b.priority]
      if (ra !== rb) return rb - ra
      return a.id - b.id
    })
    for (let i = 0; i < pending.length; i += 1) {
      const job = pending[i]
      if (job === undefined) continue
      const style = priorityStyle(job.priority)
      const geo = new SphereGeometry(style.radius, 16, 12)
      const mat = new MeshBasicMaterial({ color: style.color })
      const orb = new Mesh(geo, mat)
      // Stack the orbs vertically in the center, top-of-queue at the bottom.
      orb.position.set(0, 0.6 + i * (style.radius * 2 + 0.05), 0)
      this.queueGroup.add(orb)
      this.queueOrbs.push(orb)
      this.queueOrbMaterials.push(mat)
    }
  }

  private refreshCurtain(state: SceneState): void {
    // Clear previous curtain.
    for (const child of [...this.curtainGroup.children]) {
      this.curtainGroup.remove(child)
      if (child instanceof Mesh) {
        child.geometry.dispose()
        const m = child.material
        if (m instanceof MeshBasicMaterial) m.dispose()
      }
    }
    if (state.partition === null) return
    // Build a translucent plane bisecting the ring between the two groups.
    const aPos = avgPosition(state.partition.a.map((n) => nodePosition(n)))
    const bPos = avgPosition(state.partition.b.map((n) => nodePosition(n)))
    const mid = new Vector3().addVectors(aPos, bPos).multiplyScalar(0.5)
    const dir = new Vector3().subVectors(bPos, aPos).normalize()
    const planeGeo = new PlaneGeometry(1.5, 5.5)
    const planeMat = new MeshBasicMaterial({
      color: "#ff6b6b",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
    const plane = new Mesh(planeGeo, planeMat)
    plane.position.set(mid.x * 0.5, 2.5, mid.z * 0.5)
    // Orient: plane normal should align with `dir` (so the plane faces across
    // the ring). lookAt along dir.
    plane.lookAt(plane.position.clone().add(dir))
    this.curtainGroup.add(plane)
  }

  private refreshPulses(state: SceneState): void {
    // Clear previous pulse line.
    if (this.pulseLine !== null) {
      this.beamsGroup.remove(this.pulseLine)
      this.pulseLine.geometry.dispose()
      const m = this.pulseLine.material
      if (m instanceof LineBasicMaterial) m.dispose()
      this.pulseLine = null
    }
    if (state.electionPulse !== null) {
      // Render vote beams from each voter to the candidate.
      const candidatePos = nodePosition(state.electionPulse.candidate).clone()
      candidatePos.y = PEDESTAL_HEIGHT + 1.0
      const points: Vector3[] = []
      for (const voter of state.electionPulse.voters) {
        const p = nodePosition(voter).clone()
        p.y = PEDESTAL_HEIGHT + 1.0
        points.push(p, candidatePos)
      }
      if (points.length >= 2) {
        const geo = new BufferGeometry()
        geo.setFromPoints(points)
        const mat = new LineBasicMaterial({ color: "#7ac46b", transparent: true, opacity: 0.8 })
        const line = new Line(geo, mat)
        this.beamsGroup.add(line)
        this.pulseLine = line
      }
      return
    }
    if (state.dispatchPulse !== null) {
      const leaderPos = nodePosition(state.dispatchPulse.leader).clone()
      leaderPos.y = PEDESTAL_HEIGHT + 1.0
      const workerPos = workerPosition(state.dispatchPulse.worker).clone()
      workerPos.y = 1.0
      const geo = new BufferGeometry()
      const mid = new Vector3(0, 1.0, 0)
      geo.setFromPoints([leaderPos, mid, workerPos])
      const mat = new LineBasicMaterial({
        color: state.dispatchPulse.accepted ? "#7ac46b" : "#ff6b6b",
        transparent: true,
        opacity: 0.95,
      })
      const line = new Line(geo, mat)
      this.beamsGroup.add(line)
      this.pulseLine = line
    }
  }

  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }
}

function avgPosition(points: readonly Vector3[]): Vector3 {
  if (points.length === 0) return new Vector3()
  const sum = new Vector3()
  for (const p of points) sum.add(p)
  return sum.multiplyScalar(1 / points.length)
}
