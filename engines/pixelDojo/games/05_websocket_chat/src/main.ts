// 05_websocket_chat — Switch-Fabric Hub (3D).
//
// Teaches the WebSocket connection lifecycle and broadcast fan-out as a 3D
// arcade world. The player IS the server: a central hub tethered to N
// persistent client satellites, organized into color-band rooms. Inbound
// message particles arrive at the hub; the player picks the target room
// (ArrowLeft / ArrowRight) and fans out (Z). Wrong color = leak. Dead peers
// (heartbeat = 0) must be pruned (X) before the next fan-out. Win the wave by
// routing every particle to the right room with no leaks, no missed
// disconnects, no deadline misses, and no slow-consumer overflows.
//
// No backend — the entire WebSocket protocol is simulated in-page. The gated
// attempt is L2 (12 clients, 2 rooms, 8 messages, no deaths).

import {
  BufferGeometry,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three"
import {
  ROOM_COLORS,
  ROOM_COUNT,
  WAVE_QUOTA,
  activeMessage,
  broadcast,
  createState,
  cycleFocus,
  liveMembersOfRoom,
  maybeSpawn,
  tick,
  type Client,
  type GameState,
  type RoomId,
} from "./game/logic"
import { buildEvidence, emitEvidence } from "./game/evidence/emitter"
import "./styles.css"

// ---------------------------------------------------------------------------
// Scene constants
// ---------------------------------------------------------------------------

const ROOM_HEX: Record<RoomId, number> = { 0: 0x35e0ff, 1: 0xff3df0 } // cyan, magenta
const ROOM_HEX_DARK: Record<RoomId, number> = { 0: 0x0a3340, 1: 0x3f0a3c }

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------

const app = document.querySelector("#app")
if (app === null) throw new Error("#app element missing")

const scene = new Scene()
scene.background = new Color(0x05060d)

const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 7, 11)
camera.lookAt(0, 0, 0)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.domElement.classList.add("game-canvas")
app.appendChild(renderer.domElement)

// Hub: octahedral core at origin, slow rotation.
const hub = new Mesh(new OctahedronGeometry(0.9, 0), new MeshBasicMaterial({ color: 0xffffff }))
scene.add(hub)

const hubGlow = new Mesh(
  new OctahedronGeometry(1.15, 0),
  new MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.4 }),
)
scene.add(hubGlow)

// ---------------------------------------------------------------------------
// Game state + per-client 3D assets
// ---------------------------------------------------------------------------

const state: GameState = createState(performance.now())

type ClientView = {
  client: Client
  mesh: Mesh
  tether: Line
  ring: Mesh // heartbeat ring around the client
}

const clientViews: ClientView[] = []

function clientPosition(client: Client): Vector3 {
  return new Vector3(
    Math.cos(client.angle) * client.radius,
    client.height,
    Math.sin(client.angle) * client.radius,
  )
}

function buildClientView(client: Client): ClientView {
  const pos = clientPosition(client)
  const mesh = new Mesh(
    new IcosahedronGeometry(0.35, 0),
    new MeshBasicMaterial({ color: ROOM_HEX[client.room] }),
  )
  mesh.position.copy(pos)
  scene.add(mesh)

  const tether = new Line(
    new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), pos.clone()]),
    new LineBasicMaterial({
      color: ROOM_HEX[client.room],
      transparent: true,
      opacity: 0.6,
    }),
  )
  scene.add(tether)

  const ring = new Mesh(
    new RingGeometry(0.5, 0.62, 24),
    new MeshBasicMaterial({
      color: ROOM_HEX[client.room],
      side: DoubleSide,
      transparent: true,
      opacity: 0.7,
    }),
  )
  ring.position.copy(pos)
  ring.lookAt(camera.position)
  scene.add(ring)

  return { client, mesh, tether, ring }
}

for (const client of state.clients) {
  clientViews.push(buildClientView(client))
}

// ---------------------------------------------------------------------------
// Room brackets — color band rings around the hub
// ---------------------------------------------------------------------------

const roomBrackets: Mesh[] = []
for (let r = 0; r < ROOM_COUNT; r += 1) {
  const roomId = r as RoomId
  const radius = roomId === 0 ? 4.5 : 6.5
  const torus = new Mesh(
    new RingGeometry(radius - 0.05, radius + 0.05, 96),
    new MeshBasicMaterial({
      color: ROOM_HEX_DARK[roomId],
      side: DoubleSide,
      transparent: true,
      opacity: 0.35,
    }),
  )
  torus.rotation.x = Math.PI / 2
  torus.position.y = roomId === 0 ? 1.2 : -1.2
  scene.add(torus)
  roomBrackets.push(torus)
}

// ---------------------------------------------------------------------------
// Inbound message particle (lives at the hub while pending)
// ---------------------------------------------------------------------------

const msgMesh = new Mesh(new IcosahedronGeometry(0.4, 1), new MeshBasicMaterial({ color: 0xffffff }))
msgMesh.visible = false
scene.add(msgMesh)

