// Quorum Citadel — three.js teaching game for distributed config service
// consensus (curriculum/17_distributed_config_service).
//
// Mechanic: each write orb must pass through a Raft-style quorum of three
// sentinel nodes before it commits to the central CONFIG MONOLITH; on commit,
// NOTIFY particles fan out to authorized WATCHER DRONES inside a bounded
// latency budget; the player rejects unauthorized (ACL trap) and partitioned
// (no-quorum trap) writes with X. Two stacked HUD bars — consensus_p95_ms and
// watch_notify_p95_ms — make the catalog's comparison question visible.
//
// Inputs:
//   Z — PROPOSE/COMMIT the targeted write (positive action)
//   X — REJECT     the targeted write (defensive action)
//   SPACE — start wave / play again after evidence
//
// The pure quorum rules live in src/game/quorum.ts (shared with the unit
// tests). This file owns the renderer, scene graph, and HUD.

import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  REVISION,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three"
import { buildEvidence, type EvidenceRecord, emitEvidence } from "./game/evidence"
import {
  applyCommit,
  applyReject,
  freshCluster,
  freshMetrics,
  type Metrics,
  reject,
  tryCommit,
  WAVE_ORBS,
  WAVE_PARTITION_EVENTS,
  WAVE_TARGET_COMMITS,
  WAVE_WATCHERS_SUBSCRIBED,
  type WriteOrb,
} from "./game/quorum"
import "./styles.css"

type Phase = "ready" | "playing" | "evidence"

type GameState = {
  phase: Phase
  orbIndex: number
  metrics: Metrics
  lastRecord: EvidenceRecord | null
  committedVersion: number
  notifyPulses: number
}

function initialState(): GameState {
  return {
    phase: "ready",
    orbIndex: 0,
    metrics: freshMetrics(),
    lastRecord: null,
    committedVersion: 0,
    notifyPulses: 0,
  }
}

// --- DOM scaffolding ---------------------------------------------------------

const app = document.getElementById("app")
if (!app) {
  throw new Error("#app root not found")
}

const sceneHost = document.createElement("div")
sceneHost.className = "scene-host"
app.appendChild(sceneHost)

const hud = document.createElement("div")
hud.className = "hud"
app.appendChild(hud)

const waveBanner = document.createElement("div")
waveBanner.className = "wave-banner"
hud.appendChild(waveBanner)

const orbPanel = document.createElement("div")
orbPanel.className = "orb-panel"
hud.appendChild(orbPanel)

const metricsPanel = document.createElement("div")
metricsPanel.className = "metrics-panel"
hud.appendChild(metricsPanel)

const barHost = document.createElement("div")
barHost.className = "bar-host"
hud.appendChild(barHost)

const consensusBar = makeBar(barHost, "consensus_p95_ms", "#ffb347")
const notifyBar = makeBar(barHost, "watch_notify_p95_ms", "#6bf0ad")

const controlsHint = document.createElement("div")
controlsHint.className = "controls-hint"
controlsHint.textContent = "Z commit · X reject · SPACE start/replay"
hud.appendChild(controlsHint)

const resultBanner = document.createElement("div")
resultBanner.className = "result-banner"
resultBanner.setAttribute("data-state", "idle")
resultBanner.textContent = "Press SPACE to begin the wave"
hud.appendChild(resultBanner)

function makeBar(
  parent: HTMLElement,
  label: string,
  color: string,
): { fill: HTMLDivElement; label: HTMLDivElement } {
  const row = document.createElement("div")
  row.className = "bar-row"
  const lbl = document.createElement("div")
  lbl.className = "bar-label"
  lbl.textContent = label
  const track = document.createElement("div")
  track.className = "bar-track"
  const fill = document.createElement("div")
  fill.className = "bar-fill"
  fill.style.background = color
  track.appendChild(fill)
  row.appendChild(lbl)
  row.appendChild(track)
  parent.appendChild(row)
  return { fill, label: lbl }
}

// --- three.js scene graph ----------------------------------------------------

const scene = new Scene()
scene.background = new Color(0x05060a)

const camera = new PerspectiveCamera(50, 1, 0.1, 200)
camera.position.set(0, 9, 16)
camera.lookAt(new Vector3(0, 1.5, 0))

const renderer = new WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
sceneHost.appendChild(renderer.domElement)

function resize(): void {
  const width = sceneHost.clientWidth || window.innerWidth
  const height = sceneHost.clientHeight || window.innerHeight
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}
window.addEventListener("resize", resize)
resize()

