// Posting Lattice — three.js teaching game for full-text search
// (curriculum/18_search_engine).
//
// Mechanic: a wave of 5 query orbs floats in over a fixed 5-document corpus
// arranged as glowing tomes. Each query orb carries a query (single term,
// quoted phrase, or boolean expression with AND/OR/NOT/parentheses) and a
// target document. The player classifies each orb:
//   Z — MATCH    (asserts "the query retrieves the target doc")
//   X — REJECT   (asserts "the query does NOT retrieve the target doc")
// Two orbs are traps where the surface form suggests a match but the inverted
// index disagrees (OR over a doc with neither term; NOT excluding a doc that
// contains the negated term). The win state fires when all 5 are classified
// correctly, emitting the EVIDENCE record.
//
// The retrieval logic (tokenizer, inverted index, parser, evaluator, BM25,
// metrics, gates) lives in src/game/search.ts; the evidence emitter in
// src/game/evidence.ts. This file owns the renderer, scene graph, and HUD.
//
// Inputs:
//   Z — MATCH the targeted query orb against the target document
//   X — REJECT the targeted query orb
//   SPACE — start wave / play again after evidence

import {
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
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
  applyOutcome,
  buildIndex,
  CORPUS,
  classifyMatch,
  classifyReject,
  documentFrequency,
  freshMetrics,
  type Metrics,
  type QueryOrb,
  WAVE_ORB_COUNT,
  WAVE_ORBS,
} from "./game/search"
import "./styles.css"

type Phase = "ready" | "playing" | "evidence"

type GameState = {
  phase: Phase
  orbIndex: number
  metrics: Metrics
  lastRecord: EvidenceRecord | null
  lastOutcome: "match-correct" | "match-wrong" | "reject-correct" | "reject-wrong" | null
  outcomeFlashUntil: number
}

const index = buildIndex(CORPUS)

function initialState(): GameState {
  return {
    phase: "ready",
    orbIndex: 0,
    metrics: freshMetrics(index),
    lastRecord: null,
    lastOutcome: null,
    outcomeFlashUntil: 0,
  }
}

// --- DOM scaffolding --------------------------------------------------------

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

const corpusPanel = document.createElement("div")
corpusPanel.className = "corpus-panel"
hud.appendChild(corpusPanel)

const barHost = document.createElement("div")
barHost.className = "bar-host"
hud.appendChild(barHost)

const lookupBar = makeBar(barHost, "index_lookup_p95_ms", "#6bf0ff")
const parseBar = makeBar(barHost, "parse_p95_ms", "#ffb347")

const controlsHint = document.createElement("div")
controlsHint.className = "controls-hint"
controlsHint.textContent = "Z match · X reject · SPACE start/replay"
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

// --- three.js scene graph ---------------------------------------------------

const scene = new Scene()
scene.background = new Color(0x05060a)

const camera = new PerspectiveCamera(50, 1, 0.1, 200)
camera.position.set(0, 7.5, 14)
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
const lexiconLight = new PointLight(0x6cf0ff, 1.6, 22, 1.5)
lexiconLight.position.set(0, 4, 0)
scene.add(lexiconLight)

// Grid floor.
const grid = new Mesh(new PlaneGeometry(60, 60), new MeshBasicMaterial({ color: 0x0e1426 }))
grid.rotation.x = -Math.PI / 2
scene.add(grid)
const gridRing = new Mesh(
  new RingGeometry(0, 30, 64),
  new MeshBasicMaterial({ color: 0x1a2540, side: DoubleSide, transparent: true, opacity: 0.4 }),
)
gridRing.rotation.x = -Math.PI / 2
gridRing.position.y = 0.01
scene.add(gridRing)

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

// --- Concept actors --------------------------------------------------------

