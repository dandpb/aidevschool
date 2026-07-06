// 09_plugin_system — Plugin Docking Bay (three.js + Vite).
//
// A standalone 3D teaching scene for plugin lifecycle, capability, sandbox and
// version negotiation. The state machine lives in ./game/lifecycle.ts (pure,
// unit-tested); this module is the visual + input shell over it.
//
// Controls (NES-pad feel, ≤ 3 primary actions):
//   Z       — ADVANCE the targeted pod through its next legal transition
//             (load → init → start → stop → unload)
//   X       — DENY the active prompt on the targeted pod (undeclared capability
//             or version mismatch).
//   S       — toggle SANDBOX BUBBLE on the targeted pod (only between init and
//             start).
//   Tab / Q — cycle target lock to the next pod.
//   WASD    — move the player-tractor around the bay floor (free roam).
//   H       — toggle the legal-transition map HUD crutch.
//
// On wave clear the scene emits one `EVIDENCE {...}` line to the console and
// stores it on `window.__gameEvidence` for the Playwright smoke run.

import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three"
import { buildEvidence, emitEvidence } from "./game/evidence"
import {
  advance,
  createWave,
  cycleTarget,
  denyPrompt,
  isPass,
  type PodSpec,
  tick,
  toggleSandbox,
  type Wave,
} from "./game/lifecycle"

// ----- Wave definition (deterministic seed) --------------------------------
//
// Three pods exercise every rule the pass gate enforces:
//   alpha  — version-ok, declares `network`, demands undeclared `fs:/etc`.
//   beta   — version-MISMATCH (host v3 outside [5,5]); must be rejected at init.
//   gamma  — version-ok, panics at +1500 ms; sandbox must contain it.
const HOST_API_VERSION = 3
const PODS: readonly PodSpec[] = [
  {
    id: "alpha",
    apiVersionRange: [2, 4],
    declaredCapabilities: ["network"],
    priority: 10,
    panicAfterMs: null,
    undeclaredDemand: "fs:/etc",
  },
  {
    id: "beta",
    apiVersionRange: [5, 5],
    declaredCapabilities: [],
    priority: 20,
    panicAfterMs: null,
    undeclaredDemand: null,
  },
  {
    id: "gamma",
    apiVersionRange: [3, 4],
    declaredCapabilities: [],
    priority: 30,
    panicAfterMs: 1500,
    undeclaredDemand: null,
  },
]

const LIFECYCLE_GATES = ["load", "init", "start", "stop", "unload"] as const
const STATE_COLORS: Record<string, string> = {
  spawning: "#4a5568",
  loaded: "#d69e2e",
  inited: "#3182ce",
  running: "#38a169",
  stopped: "#805ad5",
  rejected: "#e53e3e",
  unloaded: "#1a202c",
}

// ----- DOM bootstrap --------------------------------------------------------

const app = document.querySelector("#app")
if (!app) {
  throw new Error("Plugin Docking Bay: #app root not found")
}

const sceneHost = document.createElement("div")
sceneHost.style.position = "fixed"
sceneHost.style.inset = "0"
sceneHost.style.background = "radial-gradient(circle at 50% 35%, #0b1530 0%, #050810 70%)"
sceneHost.style.fontFamily = "'JetBrains Mono', 'SF Mono', Menlo, monospace"
app.appendChild(sceneHost)

const hudHost = document.createElement("div")
hudHost.style.position = "fixed"
hudHost.style.inset = "0"
hudHost.style.pointerEvents = "none"
hudHost.style.color = "#e2e8f0"
hudHost.style.fontSize = "13px"
hudHost.style.zIndex = "10"
app.appendChild(hudHost)

const hudTop = document.createElement("div")
hudTop.style.position = "absolute"
hudTop.style.top = "12px"
hudTop.style.left = "12px"
hudTop.style.right = "12px"
hudTop.style.display = "flex"
hudTop.style.justifyContent = "space-between"
hudTop.style.gap = "12px"
hudHost.appendChild(hudTop)