// Lighting.
scene.add(new AmbientLight(0x404a6b, 1.0))
const keyLight = new DirectionalLight(0xfff0d0, 1.0)
keyLight.position.set(6, 12, 8)
scene.add(keyLight)
const monolithLight = new PointLight(0x6cf0ff, 1.4, 24, 1.5)
monolithLight.position.set(0, 3, 0)
scene.add(monolithLight)

// Grid floor.
const grid = new Mesh(new PlaneGeometry(60, 60), new MeshBasicMaterial({ color: 0x0e1426 }))
grid.rotation.x = -Math.PI / 2
scene.add(grid)
const gridLines = new Mesh(
  new RingGeometry(0, 30, 64),
  new MeshBasicMaterial({ color: 0x1a2540, side: DoubleSide, transparent: true, opacity: 0.4 }),
)
gridLines.rotation.x = -Math.PI / 2
gridLines.position.y = 0.01
scene.add(gridLines)

// Star backdrop.
{
  const starCount = 600
  const positions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i += 1) {
    const r = 60 + Math.random() * 20
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(Math.random() * 2 - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 2
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geom = new BufferGeometry()
  geom.setAttribute("position", new BufferAttribute(positions, 3))
  const mat = new PointsMaterial({ color: 0x9fb4d8, size: 0.35, sizeAttenuation: true })
  const starPoints = new Points(geom, mat)
  scene.add(starPoints)
}

// --- Concept actors ---------------------------------------------------------

// CONFIG MONOLITH — central glowing crystal that holds the current value +
// version. Updates on commit.
const monolithGroup = new Group()
scene.add(monolithGroup)
const monolithCore = new Mesh(
  new BoxGeometry(1.6, 4, 1.6),
  new MeshStandardMaterial({
    color: 0x123b4a,
    emissive: 0x18d3ff,
    emissiveIntensity: 0.65,
    metalness: 0.4,
    roughness: 0.25,
  }),
)
monolithCore.position.y = 2
monolithGroup.add(monolithCore)

const monolithCap = new Mesh(
  new BoxGeometry(2.2, 0.3, 2.2),
  new MeshStandardMaterial({ color: 0x0a1a26, emissive: 0x18d3ff, emissiveIntensity: 0.35 }),
)
monolithCap.position.y = 4.2
monolithGroup.add(monolithCap)

// SENTINELS — three nodes in a ring at radius 5. leaderId 0 carries the halo.
type SentinelView = {
  group: Group
  body: Mesh
  halo: Mesh
  ackRing: Mesh
  ackRingMat: MeshBasicMaterial
}
const SENTINEL_RADIUS = 5
const sentinelAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]
const sentinelViews: SentinelView[] = sentinelAngles.map((angle, idx) => {
  const group = new Group()
  const x = Math.cos(angle) * SENTINEL_RADIUS
  const z = Math.sin(angle) * SENTINEL_RADIUS
  group.position.set(x, 1.4, z)
  const body = new Mesh(
    new OctahedronGeometry(0.95, 0),
    new MeshStandardMaterial({
      color: 0x223054,
      emissive: 0x4b6bff,
      emissiveIntensity: 0.4,
      metalness: 0.5,
      roughness: 0.4,
    }),
  )
  group.add(body)
  const halo = new Mesh(
    new TorusGeometry(1.2, 0.06, 8, 32),
    new MeshBasicMaterial({ color: idx === 0 ? 0xffd35a : 0x223054 }),
  )
  halo.rotation.x = Math.PI / 2
  halo.position.y = -0.6
  group.add(halo)
  const ackRingMat = new MeshBasicMaterial({
    color: 0x6bf0ad,
    transparent: true,
    opacity: 0,
    side: DoubleSide,
  })
  const ackRing = new Mesh(new TorusGeometry(1.4, 0.08, 8, 32), ackRingMat)
  ackRing.rotation.x = Math.PI / 2
  ackRing.position.y = -0.6
  group.add(ackRing)
  scene.add(group)
  return { group, body, halo, ackRing, ackRingMat }
})

// WATCHER DRONES — three authorized subscribers orbiting at radius 8.
type WatcherView = {
  group: Group
  body: Mesh
  bodyMat: MeshStandardMaterial
  angle: number
}
const watcherViews: WatcherView[] = []
for (let i = 0; i < WAVE_WATCHERS_SUBSCRIBED; i += 1) {
  const group = new Group()
  const bodyMat = new MeshStandardMaterial({
    color: 0x0d2b25,
    emissive: 0x103a30,
    emissiveIntensity: 0.6,
    metalness: 0.3,
    roughness: 0.6,
  })
  const body = new Mesh(new SphereGeometry(0.55, 18, 18), bodyMat)
  body.position.y = 1.4
  group.add(body)
  scene.add(group)
  watcherViews.push({ group, body, bodyMat, angle: (i / WAVE_WATCHERS_SUBSCRIBED) * Math.PI * 2 })
}

