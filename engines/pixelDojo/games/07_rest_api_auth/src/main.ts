// 07_rest_api_auth — Aegis Corridor.
//
// A 3D neon corridor the player composes from four separable middleware
// gate-rings (Version, Validation, AuthN, AuthZ) and then watches execute
// against a wave of incoming request orbs. The pure state machine lives in
// game/logic.ts; this file is the three.js renderer + input layer. The
// security-invariant lesson (AuthN before AuthZ; a forged admin claim must
// never reach the handler) is enforced by the logic; the scene makes it
// visible.

import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three"
import { buildEvidence, emitEvidence } from "./game/evidence/emitter"
import {
  CANONICAL_ORDER,
  composeCanonical,
  createState,
  cycleDockSelection,
  GATE_DESCRIPTIONS,
  GATE_LABELS,
  type GameState,
  type GateKind,
  MAX_HEAT,
  type Orb,
  openPortal,
  placeSelected,
  recallLastGate,
  step,
  WAVE_ORBS,
} from "./game/logic"

const CORRIDOR_LENGTH = 24
const CORRIDOR_CENTER_Z = 0
const ENTRY_X = -14
const HANDLER_X = 14

const GATE_COLORS: Record<GateKind, number> = {
  version: 0x38bdf8, // sky
  validation: 0xa78bfa, // violet
  authn: 0xf472b6, // pink
  authz: 0xfbbf24, // amber
}

const TOKEN_TINT: Record<Orb["token"], number> = {
  valid: 0x34d399,
  forged: 0xef4444,
  expired: 0xf97316,
  wrong_audience: 0xfacc15,
  missing: 0x94a3b8,
}

type GateMeshes = {
  group: Group
  ring: Mesh<TorusGeometry, MeshStandardMaterial>
  inner: Mesh<CylinderGeometry, MeshBasicMaterial>
}

type OrbMeshes = {
  group: Group
  body: Mesh<CylinderGeometry, MeshStandardMaterial>
  role: Mesh<BoxGeometry, MeshBasicMaterial>
  trail: Mesh<BoxGeometry, MeshBasicMaterial>
}

type SceneBundle = {
  scene: Scene
  camera: PerspectiveCamera
  corridorSlots: Group[]
  gateRings: Map<GateKind, GateMeshes>
  orbs: Map<number, OrbMeshes>
}