// CORPUS TOMES — five glowing tablets arranged in an arc at radius 6.
type TomeView = {
  group: Group
  body: Mesh
  bodyMat: MeshStandardMaterial
  halo: Mesh
  haloMat: MeshBasicMaterial
  basePos: Vector3
}
const TOME_RADIUS = 6
const tomeViews: TomeView[] = CORPUS.map((_doc, idx) => {
  const group = new Group()
  // Spread the 5 tomes across an arc facing the camera.
  const angle = (idx - (CORPUS.length - 1) / 2) * 0.62
  const x = Math.sin(angle) * TOME_RADIUS
  const z = -Math.cos(angle) * TOME_RADIUS + 1.5
  group.position.set(x, 1.4, z)
  const bodyMat = new MeshStandardMaterial({
    color: 0x102540,
    emissive: 0x4b6bff,
    emissiveIntensity: 0.35,
    metalness: 0.45,
    roughness: 0.35,
  })
  const body = new Mesh(new BoxGeometry(1.4, 2.2, 0.4), bodyMat)
  group.add(body)
  const haloMat = new MeshBasicMaterial({
    color: 0x2a3a6a,
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  })
  const halo = new Mesh(new TorusGeometry(1.05, 0.06, 8, 32), haloMat)
  halo.rotation.x = Math.PI / 2
  halo.position.y = -1.2
  group.add(halo)
  scene.add(group)
  return { group, body, bodyMat, halo, haloMat, basePos: new Vector3(x, 1.4, z) }
})

// LEXICON CRYSTAL — central inverted-index node, a tall faceted octahedron.
const lexiconGroup = new Group()
lexiconGroup.position.set(0, 3, 0)
scene.add(lexiconGroup)
const lexiconCore = new Mesh(
  new OctahedronGeometry(1.4, 0),
  new MeshStandardMaterial({
    color: 0x0a2238,
    emissive: 0x6cf0ff,
    emissiveIntensity: 0.75,
    metalness: 0.6,
    roughness: 0.2,
  }),
)
lexiconGroup.add(lexiconCore)
const lexiconCrown = new Mesh(
  new TorusGeometry(1.7, 0.04, 8, 48),
  new MeshBasicMaterial({ color: 0x6cf0ff, transparent: true, opacity: 0.7 }),
)
lexiconCrown.rotation.x = Math.PI / 2
lexiconCrown.position.y = 0
lexiconGroup.add(lexiconCrown)

// Vertical "term column" decorations around the lexicon — to evoke a
// posting-list forest. Purely cosmetic.
const TERM_COLUMN_COUNT = 8
const termColumns: Mesh[] = []
for (let i = 0; i < TERM_COLUMN_COUNT; i += 1) {
  const angle = (i / TERM_COLUMN_COUNT) * Math.PI * 2
  const r = 2.4
  const mat = new MeshStandardMaterial({
    color: 0x10284a,
    emissive: 0x4b8bff,
    emissiveIntensity: 0.25,
    metalness: 0.4,
    roughness: 0.5,
  })
  const col = new Mesh(new BoxGeometry(0.12, 2.4, 0.12), mat)
  col.position.set(Math.cos(angle) * r, 3, Math.sin(angle) * r)
  scene.add(col)
  termColumns.push(col)
}

// QUERY ORB — the current evaluation, hovering between lexicon and target.
const orbGroup = new Group()
scene.add(orbGroup)
const orbBody = new Mesh(
  new SphereGeometry(0.55, 24, 24),
  new MeshStandardMaterial({
    color: 0x2b3a78,
    emissive: 0x6bf0ff,
    emissiveIntensity: 0.55,
    metalness: 0.3,
    roughness: 0.3,
  }),
)
orbGroup.add(orbBody)
const orbRing = new Mesh(
  new TorusGeometry(0.85, 0.05, 8, 32),
  new MeshBasicMaterial({ color: 0x6bf0ff, transparent: true, opacity: 0.6 }),
)
orbGroup.add(orbRing)
orbGroup.visible = false

// TETHER BEAM — a stretched box that connects the query orb to the target
// tome; recolored per outcome (green = correct, red = wrong).
const tether = new Mesh(
  new BoxGeometry(0.08, 1, 0.08),
  new MeshBasicMaterial({ color: 0x6bf0ff, transparent: true, opacity: 0 }),
)
scene.add(tether)