const msgRing = new Mesh(
  new RingGeometry(0.7, 0.82, 32),
  new MeshBasicMaterial({ color: 0xffffff, side: DoubleSide, transparent: true, opacity: 0.9 }),
)
msgRing.visible = false
scene.add(msgRing)

// ---------------------------------------------------------------------------
// Fan-out copy pool — small spheres that ride tethers on broadcast
// ---------------------------------------------------------------------------

type FanOutCopy = {
  mesh: Mesh
  from: Vector3
  to: Vector3
  start: number
  duration: number
  alive: boolean
}
const fanOutPool: FanOutCopy[] = []
const fanOutGeo = new IcosahedronGeometry(0.18, 0)

function spawnFanOutCopies(room: RoomId, startedAt: number): void {
  const members = liveMembersOfRoom(state, room)
  for (const member of members) {
    const mesh = new Mesh(fanOutGeo, new MeshBasicMaterial({ color: ROOM_HEX[room] }))
    mesh.position.set(0, 0, 0)
    scene.add(mesh)
    fanOutPool.push({
      mesh,
      from: new Vector3(0, 0, 0),
      to: clientPosition(member),
      start: startedAt,
      duration: 700,
      alive: true,
    })
  }
}

// ---------------------------------------------------------------------------
// Per-frame view sync
// ---------------------------------------------------------------------------

function updateClientViews(now: number): void {
  for (const view of clientViews) {
    const alive = view.client.alive
    const color = alive ? ROOM_HEX[view.client.room] : 0x4a4a55
    const mat = view.mesh.material as MeshBasicMaterial
    mat.color.setHex(color)
    const pulse = alive ? 1 + Math.sin(now * 0.004 + view.client.id) * 0.06 : 0.6
    view.mesh.scale.setScalar(pulse)
    const ringMat = view.ring.material as MeshBasicMaterial
    ringMat.color.setHex(color)
    ringMat.opacity = alive ? 0.3 + view.client.heartbeat * 0.5 : 0.05
    const tetherMat = view.tether.material as LineBasicMaterial
    tetherMat.color.setHex(color)
    tetherMat.opacity = alive ? 0.35 + view.client.heartbeat * 0.55 : 0.08
  }
}

function updateRoomBrackets(): void {
  for (let r = 0; r < roomBrackets.length; r += 1) {
    const torus = roomBrackets[r]
    if (torus === undefined) continue
    const roomId = r as RoomId
    const mat = torus.material as MeshBasicMaterial
    const isFocused = state.focusedRoom === roomId
    mat.color.setHex(isFocused ? ROOM_HEX[roomId] : ROOM_HEX_DARK[roomId])
    mat.opacity = isFocused ? 0.75 : 0.3
  }
}

function updateMessageParticle(now: number): void {
  const active = activeMessage(state)
  if (active === null) {
    msgMesh.visible = false
    msgRing.visible = false
    return
  }
  msgMesh.visible = true
  msgRing.visible = true
  const elapsed = now - active.bornAt
  const remaining = Math.max(0, 1 - elapsed / active.deadlineMs)
  ;(msgMesh.material as MeshBasicMaterial).color.setHex(ROOM_HEX[active.targetRoom])
  const ringMat = msgRing.material as MeshBasicMaterial
  ringMat.color.setHex(0xffffff)
  ringMat.opacity = 0.4 + remaining * 0.6
  msgRing.scale.setScalar(1 + (1 - remaining) * 0.6)
  msgRing.lookAt(camera.position)
}

function updateFanOutCopies(now: number): void {
  for (const copy of fanOutPool) {
    if (!copy.alive) continue
    const t = Math.min(1, (now - copy.start) / copy.duration)
    copy.mesh.position.lerpVectors(copy.from, copy.to, t)
    const mat = copy.mesh.material as MeshBasicMaterial
    mat.opacity = 1 - t
    mat.transparent = true
    if (t >= 1) {
      copy.alive = false
      copy.mesh.visible = false
    }
  }
}

// ---------------------------------------------------------------------------
// HUD overlay
// ---------------------------------------------------------------------------

const hud = document.createElement("div")
hud.className = "hud"
app.appendChild(hud)

const objective = document.createElement("div")
objective.className = "hud-row hud-objective"
const status = document.createElement("div")
status.className = "hud-row hud-status"
const controls = document.createElement("div")
controls.className = "hud-row hud-controls"
const metricsRow = document.createElement("div")
metricsRow.classList.add("hud-row", "hud-metrics")
hud.append(objective, status, controls, metricsRow)

controls.innerHTML =
  '<span class="key">← →</span> cycle room &nbsp; ' +
  '<span class="key">Z</span> broadcast &nbsp; ' +
  '<span class="key">X</span> prune dead &nbsp; ' +
  '<span class="key">drag</span> orbit'