function buildScene(): SceneBundle {
  const scene = new Scene()
  scene.background = new Color(0x05070f)

  const camera = new PerspectiveCamera(50, 1, 0.1, 200)
  camera.position.set(0, 8, 22)
  camera.lookAt(0, 0, 0)

  // Ambient + key light.
  scene.add(new AmbientLight(0x9bb0ff, 0.55))
  const key = new DirectionalLight(0xffffff, 1.0)
  key.position.set(8, 14, 10)
  scene.add(key)
  const rim = new DirectionalLight(0x7c3aed, 0.5)
  rim.position.set(-12, 4, -8)
  scene.add(rim)

  // Floor: dark neon grid.
  const floor = new Mesh(
    new PlaneGeometry(60, 60, 1, 1),
    new MeshStandardMaterial({ color: 0x0b1020, metalness: 0.4, roughness: 0.6 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -3
  scene.add(floor)

  const grid = new Group()
  for (let i = -10; i <= 10; i += 1) {
    const v = i * 1.5
    const lineH = new Mesh(
      new BoxGeometry(0.04, 0.04, 30),
      new MeshBasicMaterial({ color: 0x1e293b }),
    )
    lineH.position.set(v, -2.98, 0)
    grid.add(lineH)
    const lineV = new Mesh(
      new BoxGeometry(30, 0.04, 0.04),
      new MeshBasicMaterial({ color: 0x1e293b }),
    )
    lineV.position.set(0, -2.98, v)
    grid.add(lineV)
  }
  scene.add(grid)

  // Corridor rails along the X axis.
  const railMat = new MeshStandardMaterial({
    color: 0x1e3a8a,
    emissive: 0x1e40af,
    emissiveIntensity: 0.4,
    metalness: 0.7,
    roughness: 0.3,
  })
  for (const sign of [-1, 1]) {
    const rail = new Mesh(new BoxGeometry(CORRIDOR_LENGTH, 0.12, 0.12), railMat)
    rail.position.set(0, -1.4, sign * 3.2)
    scene.add(rail)
  }

  // Entry portal (left) + handler pedestal row (right).
  const portalMat = new MeshBasicMaterial({
    color: 0x22d3ee,
    side: BackSide,
    transparent: true,
    opacity: 0.45,
  })
  const portal = new Mesh(new CylinderGeometry(2.4, 2.4, 0.3, 32, 1, true), portalMat)
  portal.rotation.z = Math.PI / 2
  portal.position.set(ENTRY_X, 0.2, 0)
  scene.add(portal)

  // Handler pedestal.
  const pedestal = new Mesh(
    new CylinderGeometry(1.6, 1.9, 0.6, 24),
    new MeshStandardMaterial({ color: 0x0f766e, emissive: 0x10b981, emissiveIntensity: 0.25 }),
  )
  pedestal.position.set(HANDLER_X, -1.1, 0)
  scene.add(pedestal)
  const crystal = new Mesh(
    new CylinderGeometry(0.6, 0.9, 1.6, 6),
    new MeshStandardMaterial({
      color: 0xccfbf1,
      emissive: 0x14b8a6,
      emissiveIntensity: 0.6,
      metalness: 0.3,
      roughness: 0.2,
    }),
  )
  crystal.position.set(HANDLER_X, 0.2, 0)
  scene.add(crystal)

  // 4 corridor slots — where gate rings get placed (one per gate, canonical
  // order from left to right when correctly composed).
  const corridorSlots: Group[] = []
  for (let i = 0; i < CANONICAL_ORDER.length; i += 1) {
    const t = (i + 0.5) / CANONICAL_ORDER.length
    const x = ENTRY_X + 4 + t * (HANDLER_X - ENTRY_X - 8)
    const slot = new Group()
    slot.position.set(x, CORRIDOR_CENTER_Z, 0)
    // Empty-slot marker: a faint ring outline.
    const ghost = new Mesh(
      new TorusGeometry(2.4, 0.04, 8, 48),
      new MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 }),
    )
    ghost.rotation.y = Math.PI / 2
    slot.add(ghost)
    // Slot index marker above.
    scene.add(slot)
    corridorSlots.push(slot)
  }

  // Build the four gate rings (one per GateKind). Initially parked in a
  // "dock" row at the bottom of the scene; they migrate into slots as the
  // player composes.
  const gateRings = new Map<GateKind, GateMeshes>()
  const dockKinds: GateKind[] = ["authz", "authn", "version", "validation"]
  for (let i = 0; i < dockKinds.length; i += 1) {
    const kind = dockKinds[i]
    if (kind === undefined) continue
    const group = new Group()
    const color = GATE_COLORS[kind]
    const ring = new Mesh(
      new TorusGeometry(2.2, 0.18, 16, 48),
      new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        metalness: 0.4,
        roughness: 0.3,
      }),
    )
    ring.rotation.y = Math.PI / 2
    group.add(ring)
    // Inner scanner disc.
    const inner = new Mesh(
      new CylinderGeometry(1.9, 1.9, 0.04, 32, 1, true),
      new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.18,
        side: BackSide,
      }),
    )
    inner.rotation.z = Math.PI / 2
    group.add(inner)
    // Park in the dock row initially (below the corridor).
    group.position.set(-9 + i * 6, -5.2, 0)
    scene.add(group)
    gateRings.set(kind, { group, ring, inner })
  }

  return { scene, camera, corridorSlots, gateRings, orbs: new Map() }
}

function placeGateInSlot(meshes: GateMeshes, slot: Group, _selected: boolean): void {
  meshes.group.position.copy(slot.position)
}

function parkGateInDock(meshes: GateMeshes, dockIndex: number, selected: boolean): void {
  meshes.group.position.set(-9 + dockIndex * 6, -5.2, 0)
  meshes.group.position.z = selected ? 1.4 : 0
  // Selected gate hovers and brightens.
  meshes.ring.material.emissiveIntensity = selected ? 1.1 : 0.55
}