// MATCH BEAM PARTICLES — small spheres that fly along the tether from orb to
// target on a MATCH-correct action, simulating postings lookup.
type Particle = { mesh: Mesh; from: Vector3; to: Vector3; t: number; duration: number }
const particlePool: Particle[] = []
const particleMat = new MeshBasicMaterial({ color: 0x9bf7c9 })
for (let i = 0; i < 16; i += 1) {
  const mesh = new Mesh(new SphereGeometry(0.16, 8, 8), particleMat)
  mesh.visible = false
  scene.add(mesh)
  particlePool.push({ mesh, from: new Vector3(), to: new Vector3(), t: 0, duration: 0.6 })
}
let activeParticleCount = 0

function spawnMatchBurst(from: Vector3, to: Vector3): void {
  for (let i = 0; i < 6; i += 1) {
    const slot = particlePool[(activeParticleCount + i) % particlePool.length]
    if (!slot) continue
    slot.mesh.visible = true
    slot.from.copy(from)
    slot.to.copy(to)
    slot.t = (i * 0.05) % 0.3
    slot.duration = 0.55
  }
  activeParticleCount += 6
}

// --- Game state + stepping -------------------------------------------------

const state = initialState()

function currentOrb(): QueryOrb | null {
  if (state.phase !== "playing") return null
  return WAVE_ORBS[state.orbIndex] ?? null
}

function targetTomeView(orb: QueryOrb | null): TomeView | null {
  if (!orb) return null
  const idx = CORPUS.findIndex((d) => d.id === orb.targetDocId)
  if (idx < 0) return null
  return tomeViews[idx] ?? null
}

function beginWave(): void {
  if (state.phase === "playing") return
  state.phase = "playing"
  state.orbIndex = 0
  state.metrics = freshMetrics(index)
  state.lastRecord = null
  state.lastOutcome = null
  state.outcomeFlashUntil = 0
  resultBanner.setAttribute("data-state", "idle")
  resultBanner.textContent = "Wave in progress"
  syncOrbVisual()
}

function syncOrbVisual(): void {
  const orb = currentOrb()
  if (!orb) {
    orbGroup.visible = false
    ;(tether.material as MeshBasicMaterial).opacity = 0
    for (const view of tomeViews) {
      view.haloMat.color.setHex(0x2a3a6a)
      view.haloMat.opacity = 0.5
    }
    return
  }
  orbGroup.visible = true
  // Park the orb above and in front of the lexicon crystal.
  orbGroup.position.set(0, 4.4, 1.6)
  // Recolor orb cyan.
  const orbMat = orbBody.material as MeshStandardMaterial
  orbMat.emissive.setHex(0x6bf0ff)
  orbMat.color.setHex(0x2b3a78)
  // Highlight the target tome.
  const target = targetTomeView(orb)
  for (const view of tomeViews) {
    if (view === target) {
      view.haloMat.color.setHex(0xffb347)
      view.haloMat.opacity = 0.95
      view.bodyMat.emissive.setHex(0xffb347)
      view.bodyMat.emissiveIntensity = 0.55
    } else {
      view.haloMat.color.setHex(0x2a3a6a)
      view.haloMat.opacity = 0.5
      view.bodyMat.emissive.setHex(0x4b6bff)
      view.bodyMat.emissiveIntensity = 0.35
    }
  }
  // Reset tether to invisible (set on action).
  ;(tether.material as MeshBasicMaterial).opacity = 0
}

function advanceOrb(): void {
  state.orbIndex += 1
  if (state.orbIndex >= WAVE_ORB_COUNT) {
    finishWave()
  } else {
    syncOrbVisual()
  }
  renderHud()
}