const objectiveChip = document.createElement("div")
objectiveChip.className = "objective-chip"
objectiveChip.style.background = "rgba(15, 23, 42, 0.85)"
objectiveChip.style.border = "1px solid #38b2ac"
objectiveChip.style.borderRadius = "6px"
objectiveChip.style.padding = "8px 12px"
objectiveChip.style.maxWidth = "50%"
hudTop.appendChild(objectiveChip)

const statusStrip = document.createElement("div")
statusStrip.className = "status-strip"
statusStrip.style.background = "rgba(15, 23, 42, 0.85)"
statusStrip.style.border = "1px solid #4a5568"
statusStrip.style.borderRadius = "6px"
statusStrip.style.padding = "8px 12px"
statusStrip.style.minWidth = "320px"
statusStrip.style.fontVariantNumeric = "tabular-nums"
hudTop.appendChild(statusStrip)

const phaseStrip = document.createElement("div")
phaseStrip.className = "phase-strip"
phaseStrip.style.position = "absolute"
phaseStrip.style.bottom = "90px"
phaseStrip.style.left = "50%"
phaseStrip.style.transform = "translateX(-50%)"
phaseStrip.style.background = "rgba(15, 23, 42, 0.9)"
phaseStrip.style.border = "1px solid #38b2ac"
phaseStrip.style.borderRadius = "6px"
phaseStrip.style.padding = "8px 16px"
phaseStrip.style.textAlign = "center"
phaseStrip.style.minWidth = "420px"
hudHost.appendChild(phaseStrip)

const promptPanel = document.createElement("div")
promptPanel.className = "prompt-panel"
promptPanel.style.position = "absolute"
promptPanel.style.bottom = "20px"
promptPanel.style.left = "50%"
promptPanel.style.transform = "translateX(-50%)"
promptPanel.style.background = "rgba(74, 20, 140, 0.92)"
promptPanel.style.border = "1px solid #d69e2e"
promptPanel.style.borderRadius = "6px"
promptPanel.style.padding = "10px 18px"
promptPanel.style.display = "none"
promptPanel.style.textAlign = "center"
hudHost.appendChild(promptPanel)

const controlsChip = document.createElement("div")
controlsChip.style.position = "absolute"
controlsChip.style.bottom = "12px"
controlsChip.style.left = "12px"
controlsChip.style.background = "rgba(15, 23, 42, 0.8)"
controlsChip.style.border = "1px solid #4a5568"
controlsChip.style.borderRadius = "6px"
controlsChip.style.padding = "6px 10px"
controlsChip.style.fontSize = "11px"
controlsChip.style.lineHeight = "1.5"
controlsChip.innerHTML =
  "<b style='color:#38b2ac'>CONTROLS</b><br/>" +
  "<span class='prompt-chip'>Z</span> advance &nbsp;" +
  "<span class='prompt-chip'>X</span> deny &nbsp;" +
  "<span class='prompt-chip'>S</span> sandbox &nbsp;" +
  "<span class='prompt-chip'>Tab/Q</span> cycle target"
hudHost.appendChild(controlsChip)

const tractorReadout = document.createElement("div")
tractorReadout.style.position = "absolute"
tractorReadout.style.bottom = "12px"
tractorReadout.style.right = "12px"
tractorReadout.style.background = "rgba(15, 23, 42, 0.8)"
tractorReadout.style.border = "1px solid #4a5568"
tractorReadout.style.borderRadius = "6px"
tractorReadout.style.padding = "6px 10px"
tractorReadout.style.fontSize = "11px"
tractorReadout.style.lineHeight = "1.5"
hudHost.appendChild(tractorReadout)

// ----- three.js bootstrap ---------------------------------------------------

const scene = new Scene()
scene.background = new Color(0x050810)

const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(0, 9, 14)
camera.lookAt(0, 1, 0)

const renderer = new WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
sceneHost.appendChild(renderer.domElement)

const ambient = new AmbientLight(0x4a6080, 0.7)
scene.add(ambient)

const keyLight = new DirectionalLight(0xfff6e6, 0.9)
keyLight.position.set(8, 14, 6)
scene.add(keyLight)

const hostLight = new PointLight(0x38b2ac, 1.5, 25)
hostLight.position.set(0, 3, 0)
scene.add(hostLight)

// ----- Floor ---------------------------------------------------------------