function spawnOrbMesh(scene: Scene, orb: Orb): OrbMeshes {
  const group = new Group()
  const tint = TOKEN_TINT[orb.token]
  const body = new Mesh(
    new CylinderGeometry(0.5, 0.5, 0.7, 16),
    new MeshStandardMaterial({
      color: tint,
      emissive: tint,
      emissiveIntensity: 0.55,
      metalness: 0.3,
      roughness: 0.4,
    }),
  )
  body.rotation.x = Math.PI / 2
  group.add(body)
  // Role crystal chip on top of the orb.
  const roleColor = orb.role === "admin" ? 0xfbbf24 : orb.role === "user" ? 0x38bdf8 : 0xef4444
  const role = new Mesh(
    new BoxGeometry(0.18, 0.18, 0.18),
    new MeshBasicMaterial({ color: roleColor }),
  )
  role.position.set(0, 0.7, 0)
  group.add(role)
  // Trail (thin box behind the orb).
  const trail = new Mesh(
    new BoxGeometry(0.6, 0.05, 0.4),
    new MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.4 }),
  )
  trail.position.set(-0.4, 0, 0)
  group.add(trail)
  group.position.set(ENTRY_X, 0, 0)
  scene.add(group)
  return { group, body, role, trail }
}

function orbX(orb: Orb): number {
  return ENTRY_X + orb.progress * (HANDLER_X - ENTRY_X)
}

// --- HUD overlay ---------------------------------------------------------

type Hud = {
  root: HTMLDivElement
  objective: HTMLDivElement
  orderStrip: HTMLDivElement
  selected: HTMLDivElement
  status: HTMLDivElement
  wave: HTMLDivElement
  gatesInfo: HTMLDivElement
  controls: HTMLDivElement
}

function buildHud(root: HTMLDivElement): Hud {
  const overlay = document.createElement("div")
  overlay.style.position = "absolute"
  overlay.style.inset = "0"
  overlay.style.pointerEvents = "none"
  overlay.style.fontFamily = '"Courier New", ui-monospace, monospace'
  overlay.style.color = "#e2e8f0"
  overlay.style.fontSize = "13px"
  overlay.style.padding = "12px"

  const objective = document.createElement("div")
  objective.textContent = "AEGIS CORRIDOR — 07_rest_api_auth"
  objective.style.fontWeight = "bold"
  objective.style.fontSize = "18px"
  objective.style.color = "#22d3ee"
  objective.style.letterSpacing = "2px"
  overlay.appendChild(objective)

  const wave = document.createElement("div")
  wave.textContent = "Wave 1"
  wave.style.marginTop = "4px"
  wave.style.color = "#a78bfa"
  overlay.appendChild(wave)

  const orderStrip = document.createElement("div")
  orderStrip.style.marginTop = "10px"
  orderStrip.style.padding = "6px 8px"
  orderStrip.style.background = "rgba(2,6,23,0.65)"
  orderStrip.style.border = "1px solid #1e3a8a"
  orderStrip.style.borderRadius = "4px"
  orderStrip.style.fontSize = "14px"
  orderStrip.style.letterSpacing = "1px"
  overlay.appendChild(orderStrip)

  const selected = document.createElement("div")
  selected.style.marginTop = "6px"
  overlay.appendChild(selected)

  const status = document.createElement("div")
  status.style.marginTop = "8px"
  status.style.minHeight = "20px"
  status.style.fontWeight = "bold"
  overlay.appendChild(status)

  const gatesInfo = document.createElement("div")
  gatesInfo.style.marginTop = "8px"
  gatesInfo.style.fontSize = "11px"
  gatesInfo.style.color = "#94a3b8"
  gatesInfo.style.maxWidth = "460px"
  gatesInfo.style.lineHeight = "1.5"
  overlay.appendChild(gatesInfo)

  const controls = document.createElement("div")
  controls.style.position = "absolute"
  controls.style.bottom = "12px"
  controls.style.left = "12px"
  controls.style.right = "12px"
  controls.style.fontSize = "12px"
  controls.style.color = "#64748b"
  controls.style.lineHeight = "1.5"
  overlay.appendChild(controls)

  root.appendChild(overlay)

  return { root: overlay, objective, orderStrip, selected, status, wave, gatesInfo, controls }
}

function describeControls(state: GameState): string {
  if (state.phase === "compose") {
    return "[<-/->] cycle dock   [UP] push into next slot   [DOWN] recall last   [SPACE] open portal (needs all 4 placed)"
  }
  if (state.phase === "running") {
    return "wave running — orbs traversing the chain. Watch each gate admit (green) or reject (red)."
  }
  return "wave resolved — [R] recompose for another attempt"
}

function describeGate(kind: GateKind): string {
  return `${GATE_LABELS[kind]}: ${GATE_DESCRIPTIONS[kind]}`
}