// Player pressed Z (MATCH) or X (REJECT). Classification routes through the
// canonical search module so the renderer never decides correctness on its
// own — every action is anchored in the same inverted index the unit tests
// cover.
function handleAction(kind: "match" | "reject"): void {
  if (state.phase !== "playing") return
  const orb = currentOrb()
  if (!orb) return
  const result = kind === "match" ? classifyMatch(orb, index) : classifyReject(orb, index)
  state.metrics = applyOutcome(state.metrics, result)
  state.lastOutcome = result.kind
  state.outcomeFlashUntil = performance.now() / 1000 + 0.7

  // Visual: light up tether between orb and target tome; recolor by outcome.
  const target = targetTomeView(orb)
  const isCorrect = result.kind === "match-correct" || result.kind === "reject-correct"
  if (target) {
    const from = orbGroup.position.clone()
    const to = target.group.position.clone()
    tether.position.copy(from).lerp(to, 0.5)
    tether.scale.set(1, from.distanceTo(to), 1)
    tether.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), to.clone().sub(from).normalize())
    const tetherMat = tether.material as MeshBasicMaterial
    tetherMat.color.setHex(isCorrect ? 0x6bf0ad : 0xff5470)
    tetherMat.opacity = 0.85
    if (kind === "match" && result.kind === "match-correct") {
      spawnMatchBurst(from, to)
      target.bodyMat.emissive.setHex(0x6bf0ad)
      target.bodyMat.emissiveIntensity = 1.0
    } else if (kind === "match") {
      target.bodyMat.emissive.setHex(0xff5470)
      target.bodyMat.emissiveIntensity = 1.0
    } else {
      target.haloMat.color.setHex(isCorrect ? 0x6bf0ad : 0xff5470)
    }
  }
  const orbMat = orbBody.material as MeshStandardMaterial
  orbMat.emissive.setHex(isCorrect ? 0x6bf0ad : 0xff5470)

  advanceOrb()
}

function finishWave(): void {
  const record = buildEvidence(state.metrics, new Date())
  emitEvidence(record)
  state.lastRecord = record
  state.phase = "evidence"
  orbGroup.visible = false
  ;(tether.material as MeshBasicMaterial).opacity = 0
  resultBanner.setAttribute("data-state", record.pass ? "pass" : "fail")
  resultBanner.textContent = record.pass
    ? "WAVE CLEAR — evidence emitted (PASS)"
    : `WAVE FAILED — ${record.gates
        .filter((g) => !g.passed)
        .map((g) => g.name)
        .join(", ")}`
}

// --- HUD rendering ---------------------------------------------------------