const floorGeo = new BoxGeometry(40, 0.2, 40)
const floorMat = new MeshStandardMaterial({
  color: 0x0e1730,
  metalness: 0.4,
  roughness: 0.7,
})
const floor = new Mesh(floorGeo, floorMat)
floor.position.y = -0.1
scene.add(floor)

// ----- Host reactor (central glowing polyhedron) ---------------------------

const hostGroup = new Group()
const hostCore = new Mesh(
  new IcosahedronGeometry(1.4, 0),
  new MeshStandardMaterial({
    color: 0x38b2ac,
    emissive: 0x38b2ac,
    emissiveIntensity: 0.6,
    metalness: 0.6,
    roughness: 0.3,
    flatShading: true,
  }),
)
hostGroup.add(hostCore)
const hostRing = new Mesh(
  new TorusGeometry(2.4, 0.06, 12, 64),
  new MeshBasicMaterial({ color: 0x38b2ac }),
)
hostRing.rotation.x = Math.PI / 2
hostGroup.add(hostRing)
const hostVersionRing = new Mesh(
  new TorusGeometry(2.8, 0.04, 8, 48),
  new MeshBasicMaterial({ color: 0xd69e2e, transparent: true, opacity: 0.7 }),
)
hostVersionRing.rotation.x = Math.PI / 2
hostGroup.add(hostVersionRing)
scene.add(hostGroup)

// ----- Five numbered lifecycle gates (visual markers) ----------------------

const gateGroup = new Group()
const gatePositions: { label: string; angle: number }[] = []
for (let i = 0; i < 5; i += 1) {
  const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
  gatePositions.push({ label: LIFECYCLE_GATES[i] ?? `g${i}`, angle })
  const post = new Mesh(
    new BoxGeometry(0.15, 1.2, 0.15),
    new MeshStandardMaterial({ color: 0x2d3748, emissive: 0x1a202c }),
  )
  const radius = 4.6
  post.position.set(Math.cos(angle) * radius, 0.6, Math.sin(angle) * radius)
  gateGroup.add(post)
}
scene.add(gateGroup)

// ----- Pods ----------------------------------------------------------------

interface PodView {
  group: Group
  body: Mesh
  stateChip: Mesh
  sandboxShell: Mesh
  bubbleMat: MeshStandardMaterial
  versionArc: Mesh
  versionArcMat: MeshBasicMaterial
  panicFlash: Mesh
  panicFlashMat: MeshBasicMaterial
  homePosition: Vector3
}

const podViews: PodView[] = []
const podRing = new Group()
scene.add(podRing)

for (let i = 0; i < PODS.length; i += 1) {
  const angle = (i / PODS.length) * Math.PI * 2
  const radius = 7.5
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  const group = new Group()
  group.position.set(x, 0.8, z)

  const body = new Mesh(
    new BoxGeometry(1.6, 1.4, 1.6),
    new MeshStandardMaterial({ color: 0x2d3748, metalness: 0.3, roughness: 0.6 }),
  )
  group.add(body)

  const chip = new Mesh(
    new BoxGeometry(0.4, 0.4, 0.4),
    new MeshStandardMaterial({ color: 0x4a5568, emissive: 0x1a202c }),
  )
  chip.position.set(0, 1.1, 0)
  group.add(chip)

  const bubbleMat = new MeshStandardMaterial({
    color: 0x38b2ac,
    emissive: 0x38b2ac,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.18,
    side: DoubleSide,
    flatShading: true,
  })
  const sandboxShell = new Mesh(new IcosahedronGeometry(1.6, 0), bubbleMat)
  sandboxShell.visible = false
  group.add(sandboxShell)

  // Version arc: thin ring whose color signals compatibility once `inited`.
  const versionArcMat = new MeshBasicMaterial({
    color: 0x4a5568,
    transparent: true,
    opacity: 0.0,
    side: DoubleSide,
  })
  const versionArc = new Mesh(new TorusGeometry(1.05, 0.05, 8, 32, Math.PI * 1.4), versionArcMat)
  versionArc.rotation.x = Math.PI / 2
  versionArc.position.y = 0.8
  group.add(versionArc)

  // Panic flash: a red shell that becomes visible on panic.
  const panicFlashMat = new MeshBasicMaterial({
    color: 0xe53e3e,
    transparent: true,
    opacity: 0.0,
    side: BackSide,
  })
  const panicFlash = new Mesh(new IcosahedronGeometry(2.0, 0), panicFlashMat)
  panicFlash.visible = false
  group.add(panicFlash)

  podRing.add(group)
  podViews.push({
    group,
    body,
    stateChip: chip,
    sandboxShell,
    bubbleMat,
    versionArc,
    versionArcMat,
    panicFlash,
    panicFlashMat,
    homePosition: new Vector3(x, 0.8, z),
  })
}