// PARTITION WALL — translucent glass slab, shown only when the current orb
// is partitioned. Sits between the leader and one follower.
const partitionWall = new Mesh(
  new BoxGeometry(7, 5, 0.2),
  new MeshBasicMaterial({
    color: 0xff5470,
    transparent: true,
    opacity: 0.22,
    side: DoubleSide,
  }),
)
partitionWall.position.set(0, 2.5, 0)
partitionWall.visible = false
scene.add(partitionWall)

// HISTORY STACK — vertical stack of dim past versions behind the monolith.
const historyGroup = new Group()
historyGroup.position.set(-3.5, 0, -3.5)
scene.add(historyGroup)
const historyGlyphs: Mesh[] = []
function pushHistoryGlyph(version: number, value: string): void {
  const mat = new MeshStandardMaterial({
    color: 0x1a2540,
    emissive: 0x6bf0ff,
    emissiveIntensity: 0.18,
    metalness: 0.2,
    roughness: 0.7,
  })
  const glyph = new Mesh(new BoxGeometry(0.8, 0.3, 0.8), mat)
  glyph.position.y = 0.4 + historyGlyphs.length * 0.4
  glyph.userData["version"] = version
  glyph.userData["value"] = value
  historyGroup.add(glyph)
  historyGlyphs.push(glyph)
}

// CURRENT ORB — the write under evaluation, hovering between leader and monolith.
const orbGroup = new Group()
scene.add(orbGroup)
const orbBody = new Mesh(
  new BoxGeometry(0.7, 0.7, 0.7),
  new MeshStandardMaterial({
    color: 0x2b3a78,
    emissive: 0x6bf0ff,
    emissiveIntensity: 0.55,
    metalness: 0.3,
    roughness: 0.3,
  }),
)
orbGroup.add(orbBody)
const orbTether = new Mesh(
  new CylinderGeometry(0.04, 0.04, 1, 8),
  new MeshBasicMaterial({ color: 0x6bf0ff, transparent: true, opacity: 0.45 }),
)
orbTether.position.y = 0.5
orbGroup.add(orbTether)
orbGroup.visible = false

// NOTIFY PARTICLES — pool of small spheres that fly from the monolith to each
// authorized watcher drone on commit. Reused per burst.
type Particle = { mesh: Mesh; from: Vector3; to: Vector3; t: number; duration: number }
const particlePool: Particle[] = []
const particleMat = new MeshBasicMaterial({ color: 0x9bf7c9 })
for (let i = 0; i < WAVE_WATCHERS_SUBSCRIBED * 6; i += 1) {
  const mesh = new Mesh(new SphereGeometry(0.18, 8, 8), particleMat)
  mesh.visible = false
  scene.add(mesh)
  particlePool.push({
    mesh,
    from: new Vector3(),
    to: new Vector3(),
    t: 0,
    duration: 0.5,
  })
}
let activeParticleCount = 0

function spawnNotifyBurst(): void {
  const from = new Vector3(0, 2.5, 0)
  for (let i = 0; i < WAVE_WATCHERS_SUBSCRIBED; i += 1) {
    const slot = particlePool[(activeParticleCount + i) % particlePool.length]
    if (!slot) continue
    slot.mesh.visible = true
    slot.from.copy(from)
    watcherViews[i]?.group.getWorldPosition(slot.to)
    slot.t = 0
    slot.duration = 0.5
  }
  activeParticleCount += WAVE_WATCHERS_SUBSCRIBED
  state.notifyPulses += 1
  // Light up each drone.
  for (const view of watcherViews) {
    view.bodyMat.emissive.setHex(0x6bf0ad)
    view.bodyMat.emissiveIntensity = 1.2
  }
}

// --- Game state + stepping --------------------------------------------------

const state = initialState()

function currentOrb(): WriteOrb | null {
  if (state.phase !== "playing") return null
  return WAVE_ORBS[state.orbIndex] ?? null
}

function beginWave(): void {
  if (state.phase === "playing") return
  state.phase = "playing"
  state.orbIndex = 0
  state.metrics = freshMetrics()
  state.lastRecord = null
  state.committedVersion = 0
  state.notifyPulses = 0
  historyGlyphs.length = 0
  for (const glyph of historyGroup.children.slice()) {
    historyGroup.remove(glyph)
  }
  resultBanner.setAttribute("data-state", "idle")
  resultBanner.textContent = "Wave in progress"
  syncOrbVisual()
}