function renderHud(): void {
  waveBanner.textContent =
    state.phase === "ready"
      ? `WAVE 1 — ${WAVE_ORB_COUNT} query orbs · 3 matches · 2 traps · ${index.postings.size} indexed terms`
      : state.phase === "playing"
        ? `WAVE 1 — query orb ${state.orbIndex + 1} / ${WAVE_ORB_COUNT}`
        : `WAVE 1 — clear (${state.lastRecord?.pass ? "PASS" : "FAIL"})`

  const orb = currentOrb()
  orbPanel.innerHTML = ""
  if (orb) {
    const targetDoc = CORPUS.find((d) => d.id === orb.targetDocId) ?? null
    orbPanel.innerHTML = `
      <div class="query-line">query: ${escapeHtml(orb.query)}</div>
      <div class="target-line">target: <b>${escapeHtml(orb.targetDocId)}</b>${
        targetDoc ? ` — ${escapeHtml(targetDoc.body)}` : ""
      }</div>
      <div class="exercise-line">exercise: ${escapeHtml(orb.exercise)}</div>
    `
  } else if (state.phase === "evidence") {
    orbPanel.innerHTML = `<div class="query-line">evidence schema=${state.lastRecord?.schema ?? "?"}</div>`
  } else {
    orbPanel.innerHTML = `<div class="query-line">press SPACE to begin</div>`
  }

  corpusPanel.innerHTML = `<div class="corpus-title">Corpus · ${CORPUS.length} docs</div>`
  for (const doc of CORPUS) {
    const isTarget = orb?.targetDocId === doc.id
    const sample = doc.tokens.slice(0, 6).join(" ")
    corpusPanel.innerHTML += `<div class="corpus-doc${isTarget ? " target" : ""}"><b>${escapeHtml(
      doc.id,
    )}</b>${escapeHtml(sample)}${doc.tokens.length > 6 ? "…" : ""}</div>`
  }

  const m = state.metrics
  metricsPanel.innerHTML = `
    <div class="metric"><span>orbs classified</span><b>${m.orbs_classified} / ${WAVE_ORB_COUNT}</b></div>
    <div class="metric"><span>matches correct</span><b>${m.matches_correct}</b></div>
    <div class="metric"><span>matches wrong</span><b>${m.matches_wrong}</b></div>
    <div class="metric"><span>rejects correct</span><b>${m.rejects_correct}</b></div>
    <div class="metric"><span>rejects wrong</span><b>${m.rejects_wrong}</b></div>
    <div class="metric"><span>documents indexed</span><b>${m.documents_indexed}</b></div>
    <div class="metric"><span>terms indexed</span><b>${m.terms_indexed}</b></div>
    <div class="metric"><span>avg doc length</span><b>${m.average_document_length.toFixed(1)}</b></div>
    <div class="metric"><span>bm25 top score</span><b>${m.bm25_top_score.toFixed(2)}</b></div>
    <div class="metric"><span>df(cache)</span><b>${documentFrequency(index, "cache")}</b></div>
  `

  lookupBar.fill.style.width = `${Math.min(100, (m.index_lookup_p95_ms / 60) * 100)}%`
  lookupBar.label.textContent = `index_lookup_p95_ms = ${m.index_lookup_p95_ms}`
  parseBar.fill.style.width = `${Math.min(100, (m.parse_p95_ms / 60) * 100)}%`
  parseBar.label.textContent = `parse_p95_ms = ${m.parse_p95_ms}`
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

// --- Animation loop --------------------------------------------------------

function animate(): void {
  requestAnimationFrame(animate)
  const t = performance.now() / 1000
  // Lexicon crystal slow rotation + bob.
  lexiconGroup.position.y = 3 + Math.sin(t * 1.2) * 0.12
  lexiconCore.rotation.y = t * 0.5
  lexiconCore.rotation.x = Math.sin(t * 0.7) * 0.2
  lexiconCrown.rotation.z = t * 0.4
  // Term columns pulse.
  for (let i = 0; i < termColumns.length; i += 1) {
    const col = termColumns[i]
    if (!col) continue
    ;(col.material as MeshStandardMaterial).emissiveIntensity = 0.2 + Math.sin(t * 2 + i) * 0.1
  }
  // Tomes drift gently around their base; target tome already highlighted.
  for (let i = 0; i < tomeViews.length; i += 1) {
    const view = tomeViews[i]
    if (!view) continue
    view.group.position.x = view.basePos.x + Math.sin(t * 0.4 + i) * 0.06
    view.group.position.y = view.basePos.y + Math.sin(t * 0.6 + i * 0.5) * 0.06
    view.body.rotation.y = Math.sin(t * 0.3 + i) * 0.08
  }
  // Orb floats.
  if (orbGroup.visible) {
    orbGroup.position.y = 4.4 + Math.sin(t * 3) * 0.1
    orbBody.rotation.y = t * 1.4
    orbRing.rotation.x = t * 1.8
    orbRing.rotation.y = t * 1.1
  }
  // Tether fades after the outcome flash window.
  const tetherMat = tether.material as MeshBasicMaterial
  if (t > state.outcomeFlashUntil) {
    tetherMat.opacity = Math.max(0, tetherMat.opacity - 0.03)
  }
  // Postings burst particles.
  for (const p of particlePool) {
    if (!p.mesh.visible) continue
    p.t += 0.025
    if (p.t >= p.duration) {
      p.mesh.visible = false
      continue
    }
    const k = p.t / p.duration
    p.mesh.position.lerpVectors(p.from, p.to, k)
    p.mesh.position.y += Math.sin(k * Math.PI) * 0.8
  }
  renderer.render(scene, camera)
}

// --- Input wiring ----------------------------------------------------------

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
    handleAction("match")
  } else if (key === "x") {
    handleAction("reject")
  }
})

// Initial paint.
renderHud()
animate()

// Surface the runtime state for the smoke harness (read-only convenience —
// never used for mastery, which the verifier owns).
declare global {
  interface Window {
    __postingLatticeDebug?: {
      getState: () => GameState
      beginWave: () => void
      handleAction: (kind: "match" | "reject") => void
    }
    __threeRevision?: string
  }
}

window.__postingLatticeDebug = {
  getState: () => state,
  beginWave,
  handleAction: (kind) => handleAction(kind),
}
window.__threeRevision = REVISION