// ----- Player tractor (free-roam dot on the floor) -------------------------

const tractor = new Mesh(
  new IcosahedronGeometry(0.4, 0),
  new MeshStandardMaterial({ color: 0xf6e05e, emissive: 0xf6e05e, emissiveIntensity: 0.4 }),
)
tractor.position.set(0, 0.4, 10)
scene.add(tractor)

const tractorTarget = new Vector3(0, 0.4, 10)
const tractorKeys: Record<string, boolean> = {}

// ----- Wave state ----------------------------------------------------------

let wave: Wave = createWave(HOST_API_VERSION, PODS)
let evidenceEmitted = false
let hudCheatMap = true

// ----- Input ---------------------------------------------------------------

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase()
  if (key === "tab") {
    event.preventDefault()
  }
  // Movement keys are tracked continuously.
  if (key === "w" || key === "a" || key === "s" || key === "d") {
    if (key === "s") {
      // 's' is overloaded: while held for movement, on keydown (not repeat) it
      // also triggers the sandbox toggle. To keep the smoke run deterministic,
      // we treat the first non-repeat press of 's' as the sandbox action.
      if (!event.repeat) {
        wave = toggleSandbox(wave)
      }
    }
    tractorKeys[key] = true
    return
  }
  if (event.repeat) return

  if (key === "z") {
    wave = advance(wave)
  } else if (key === "x") {
    wave = denyPrompt(wave)
  } else if (key === "q" || key === "tab" || key === "e") {
    if (key === "e") {
      // e is reserved — unused
      return
    }
    wave = cycleTarget(wave)
  } else if (key === "h") {
    hudCheatMap = !hudCheatMap
  }
})

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase()
  if (key === "w" || key === "a" || key === "s" || key === "d") {
    tractorKeys[key] = false
  }
})

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ----- Click-to-target (mouse) ---------------------------------------------

const raycaster = new Raycaster()
const pointer = new Vector2()
renderer.domElement.addEventListener("click", (event: MouseEvent) => {
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(
    podViews.map((v) => v.body),
    false,
  )
  if (hits.length > 0) {
    const hit = hits[0]
    if (hit) {
      const idx = podViews.findIndex((v) => v.body === hit.object)
      if (idx >= 0 && wave.pods[idx] && wave.pods[idx]?.state !== "unloaded") {
        wave = { ...wave, targetIndex: idx }
      }
    }
  }
})

// ----- HUD rendering -------------------------------------------------------

function describePrompt(waveState: Wave): string {
  const pod = waveState.pods[waveState.targetIndex]
  if (!pod || pod.activePrompt === null) return ""
  if (pod.activePrompt.kind === "version-mismatch") {
    return `VERSION MISMATCH — pod "${pod.id}" requires API v${pod.apiVersionRange[0]}–v${pod.apiVersionRange[1]}, host is v${HOST_API_VERSION}. Press X to REJECT at init.`
  }
  return `UNDECLARED CAPABILITY — pod "${pod.id}" demands "${pod.activePrompt.capability}" (declared: ${pod.declaredCapabilities.length === 0 ? "none" : pod.declaredCapabilities.join(", ")}). Press X to DENY.`
}