function syncOrbVisual(): void {
  const orb = currentOrb()
  if (!orb) {
    orbGroup.visible = false
    partitionWall.visible = false
    return
  }
  orbGroup.visible = true
  // Park the orb just outside the monolith, between it and the leader sentinel.
  const leader = sentinelViews[0]?.group.position ?? new Vector3(5, 1.4, 0)
  orbGroup.position.set(leader.x * 0.55, 1.7, leader.z * 0.55)
  partitionWall.visible = orb.partitioned
  // Recolor: red for ACL trap, amber for partition trap, cyan for healthy.
  const orbMat = orbBody.material as MeshStandardMaterial
  if (!orb.authorized) {
    orbMat.emissive.setHex(0xff4060)
    orbMat.color.setHex(0x401020)
  } else if (orb.partitioned) {
    orbMat.emissive.setHex(0xffb347)
    orbMat.color.setHex(0x352010)
  } else {
    orbMat.emissive.setHex(0x6bf0ff)
    orbMat.color.setHex(0x2b3a78)
  }
}

function advanceOrb(): void {
  state.orbIndex += 1
  if (state.orbIndex >= WAVE_ORBS.length) {
    finishWave()
  } else {
    syncOrbVisual()
  }
  renderHud()
}

function handleCommit(): void {
  if (state.phase !== "playing") return
  const orb = currentOrb()
  if (!orb) return
  const cluster = freshCluster()
  const result = tryCommit(orb, cluster)
  state.metrics = applyCommit(state.metrics, result)
  if (result.kind === "commit") {
    // Visual commit: tick the monolith, push a history glyph, fan out notify.
    state.committedVersion = orb.version
    ;(monolithCore.material as MeshStandardMaterial).emissive.setHex(0x9bf7c9)
    pushHistoryGlyph(orb.version, orb.value)
    spawnNotifyBurst()
  } else if (result.kind === "no-quorum") {
    ;(monolithCore.material as MeshStandardMaterial).emissive.setHex(0xff5470)
  } else if (result.kind === "acl-leak") {
    ;(monolithCore.material as MeshStandardMaterial).emissive.setHex(0xff5470)
  }
  advanceOrb()
}

function handleReject(): void {
  if (state.phase !== "playing") return
  const orb = currentOrb()
  if (!orb) return
  const result = reject(orb)
  state.metrics = applyReject(state.metrics, result)
  advanceOrb()
}

function finishWave(): void {
  const record = buildEvidence(state.metrics, WAVE_TARGET_COMMITS, new Date())
  emitEvidence(record)
  state.lastRecord = record
  state.phase = "evidence"
  orbGroup.visible = false
  partitionWall.visible = false
  resultBanner.setAttribute("data-state", record.pass ? "pass" : "fail")
  resultBanner.textContent = record.pass
    ? "WAVE CLEAR — evidence emitted (PASS)"
    : `WAVE FAILED — ${record.gates
        .filter((g) => !g.passed)
        .map((g) => g.name)
        .join(", ")}`
}

// --- HUD rendering ----------------------------------------------------------