function renderHud(hud: Hud, state: GameState, selectedKind: GateKind | null): void {
  hud.wave.textContent = `Wave ${state.wave} — phase: ${state.phase.toUpperCase()}`
  if (state.gateOrder.length === 0) {
    hud.orderStrip.textContent = "[ no gates placed — compose the chain ]"
  } else {
    const arrows = state.gateOrder.map((g) => GATE_LABELS[g]).join(" -> ")
    hud.orderStrip.textContent = `${arrows} -> HANDLER`
  }
  if (state.phase === "compose") {
    if (selectedKind === null) {
      hud.selected.textContent = "All four gates placed — press SPACE to open the portal."
    } else {
      hud.selected.textContent = `Dock selected: ${GATE_LABELS[selectedKind]}  (slot ${state.dockSelectedIndex + 1}/${state.dockRemaining.length || 1})`
    }
  } else {
    hud.selected.textContent = ""
  }
  hud.gatesInfo.textContent = CANONICAL_ORDER.map(describeGate).join("  |  ")
  hud.controls.textContent = describeControls(state)

  if (state.phase === "resolved") {
    hud.status.textContent = state.pass
      ? `WAVE CLEAR — canonical chain held. heat_peak=${state.metrics.heat_peak}`
      : `BREACH — chain leaked. reason: ${breachReason(state)}`
    hud.status.style.color = state.pass ? "#34d399" : "#ef4444"
  } else {
    hud.status.textContent = ""
  }
}

function breachReason(state: GameState): string {
  const m = state.metrics
  if (!m.correct_order) {
    return `gate_order != canonical (${m.gate_order.join("->")})`
  }
  if (m.forged_admitted > 0) return `forged_admitted=${m.forged_admitted}`
  if (m.expired_admitted > 0) return `expired_admitted=${m.expired_admitted}`
  if (m.wrong_audience_admitted > 0) return `wrong_audience_admitted=${m.wrong_audience_admitted}`
  if (m.missing_token_admitted > 0) return `missing_token_admitted=${m.missing_token_admitted}`
  if (m.forbidden_reached_handler > 0)
    return `forbidden_reached_handler=${m.forbidden_reached_handler}`
  if (m.malformed_admitted > 0) return `malformed_admitted=${m.malformed_admitted}`
  if (m.wrong_version_admitted > 0) return `wrong_version_admitted=${m.wrong_version_admitted}`
  if (m.legit_rejected > 1) return `legit_rejected=${m.legit_rejected}`
  if (m.overheated) return `heat_peak=${m.heat_peak} >= MAX_HEAT`
  return "unknown"
}

// --- Main ----------------------------------------------------------------