function renderHud(): void {
  const roomLabel = ROOM_COLORS[state.focusedRoom]
  const active = activeMessage(state)
  const want = active === null ? "—" : ROOM_COLORS[active.targetRoom]
  objective.innerHTML =
    `<span class="chip chip-room">focus: <b>${roomLabel}</b></span>` +
    `<span class="chip chip-target">inbound wants: <b>${want}</b></span>`
  const routed = state.metrics.messages_broadcast
  status.innerHTML =
    `<span class="chip">routed ${routed}/${WAVE_QUOTA}</span>` +
    `<span class="chip">leaks ${state.metrics.wrong_room_leaks}</span>` +
    `<span class="chip">missed_disconnects ${state.metrics.missed_disconnects}</span>` +
    `<span class="chip">deadline_misses ${state.metrics.deadline_misses}</span>` +
    `<span class="chip">slow_drops ${state.metrics.slow_consumer_drops}</span>`
  metricsRow.innerHTML =
    '<span class="chip chip-foot">persistent tether per client · fan-out 1→N per room · match color before Z</span>'
}

renderHud()

// ---------------------------------------------------------------------------
// Win overlay (shown when wave resolves)
// ---------------------------------------------------------------------------

const overlay = document.createElement("div")
overlay.className = "overlay hidden"
app.appendChild(overlay)

function showOverlay(): void {
  const m = state.metrics
  const verdict = state.won ? "PASS — wave cleared" : "FAIL — wave lost"
  const verdictClass = state.won ? "verdict pass" : "verdict fail"
  overlay.innerHTML =
    `<div class="overlay-card">` +
    `<div class="${verdictClass}">${verdict}</div>` +
    `<ul class="gate-list">` +
    `<li>messages_broadcast: ${m.messages_broadcast}/${m.messages_inbound}</li>` +
    `<li>correct_deliveries: ${m.correct_deliveries}</li>` +
    `<li>wrong_room_leaks: ${m.wrong_room_leaks}</li>` +
    `<li>missed_disconnects: ${m.missed_disconnects}</li>` +
    `<li>deadline_misses: ${m.deadline_misses}</li>` +
    `<li>slow_consumer_drops: ${m.slow_consumer_drops}</li>` +
    `</ul>` +
    `<div class="overlay-foot">verifier decides mastery — refresh to replay</div>` +
    `</div>`
  overlay.classList.remove("hidden")
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function onKey(event: KeyboardEvent): void {
  if (state.finished) return
  const now = performance.now()
  if (event.key === "ArrowLeft") {
    cycleFocus(state, -1)
    event.preventDefault()
  } else if (event.key === "ArrowRight") {
    cycleFocus(state, 1)
    event.preventDefault()
  } else if (event.key === "z" || event.key === "Z") {
    const beforeBroadcast = state.metrics.messages_broadcast
    broadcast(state, now)
    if (state.metrics.messages_broadcast !== beforeBroadcast) {
      spawnFanOutCopies(state.focusedRoom, now)
    }
    event.preventDefault()
  } else if (event.key === "x" || event.key === "X") {
    // L2 has no dead clients; X is a no-op but reserved for L3 prune discipline.
    event.preventDefault()
  }
  renderHud()
}

window.addEventListener("keydown", onKey)

// Orbit camera drag (mouse only — aids 3D legibility, no gameplay effect)
let dragging = false
let dragX = 0
let dragY = 0
let yaw = 0
let pitch = Math.PI / 3.2
const camRadius = 13

function onPointerDown(event: PointerEvent): void {
  dragging = true
  dragX = event.clientX
  dragY = event.clientY
}
function onPointerMove(event: PointerEvent): void {
  if (!dragging) return
  const dx = event.clientX - dragX
  const dy = event.clientY - dragY
  dragX = event.clientX
  dragY = event.clientY
  yaw -= dx * 0.005
  pitch = Math.max(0.4, Math.min(Math.PI / 2 - 0.05, pitch - dy * 0.005))
}
function onPointerUp(): void {
  dragging = false
}
renderer.domElement.addEventListener("pointerdown", onPointerDown)
window.addEventListener("pointermove", onPointerMove)
window.addEventListener("pointerup", onPointerUp)

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener("resize", onResize)

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let lastTick = performance.now()
let evidenceEmitted = false

function loop(): void {
  const now = performance.now()

  // Spawning + ticking — the world keeps producing inbound particles.
  if (!state.finished) {
    maybeSpawn(state, now)
    if (now - lastTick > 200) {
      tick(state, now)
      lastTick = now
    }
  }

  // Animate hub.
  hub.rotation.x += 0.005
  hub.rotation.y += 0.008
  hubGlow.rotation.x -= 0.003
  hubGlow.rotation.y -= 0.006

  // Update views.
  updateClientViews(now)
  updateRoomBrackets()
  updateMessageParticle(now)
  updateFanOutCopies(now)

  // Orbit camera.
  camera.position.x = Math.cos(yaw) * Math.cos(pitch) * camRadius
  camera.position.y = Math.sin(pitch) * camRadius
  camera.position.z = Math.sin(yaw) * Math.cos(pitch) * camRadius
  camera.lookAt(0, 0, 0)

  // Re-render HUD when something visible changed.
  renderHud()

  // Emit evidence exactly once when the wave resolves.
  if (state.finished && !evidenceEmitted) {
    evidenceEmitted = true
    emitEvidence(buildEvidence(state, new Date()))
    showOverlay()
  }

  renderer.render(scene, camera)
  requestAnimationFrame(loop)
}

requestAnimationFrame(loop)