function renderHud(): void {
  waveBanner.textContent =
    state.phase === "ready"
      ? `WAVE 1 — ${WAVE_ORBS.length} writes · 1 unauthorized (ACL) · 1 partition · ${WAVE_WATCHERS_SUBSCRIBED} watchers · budget 350 ms`
      : state.phase === "playing"
        ? `WAVE 1 — write ${state.orbIndex + 1} / ${WAVE_ORBS.length}`
        : `WAVE 1 — clear (${state.lastRecord?.pass ? "PASS" : "FAIL"})`

  const orb = currentOrb()
  orbPanel.innerHTML = ""
  if (orb) {
    const tags: string[] = []
    if (!orb.authorized) tags.push("UNAUTHORIZED (ACL)")
    if (orb.partitioned) tags.push("PARTITION (no quorum)")
    if (orb.authorized && !orb.partitioned) tags.push("authorized · quorum reachable")
    orbPanel.innerHTML = `<div class="orb-value">value: ${escapeHtml(orb.value)}</div><div class="orb-tags">${tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>`
  } else if (state.phase === "evidence") {
    orbPanel.innerHTML = `<div class="orb-value">evidence schema=${state.lastRecord?.schema ?? "?"}</div>`
  } else {
    orbPanel.innerHTML = `<div class="orb-value">press SPACE to begin</div>`
  }

  const m = state.metrics
  metricsPanel.innerHTML = `
    <div class="metric"><span>proposed</span><b>${m.writes_proposed}</b></div>
    <div class="metric"><span>committed (quorum)</span><b>${m.writes_committed_quorum}</b></div>
    <div class="metric"><span>rejected ACL</span><b>${m.writes_rejected_acl}</b></div>
    <div class="metric"><span>rejected partition</span><b>${m.writes_rejected_partition} / ${WAVE_PARTITION_EVENTS}</b></div>
    <div class="metric"><span>split-brain</span><b>${m.writes_committed_no_quorum}</b></div>
    <div class="metric"><span>acl leaked</span><b>${m.acl_leaked}</b></div>
    <div class="metric"><span>watchers notified</span><b>${m.watchers_notified_in_budget} / ${WAVE_WATCHERS_SUBSCRIBED * WAVE_TARGET_COMMITS}</b></div>
    <div class="metric"><span>fresh reads</span><b>${m.fresh_reads_served}</b></div>
    <div class="metric"><span>stale reads</span><b>${m.stale_reads_served}</b></div>
    <div class="metric"><span>monolith damage</span><b>${m.monolith_damage}</b></div>
  `

  consensusBar.fill.style.width = "100%"
  consensusBar.label.textContent = `consensus_p95_ms = ${m.consensus_p95_ms}`
  notifyBar.fill.style.width = `${(m.watch_notify_p95_ms / m.consensus_p95_ms) * 100}%`
  notifyBar.label.textContent = `watch_notify_p95_ms = ${m.watch_notify_p95_ms}`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;"
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case '"':
        return "&quot;"
      default:
        return c
    }
  })
}

// --- Animation loop ---------------------------------------------------------

function animate(): void {
  requestAnimationFrame(animate)
  const t = performance.now() / 1000
  // Gentle monolith bob.
  monolithGroup.position.y = Math.sin(t * 1.2) * 0.08
  // Sentinels rotate; ack rings pulse when notify is in flight.
  for (let i = 0; i < sentinelViews.length; i += 1) {
    const view = sentinelViews[i]
    if (!view) continue
    view.body.rotation.y = t * 0.5 + i
    view.body.rotation.x = Math.sin(t * 0.7 + i) * 0.2
    if (state.notifyPulses > 0) {
      view.ackRingMat.opacity = 0.5 + Math.sin(t * 6) * 0.3
    } else {
      view.ackRingMat.opacity = 0
    }
  }
  // Watcher drones orbit at constant angular speed; emissive fades each frame.
  for (let i = 0; i < watcherViews.length; i += 1) {
    const view = watcherViews[i]
    if (!view) continue
    view.angle += 0.004
    view.group.position.set(
      Math.cos(view.angle) * 8,
      0.5 + Math.sin(t * 0.7 + i) * 0.2,
      Math.sin(view.angle) * 8,
    )
    view.bodyMat.emissiveIntensity = Math.max(0.4, view.bodyMat.emissiveIntensity * 0.95)
  }
  // Notify particles fly monolith → drone, then disappear.
  for (const p of particlePool) {
    if (!p.mesh.visible) continue
    p.t += 0.04
    if (p.t >= p.duration) {
      p.mesh.visible = false
      continue
    }
    const k = p.t / p.duration
    p.mesh.position.lerpVectors(p.from, p.to, k)
    p.mesh.position.y += Math.sin(k * Math.PI) * 1.2
  }
  // Current orb floats.
  if (orbGroup.visible) {
    orbGroup.position.y = 1.7 + Math.sin(t * 3) * 0.1
    orbBody.rotation.y = t * 1.4
  }
  renderer.render(scene, camera)
}

// --- Input wiring -----------------------------------------------------------

function isTextInputTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
  )
}

window.addEventListener("keydown", (event) => {
  if (isTextInputTarget(event.target)) return
  const key = event.key.toLowerCase()
  if (key === " " || event.code === "Space") {
    event.preventDefault()
    if (state.phase === "ready" || state.phase === "evidence") {
      beginWave()
      renderHud()
    }
    return
  }
  if (state.phase !== "playing") return
  if (key === "z") {
    handleCommit()
  } else if (key === "x") {
    handleReject()
  }
})

// Initial paint.
renderHud()
animate()

// Surface the runtime state for the smoke harness (read-only convenience —
// never used for mastery, which the verifier owns).
declare global {
  interface Window {
    __quorumDebug?: {
      getState: () => GameState
      beginWave: () => void
      handleCommit: () => void
      handleReject: () => void
    }
    __threeRevision?: string
  }
}
window.__quorumDebug = {
  getState: () => state,
  beginWave,
  handleCommit,
  handleReject,
}
window.__threeRevision = REVISION