function renderHud() {
  objectiveChip.innerHTML =
    `<div style='color:#38b2ac;font-weight:600'>09_plugin_system — Plugin Docking Bay</div>` +
    `<div style='font-size:11px;color:#a0aec0'>Lifecycle load→init→start→stop→unload · ` +
    `Host API v${HOST_API_VERSION}</div>`

  const m = wave.metrics
  statusStrip.innerHTML =
    `<div style='color:#d69e2e;font-weight:600'>${wave.status.toUpperCase()}</div>` +
    `<div style='font-size:11px;color:#cbd5e0'>` +
    `target=<b style='color:#f6e05e'>${wave.pods[wave.targetIndex]?.id ?? "—"}</b> ` +
    `(${wave.pods[wave.targetIndex]?.state ?? "—"}) · ` +
    `loaded=${m.pods_loaded}/${PODS.length} · sandboxed=${m.pods_started_sandboxed} · ` +
    `unsandboxed=${m.pods_started_unsandboxed} · ` +
    `deny=${m.undeclared_denied} · leak=${m.undeclared_leaked} · ` +
    `mismatch=${m.version_mismatches_handled}/${m.version_mismatches_total} · ` +
    `invalid=${m.invalid_transitions_attempted} · ` +
    `panics(contained=${m.panics_contained},vented=${m.panics_vented}) · ` +
    `host_damage=${m.host_damage} · clean=${m.plugins_unloaded_clean}/${PODS.length}` +
    `</div>`

  const targetPod = wave.pods[wave.targetIndex]
  const promptText = describePrompt(wave)
  if (promptText) {
    promptPanel.style.display = "block"
    promptPanel.innerHTML =
      `<div style='color:#fefcbf;font-weight:600'>⚠ PROMPT — DENY with X</div>` +
      `<div style='font-size:12px;color:#fed7aa;margin-top:4px'>${promptText}</div>`
  } else {
    promptPanel.style.display = "none"
  }

  if (wave.status === "wave-clear") {
    const passText = isPass(wave) ? "WAVE CLEAR — PASS" : "WAVE CLEAR — FAIL"
    const color = isPass(wave) ? "#38a169" : "#e53e3e"
    phaseStrip.innerHTML =
      `<div style='color:${color};font-weight:700;font-size:14px'>${passText}</div>` +
      `<div style='font-size:11px;color:#cbd5e0;margin-top:4px'>EVIDENCE emitted — ` +
      `verifier decides mastery</div>`
  } else {
    const legal = legalTransitionHint(targetPod?.state)
    phaseStrip.innerHTML =
      `<div style='color:#38b2ac;font-weight:600'>TARGET: ${targetPod?.id ?? "—"} ` +
      `· state=${targetPod?.state ?? "—"}${targetPod?.sandboxed ? " · SANDBOXED" : ""}</div>` +
      `<div style='font-size:11px;color:#e2e8f0;margin-top:4px'>` +
      (targetPod
        ? `declared=[${targetPod.declaredCapabilities.join(", ") || "—"}] · priority=${targetPod.priority} · ` +
          `api=v${targetPod.apiVersionRange[0]}–v${targetPod.apiVersionRange[1]}`
        : "") +
      `</div>` +
      `<div style='font-size:12px;color:#f6e05e;margin-top:4px'>${legal}</div>` +
      (hudCheatMap
        ? `<div style='font-size:10px;color:#a0aec0;margin-top:4px'>LEGAL MAP: ` +
          `load → init → (S sandbox) → start → stop → unload · ` +
          `mismatch@init → X reject · undeclared@run → X deny</div>`
        : "")
  }

  tractorReadout.innerHTML =
    `<b style='color:#f6e05e'>TRACTOR</b> ` +
    `pos=(${tractor.position.x.toFixed(1)}, ${tractor.position.z.toFixed(1)})<br/>` +
    `<span style='color:#a0aec0'>WASD to roam · click a pod to target</span>`
}

function legalTransitionHint(state: string | undefined): string {
  switch (state) {
    case "spawning":
      return "press Z to LOAD (admit pod to dock)"
    case "loaded":
      return "press Z to INIT (negotiate API version)"
    case "inited":
      return "press S to wrap in SANDBOX, then Z to START"
    case "running":
      return "press Z to STOP (or wait for panic containment)"
    case "stopped":
      return "press Z to UNLOAD (frees the dock)"
    case "rejected":
      return "press Z to retire the rejected pod (unload)"
    case "unloaded":
      return "pod retired — Tab to next target"
    default:
      return ""
  }
}

// ----- Per-frame visual sync ----------------------------------------------