function start(): void {
  const host = document.querySelector<HTMLDivElement>("#app")
  if (host === null) throw new Error("Missing #app root")

  host.style.position = "fixed"
  host.style.inset = "0"
  host.style.background = "#05070f"

  const canvas = document.createElement("canvas")
  canvas.style.display = "block"
  canvas.style.width = "100%"
  canvas.style.height = "100%"
  host.appendChild(canvas)

  const hudRoot = document.createElement("div")
  hudRoot.style.position = "absolute"
  hudRoot.style.inset = "0"
  hudRoot.style.pointerEvents = "none"
  host.appendChild(hudRoot)
  const hud = buildHud(hudRoot)

  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace

  const bundle = buildScene()
  let state = createState(performance.now())

  function resize(): void {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h, false)
    bundle.camera.aspect = w / h
    bundle.camera.updateProjectionMatrix()
  }
  resize()
  window.addEventListener("resize", resize)

  // Keyboard input.
  const keys = new Set<string>()
  window.addEventListener("keydown", (ev) => {
    keys.add(ev.key)
    handleKey(ev.key)
  })
  window.addEventListener("keyup", (ev) => {
    keys.delete(ev.key)
  })

  function handleKey(key: string): void {
    if (state.phase === "compose") {
      if (key === "ArrowLeft") state = cycleDockSelection(state, -1)
      else if (key === "ArrowRight") state = cycleDockSelection(state, 1)
      else if (key === "ArrowUp") state = placeSelected(state)
      else if (key === "ArrowDown") state = recallLastGate(state)
      else if (key === " " || key === "Spacebar") state = openPortal(state, performance.now())
    } else if (state.phase === "resolved") {
      if (key === "r" || key === "R") {
        state = createState(performance.now(), state.wave + 1)
      }
    }
  }

  // Debug surface for the smoke driver.
  window.__aegisDebug = {
    composeCanonical: () => {
      state = composeCanonical(state)
    },
    openPortal: () => {
      state = openPortal(state, performance.now())
    },
    placeSelected: () => {
      state = placeSelected(state)
    },
    recallLastGate: () => {
      state = recallLastGate(state)
    },
    cycleDockSelection: (direction: 1 | -1) => {
      state = cycleDockSelection(state, direction)
    },
    selectedGate: () => state.dockRemaining[state.dockSelectedIndex] ?? null,
    getState: () => state,
  }

  // Track which orbs we have already instantiated as 3D meshes.
  const orbMeshes = new Map<number, OrbMeshes>()

  let last = performance.now()
  let resolvedEmitted = false

  function frame(now: number): void {
    const dt = Math.min(64, now - last)
    last = now

    // Step simulation when running.
    if (state.phase === "running") {
      state = step(state, now, dt)
    }

    // Sync gate positions (compose phase: park in dock or slot; running:
    // placed gates sit in their slots).
    for (const [kind, mesh] of bundle.gateRings.entries()) {
      const slotIndex = state.gateOrder.indexOf(kind)
      if (slotIndex >= 0) {
        const slot = bundle.corridorSlots[slotIndex]
        if (slot !== undefined) {
          placeGateInSlot(mesh, slot, false)
        }
      } else {
        const dockIndex = state.dockRemaining.indexOf(kind)
        if (dockIndex >= 0) {
          parkGateInDock(mesh, dockIndex, dockIndex === state.dockSelectedIndex)
        }
      }
      // Pulse on running phase.
      const pulse = state.phase === "running" ? 0.5 + 0.4 * Math.sin(now * 0.005) : 0.55
      if (state.gateOrder.indexOf(kind) >= 0) {
        mesh.ring.material.emissiveIntensity = pulse
      }
    }

    // Sync orbs: spawn meshes for new orbs, advance positions, retint on
    // rejection.
    const seenIds = new Set<number>()
    for (const orb of state.orbs) {
      seenIds.add(orb.id)
      let mesh = orbMeshes.get(orb.id)
      if (mesh === undefined) {
        mesh = spawnOrbMesh(bundle.scene, orb)
        orbMeshes.set(orb.id, mesh)
      }
      mesh.group.position.set(orbX(orb), 0, 0)
      if (orb.rejected) {
        // Tint red and sink below the rails.
        mesh.body.material.color.set(0xef4444)
        mesh.body.material.emissive.set(0xb91c1c)
        mesh.group.position.y = -2.5 + Math.sin(now * 0.004 + orb.id) * 0.2
        mesh.group.position.x = orbX(orb) - 1
      } else if (orb.admitted) {
        mesh.group.position.y = 0.5
        mesh.group.scale.setScalar(1.15)
      } else {
        mesh.group.position.y = 0
      }
    }
    // Prune meshes for orbs that have been pruned (none in L1, but keep tidy).
    for (const [id, mesh] of orbMeshes.entries()) {
      if (!seenIds.has(id)) {
        bundle.scene.remove(mesh.group)
        orbMeshes.delete(id)
      }
    }

    // Cosmetic camera bob during running phase.
    if (state.phase === "running") {
      bundle.camera.position.x = Math.sin(now * 0.0006) * 1.2
    } else {
      bundle.camera.position.x = 0
    }

    // Emit evidence once when the wave resolves.
    if (state.phase === "resolved" && !resolvedEmitted) {
      resolvedEmitted = true
      const record = buildEvidence(state, new Date())
      emitEvidence(record)
    }

    renderHud(hud, state, state.dockRemaining[state.dockSelectedIndex] ?? null)

    renderer.render(bundle.scene, bundle.camera)
    requestAnimationFrame(frame)
  }

  // Initial render so the page is non-empty before the first interaction.
  renderHud(hud, state, state.dockRemaining[state.dockSelectedIndex] ?? null)
  requestAnimationFrame(frame)

  // Surface a few wave facts in the console for any human watching.
  console.log(
    `Aegis Corridor: ${WAVE_ORBS.length} orbs queued, MAX_HEAT=${MAX_HEAT}, canonical=${CANONICAL_ORDER.join("->")}`,
  )
  void new Vector3()
}

start()