function syncPodVisuals(elapsed: number) {
  for (let i = 0; i < podViews.length; i += 1) {
    const view = podViews[i]
    if (!view) continue
    const pod = wave.pods[i]
    if (!pod) continue

    const stateColorHex = STATE_COLORS[pod.state] ?? "#4a5568"
    const stateColor = new Color(stateColorHex)
    const bodyMat = view.body.material
    if (bodyMat instanceof MeshStandardMaterial) {
      bodyMat.color.copy(stateColor)
      bodyMat.emissive.copy(stateColor).multiplyScalar(0.15)
    }
    const chipMat = view.stateChip.material
    if (chipMat instanceof MeshStandardMaterial) {
      chipMat.color.copy(stateColor)
      chipMat.emissive.copy(stateColor).multiplyScalar(0.6)
    }

    // Sandbox bubble.
    view.sandboxShell.visible = pod.sandboxed && pod.state !== "unloaded"
    view.bubbleMat.opacity = pod.sandboxed ? 0.22 : 0.0

    // Version arc: visible only at `loaded`/`inited` to telegraph negotiation.
    const showArc = pod.state === "loaded" || pod.state === "inited"
    view.versionArc.visible = showArc
    if (showArc) {
      const [min, max] = pod.apiVersionRange
      const ok = HOST_API_VERSION >= (min ?? 0) && HOST_API_VERSION <= (max ?? 0)
      view.versionArcMat.color.set(ok ? 0x38a169 : 0xe53e3e)
      view.versionArcMat.opacity = 0.85
    }

    // Panic flash.
    view.panicFlash.visible = pod.panicked
    view.panicFlashMat.opacity = pod.panicked ? (pod.panicContained ? 0.35 : 0.6) : 0.0
    view.panicFlashMat.color.set(pod.panicContained ? 0xe53e3e : 0xff0000)

    // Targeting lift: targeted pod hovers a bit higher and pulses.
    const targeted = i === wave.targetIndex && pod.state !== "unloaded"
    const targetY = targeted ? 1.0 + Math.sin(elapsed * 4) * 0.08 : 0.8
    view.group.position.y = targetY
    view.group.rotation.y = targeted ? elapsed * 0.6 : 0

    // Unloaded pods sink below the floor and dim.
    if (pod.state === "unloaded") {
      view.group.position.y = -1.5
    }
  }

  // Host reactor: damage tint.
  const damaged = wave.metrics.host_damage > 0
  const coreMat = hostCore.material
  if (coreMat instanceof MeshStandardMaterial) {
    coreMat.emissive.setHex(damaged ? 0xe53e3e : 0x38b2ac)
    coreMat.emissiveIntensity = damaged ? 0.9 + Math.sin(elapsed * 12) * 0.3 : 0.6
  }
  hostGroup.rotation.y = elapsed * 0.3
}

// ----- Main loop -----------------------------------------------------------

const clock = new Clock()
function animate() {
  requestAnimationFrame(animate)
  const dtMs = Math.min(100, clock.getDelta() * 1000)

  // Tick the world.
  if (wave.status === "wave-running") {
    wave = tick(wave, dtMs)
  }

  // Tractor movement.
  const speed = 8 / 1000
  if (tractorKeys["w"]) tractorTarget.z -= speed * dtMs * 60
  if (tractorKeys["a"]) tractorTarget.x -= speed * dtMs * 60
  if (tractorKeys["d"]) tractorTarget.x += speed * dtMs * 60
  // Note: holding 's' for movement would conflict with the sandbox toggle.
  // Forward-only tractor; Q/E strafe intentionally not bound.
  tractorTarget.x = Math.max(-18, Math.min(18, tractorTarget.x))
  tractorTarget.z = Math.max(-18, Math.min(18, tractorTarget.z))
  tractor.position.lerp(tractorTarget, 0.2)
  tractor.rotation.y = clock.elapsedTime * 2

  syncPodVisuals(clock.elapsedTime)
  renderHud()

  // Emit evidence once on wave clear.
  if (wave.status === "wave-clear" && !evidenceEmitted) {
    const record = buildEvidence(wave, new Date())
    emitEvidence(record)
    evidenceEmitted = true
  }

  renderer.render(scene, camera)
}

animate()
