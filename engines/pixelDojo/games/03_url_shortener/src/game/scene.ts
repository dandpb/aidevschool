// Slug Launcher — three.js scene.
//
// Visualizes the WaveEngine state machine as a 3D hash-cannon arena:
//
//   - Long-URL crates drift in from the left toward the cannon on the right.
//   - The cannon muzzle is a base62 ring; firing pulses it green.
//   - Docks sit in an arc on the back wall; each newly-assigned code spawns
//     a labeled dock. The active crate flies to its computed dock on fire.
//   - Collision: target dock flares red, the crate physically bounces back.
//     The player presses R to re-hash with salt; the new dock is computed
//     and the crate re-flies. After 5 failed retries the crate is lost.
//   - On a successful dock, a cyan redirect beam fires from the code dock
//     to a globe icon (HTTP 301: short code resolves to the long URL).
//
// The scene is a read-only projection of WaveEngine. Input handlers call
// engine.fire / engine.retry; the scene only renders the outcome.

import {
  AmbientLight,
  BackSide,
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
} from "three"
import { emitEvidence } from "./evidence/emitter"
import {
  buildDefaultWave,
  type CrateSpec,
  type FireOutcome,
  isWavePass,
  type Strategy,
  WaveEngine,
  type WaveResult,
} from "./shortener"

type GameStatus =
  | "intro"
  | "live" // crate is in the arena, awaiting fire
  | "collision" // crate bounced, awaiting R
  | "flying" // animating toward dock
  | "between" // brief beat between crates
  | "wave-clear"
  | "wave-fail"

type Phase = "drift" | "to-dock" | "bounce" | "lost" | "docked"

type ActiveCrate = {
  spec: CrateSpec
  mesh: Group
  salt: number
  pos: Vector3
  vel: Vector3
  phase: Phase
  dockCode: string
}

type DockView = {
  code: string
  mesh: Group
  ringMaterial: MeshStandardMaterial
  cellIndex: number
}

const CANNON_COLOR = new Color("#3a5cff")
const CRATE_COLOR_A = new Color("#ffb454")
const CRATE_COLOR_B = new Color("#54ffd2")
const COLLISION_COLOR = new Color("#ff3b6b")
const DOCK_COLOR = new Color("#5effb3")
const REDIRECT_COLOR = new Color("#5ec8ff")

const DOCK_ARC_START_X = -3
const DOCK_SPACING = 1.5
const DOCK_Z = -5

function shortenUrlForLabel(url: string): string {
  const trimmed = url.replace(/^https?:\/\//, "")
  return trimmed.length > 22 ? `${trimmed.slice(0, 22)}...` : trimmed
}

function makeTextTexture(
  text: string,
  opts: { color?: string; bg?: string; font?: string; width?: number; height?: number } = {},
): CanvasTexture {
  const w = opts.width ?? 256
  const h = opts.height ?? 128
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("2D canvas context unavailable")
  if (opts.bg) {
    ctx.fillStyle = opts.bg
    ctx.fillRect(0, 0, w, h)
  } else {
    ctx.clearRect(0, 0, w, h)
  }
  ctx.fillStyle = opts.color ?? "#ffffff"
  ctx.font = opts.font ?? "bold 36px ui-monospace, monospace"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, w / 2, h / 2, w - 12)
  const tex = new CanvasTexture(canvas)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function makeLabelMesh(
  text: string,
  w: number,
  h: number,
  opts: { color?: string; bg?: string; font?: string; width?: number; height?: number },
): Mesh {
  return new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({
      map: makeTextTexture(text, opts),
      transparent: true,
    }),
  )
}

function makeCrateMesh(spec: CrateSpec): Group {
  const group = new Group()
  const color = spec.id % 2 === 0 ? CRATE_COLOR_A.clone() : CRATE_COLOR_B.clone()
  const body = new Mesh(
    new BoxGeometry(1.6, 1.0, 1.0),
    new MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6 }),
  )
  group.add(body)
  const urlLabel = makeLabelMesh(shortenUrlForLabel(spec.url), 1.5, 0.4, {
    color: "#08111c",
    font: "bold 22px ui-monospace, monospace",
    width: 320,
    height: 96,
  })
  urlLabel.position.set(0, 0, 0.52)
  group.add(urlLabel)
  const tag = makeLabelMesh(`#${spec.id}`, 0.45, 0.25, {
    color: "#08111c",
    bg: `#${color.getHexString()}`,
    font: "bold 26px ui-monospace, monospace",
    width: 96,
    height: 56,
  })
  tag.position.set(0, 0.7, 0)
  group.add(tag)
  return group
}

function makeDockMesh(
  code: string,
  cellIndex: number,
): {
  group: Group
  ring: MeshStandardMaterial
} {
  const group = new Group()
  const ringMaterial = new MeshStandardMaterial({
    color: DOCK_COLOR,
    emissive: DOCK_COLOR,
    emissiveIntensity: 0.35,
    metalness: 0.4,
    roughness: 0.4,
  })
  const ring = new Mesh(new RingGeometry(0.5, 0.62, 32), ringMaterial)
  ring.position.z = 0.12
  group.add(ring)
  const body = new Mesh(
    new BoxGeometry(1.1, 1.1, 0.18),
    new MeshStandardMaterial({
      color: "#0e1626",
      emissive: DOCK_COLOR,
      emissiveIntensity: 0.08,
      metalness: 0.2,
      roughness: 0.7,
    }),
  )
  group.add(body)
  const codeLabel = makeLabelMesh(code, 1.0, 0.55, {
    color: "#0a0a0a",
    bg: "#5effb3",
    font: "bold 44px ui-monospace, monospace",
    width: 256,
    height: 144,
  })
  codeLabel.position.set(0, 0, 0.2)
  group.add(codeLabel)
  const idxLabel = makeLabelMesh(`dock #${cellIndex}`, 1.0, 0.25, {
    color: "#5effb3",
    bg: "#070b16",
    font: "bold 22px ui-monospace, monospace",
    width: 256,
    height: 56,
  })
  idxLabel.position.set(0, -0.85, 0.2)
  group.add(idxLabel)
  return { group, ring: ringMaterial }
}

function buildHud(root: HTMLElement) {
  const hudEl = document.createElement("div")
  hudEl.className = "hud"
  hudEl.innerHTML = `
    <div class="hud-row hud-top">
      <div class="hud-cell"><span class="hud-label">STRATEGY</span><span class="hud-value" data-name="strategy">HASH</span></div>
      <div class="hud-cell"><span class="hud-label">SALT</span><span class="hud-value" data-name="salt">0</span></div>
      <div class="hud-cell"><span class="hud-label">WAVE</span><span class="hud-value" data-name="wave">0 / 4</span></div>
      <div class="hud-cell"><span class="hud-label">STATUS</span><span class="hud-value" data-name="status">Click or press SPACE to start</span></div>
    </div>
    <div class="hud-row hud-stats">
      <div class="hud-cell"><span class="hud-label">CODES</span><span class="hud-value" data-name="codes">0</span></div>
      <div class="hud-cell"><span class="hud-label">COLLISIONS</span><span class="hud-value" data-name="cols">0</span></div>
      <div class="hud-cell"><span class="hud-label">RECOVERED</span><span class="hud-value" data-name="rec">0</span></div>
      <div class="hud-cell"><span class="hud-label">EXHAUSTED</span><span class="hud-value" data-name="exh">0</span></div>
    </div>
    <div class="hud-row hud-bottom">
      <div class="hud-hint" data-name="hint">
        1=AUTO  2=HASH  3=SNOWFLAKE  |  SPACE=fire  R=retry on collision  |  HASH on duplicate URLs = collision
      </div>
    </div>
  `
  root.appendChild(hudEl)
  const q = <T extends HTMLElement>(sel: string): T => {
    const found = hudEl.querySelector<T>(sel)
    if (!found) throw new Error(`HUD missing element for ${sel}`)
    return found
  }
  return {
    hudEl,
    strategyEl: q<HTMLElement>('[data-name="strategy"]'),
    waveEl: q<HTMLElement>('[data-name="wave"]'),
    saltEl: q<HTMLElement>('[data-name="salt"]'),
    statusEl: q<HTMLElement>('[data-name="status"]'),
    codesEl: q<HTMLElement>('[data-name="codes"]'),
    colsEl: q<HTMLElement>('[data-name="cols"]'),
    recEl: q<HTMLElement>('[data-name="rec"]'),
    exhEl: q<HTMLElement>('[data-name="exh"]'),
    hintEl: q<HTMLElement>('[data-name="hint"]'),
  }
}

export class SlugLauncherScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera: PerspectiveCamera
  private readonly cannon: Group
  private readonly cannonRingMaterial: MeshStandardMaterial
  private readonly crateLayer = new Group()
  private readonly dockLayer = new Group()
  private readonly beamLayer = new Group()
  private readonly globe: Mesh
  private readonly hud: ReturnType<typeof buildHud>

  private readonly engine = new WaveEngine({
    crates: buildDefaultWave(4),
    maxRetries: 5,
    codeWidth: 4,
  })
  private spawnedCount = 0
  private active: ActiveCrate | null = null
  private status: GameStatus = "intro"
  private strategy: Strategy = "hash"
  private dockViews = new Map<string, DockView>()
  private dockCellsUsed = 0
  private statusLockUntil = 0
  private lastFrame = performance.now()
  private rafId = 0
  private fired = false
  private disposed = false

  constructor(private readonly root: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(root.clientWidth, root.clientHeight)
    this.renderer.setClearColor(new Color("#050813"))
    root.appendChild(this.renderer.domElement)

    this.scene.background = new Color("#050813")
    this.scene.fog = new Fog(new Color("#050813"), 9, 28)

    this.camera = new PerspectiveCamera(55, root.clientWidth / root.clientHeight, 0.1, 100)
    this.camera.position.set(0, 4.5, 11)
    this.camera.lookAt(0, 1.2, -2)

    this.scene.add(new AmbientLight("#9ee0ff", 0.55))
    const key = new DirectionalLight("#f6dd88", 1.6)
    key.position.set(4, 8, 6)
    this.scene.add(key)
    const rim = new DirectionalLight("#5ec8ff", 0.9)
    rim.position.set(-6, 3, -4)
    this.scene.add(rim)

    const floor = new Mesh(
      new PlaneGeometry(40, 40),
      new MeshStandardMaterial({ color: "#0a1024", metalness: 0.5, roughness: 0.5 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.5
    this.scene.add(floor)

    const sky = new Mesh(
      new SphereGeometry(40, 16, 12),
      new MeshBasicMaterial({ color: "#050813", side: BackSide }),
    )
    this.scene.add(sky)

    this.cannon = new Group()
    const base = new Mesh(
      new BoxGeometry(1.2, 0.6, 1.2),
      new MeshStandardMaterial({ color: "#1b2550", metalness: 0.6, roughness: 0.4 }),
    )
    base.position.y = -0.4
    this.cannon.add(base)
    this.cannonRingMaterial = new MeshStandardMaterial({
      color: CANNON_COLOR,
      emissive: CANNON_COLOR,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3,
    })
    const ring = new Mesh(new TorusGeometry(0.9, 0.12, 12, 64), this.cannonRingMaterial)
    ring.rotation.x = Math.PI / 2
    this.cannon.add(ring)
    const barrel = new Mesh(
      new BoxGeometry(0.18, 0.18, 1.4),
      new MeshStandardMaterial({
        color: "#cfd6ff",
        emissive: CANNON_COLOR,
        emissiveIntensity: 0.3,
        metalness: 0.7,
        roughness: 0.3,
      }),
    )
    barrel.position.set(0, 0, -1.0)
    this.cannon.add(barrel)
    this.cannon.position.set(0, 0.4, 5)
    this.scene.add(this.cannon)

    this.globe = new Mesh(
      new SphereGeometry(0.7, 24, 16),
      new MeshStandardMaterial({
        color: "#5ec8ff",
        emissive: "#2852ff",
        emissiveIntensity: 0.4,
        metalness: 0.4,
        roughness: 0.6,
      }),
    )
    this.globe.position.set(0, 2.6, -7)
    this.scene.add(this.globe)

    this.scene.add(this.crateLayer)
    this.scene.add(this.dockLayer)
    this.scene.add(this.beamLayer)

    this.hud = buildHud(root)

    window.addEventListener("resize", this.handleResize)
    window.addEventListener("keydown", this.handleKey)
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointer)

    window.__slugLauncherDebug = {
      forceFire: () => this.fire(),
      forceRetry: () => this.retry(),
      setStrategy: (s: Strategy) => this.setStrategy(s),
      getStatus: () => this.status,
    }
  }

  start(): void {
    this.lastFrame = performance.now()
    this.loop()
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.rafId)
    window.removeEventListener("resize", this.handleResize)
    window.removeEventListener("keydown", this.handleKey)
    this.renderer.domElement.removeEventListener("pointerdown", this.handlePointer)
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.hud.hudEl.remove()
  }

  private handleResize = (): void => {
    if (this.disposed) return
    const w = this.root.clientWidth
    const h = this.root.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  private handlePointer = (): void => {
    if (this.status === "intro") this.startWave()
    else if (this.status === "live") this.fire()
    else if (this.status === "collision") this.retry()
  }

  private handleKey = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    if (key === "1") this.setStrategy("auto")
    else if (key === "2") this.setStrategy("hash")
    else if (key === "3") this.setStrategy("snowflake")
    else if (key === " " || key === "enter") {
      event.preventDefault()
      if (this.status === "intro") this.startWave()
      else if (this.status === "live") this.fire()
    } else if (key === "r") {
      if (this.status === "collision") this.retry()
    }
  }

  private setStrategy(s: Strategy): void {
    this.strategy = s
    this.hud.strategyEl.textContent = s.toUpperCase()
  }

  private startWave(): void {
    this.spawnNext()
  }

  private spawnNext(): void {
    const wave = this.engine.waveCrates
    if (this.spawnedCount >= wave.length) {
      this.completeWave()
      return
    }
    const spec = wave[this.spawnedCount]
    if (!spec) {
      this.completeWave()
      return
    }
    this.spawnedCount += 1
    const mesh = makeCrateMesh(spec)
    const startX = -8
    const startY = 0.6 + (spec.id % 2) * 0.4
    mesh.position.set(startX, startY, 2)
    this.crateLayer.add(mesh)
    this.active = {
      spec,
      mesh,
      salt: 0,
      pos: mesh.position.clone(),
      vel: new Vector3(0, 0, 0),
      phase: "drift",
      dockCode: "",
    }
    this.status = "live"
    this.fired = false
    this.hud.statusEl.textContent = `Crate #${spec.id} inbound — fire!`
    this.refreshHud()
  }

  private fire(): void {
    if (!this.active || this.fired || this.status !== "live") return
    this.fired = true
    const crate = this.active
    this.flashCannon()
    const outcome: FireOutcome = this.engine.fire(crate.spec.url, this.strategy, crate.salt)
    if (outcome.kind === "docked") {
      this.sendToDock(crate, outcome.code)
    } else {
      this.ensureDockView(outcome.code)
      this.flashCollision(outcome.code)
      crate.phase = "bounce"
      crate.vel.set(-3.5, 2.2, 0)
      this.status = "collision"
      this.hud.statusEl.textContent = `COLLISION at ${outcome.code} — press R to retry`
      this.refreshHud()
    }
  }

  private retry(): void {
    if (!this.active || this.status !== "collision") return
    const crate = this.active
    const outcome = this.engine.retry(crate.spec.url, this.strategy, crate.salt)
    if (outcome.kind === "exhausted") {
      crate.phase = "lost"
      crate.vel.set(0, -2, -3)
      this.hud.statusEl.textContent = `LOST crate #${crate.spec.id} — retry budget exhausted`
      this.status = "between"
      this.statusLockUntil = performance.now() + 700
      this.refreshHud()
      return
    }
    if (outcome.kind === "docked") {
      crate.salt = outcome.salt
      this.flashCannon()
      this.sendToDock(crate, outcome.code)
      return
    }
    if (outcome.kind === "collision") {
      crate.salt = outcome.salt
      this.ensureDockView(outcome.code)
      this.flashCollision(outcome.code)
      this.hud.statusEl.textContent = `COLLISION at ${outcome.code} (salt ${outcome.salt}) — R again`
      this.refreshHud()
    }
  }

  private sendToDock(crate: ActiveCrate, code: string): void {
    const view = this.ensureDockView(code)
    crate.phase = "to-dock"
    crate.dockCode = code
    const target = view.mesh.position.clone()
    const dir = target.clone().sub(crate.pos)
    const distance = dir.length()
    if (distance < 0.001) {
      crate.vel.set(0, 0, 0)
    } else {
      const speed = 9 // units per second
      crate.vel.copy(dir.normalize().multiplyScalar(speed))
    }
    this.status = "flying"
    this.hud.statusEl.textContent = `Docking ${code}...`
    this.refreshHud()
  }

  private ensureDockView(code: string): DockView {
    const existing = this.dockViews.get(code)
    if (existing) return existing
    const cellIndex = this.dockCellsUsed
    this.dockCellsUsed += 1
    const built = makeDockMesh(code, cellIndex)
    const x = DOCK_ARC_START_X + cellIndex * DOCK_SPACING
    built.group.position.set(x, 1.4, DOCK_Z)
    this.dockLayer.add(built.group)
    const view: DockView = {
      code,
      mesh: built.group,
      ringMaterial: built.ring,
      cellIndex,
    }
    this.dockViews.set(code, view)
    return view
  }

  private flashCannon(): void {
    this.cannonRingMaterial.emissiveIntensity = 1.4
    this.cannonRingMaterial.color.copy(DOCK_COLOR)
    this.cannonRingMaterial.emissive.copy(DOCK_COLOR)
    window.setTimeout(() => {
      if (this.disposed) return
      this.cannonRingMaterial.color.copy(CANNON_COLOR)
      this.cannonRingMaterial.emissive.copy(CANNON_COLOR)
      this.cannonRingMaterial.emissiveIntensity = 0.6
    }, 220)
  }

  private flashCollision(code: string): void {
    const view = this.dockViews.get(code)
    if (view) {
      const mat = view.ringMaterial
      const origColor = mat.color.clone()
      const origEmissive = mat.emissive.clone()
      const origIntensity = mat.emissiveIntensity
      mat.color.copy(COLLISION_COLOR)
      mat.emissive.copy(COLLISION_COLOR)
      mat.emissiveIntensity = 1.4
      window.setTimeout(() => {
        if (this.disposed) return
        mat.color.copy(origColor)
        mat.emissive.copy(origEmissive)
        mat.emissiveIntensity = origIntensity
      }, 320)
    }
    this.cannonRingMaterial.color.copy(COLLISION_COLOR)
    this.cannonRingMaterial.emissive.copy(COLLISION_COLOR)
    this.cannonRingMaterial.emissiveIntensity = 1.0
    window.setTimeout(() => {
      if (this.disposed) return
      this.cannonRingMaterial.color.copy(CANNON_COLOR)
      this.cannonRingMaterial.emissive.copy(CANNON_COLOR)
      this.cannonRingMaterial.emissiveIntensity = 0.6
    }, 320)
  }

  private fireRedirectBeam(dockPos: Vector3): void {
    const from = dockPos.clone()
    const to = this.globe.position.clone()
    const mid = from.clone().lerp(to, 0.5)
    mid.y += 1.4
    const curve = new CatmullRomCurve3([from, mid, to])
    const geo = new TubeGeometry(curve, 32, 0.05, 8, false)
    const beam = new Mesh(
      geo,
      new MeshBasicMaterial({ color: REDIRECT_COLOR, transparent: true, opacity: 0.9 }),
    )
    this.beamLayer.add(beam)
    window.setTimeout(() => {
      if (this.disposed) return
      beam.geometry.dispose()
      ;(beam.material as MeshBasicMaterial).dispose()
      this.beamLayer.remove(beam)
    }, 1200)
  }

  private refreshHud(): void {
    const r = this.engine.result()
    this.hud.codesEl.textContent = String(r.codesAssigned)
    this.hud.colsEl.textContent = String(r.collisionsDetected)
    this.hud.recEl.textContent = String(r.collisionsRetriedOk)
    this.hud.exhEl.textContent = String(r.retriesExhausted)
    this.hud.waveEl.textContent = `${r.codesAssigned} / ${r.waveTarget}`
    this.hud.saltEl.textContent = String(this.active?.salt ?? 0)
  }

  private completeWave(): void {
    const result: WaveResult = this.engine.result()
    const gate = isWavePass(result)
    this.status = gate ? "wave-clear" : "wave-fail"
    this.hud.statusEl.textContent = gate
      ? "WAVE CLEARED — evidence emitted"
      : "WAVE FAILED (no collision recovered, or crate lost)"
    this.refreshHud()
    if (gate) {
      emitEvidence({
        pass: true,
        metrics: {
          kind: "threejs-slug-launcher",
          codes_assigned: result.codesAssigned,
          collisions_detected: result.collisionsDetected,
          collisions_retried_ok: result.collisionsRetriedOk,
          retries_exhausted: result.retriesExhausted,
          dock_overflows: result.dockOverflows,
          strategies_used: result.strategiesUsed,
          wave_cleared: result.waveCleared,
          wave_target: result.waveTarget,
        },
      })
    }
  }

  private loop = (): void => {
    if (this.disposed) return
    this.rafId = requestAnimationFrame(this.loop)
    const now = performance.now()
    const dt = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    this.update(dt, now)
    this.renderer.render(this.scene, this.camera)
  }

  private update(dt: number, now: number): void {
    this.cannon.rotation.y += dt * 0.4
    this.globe.rotation.y += dt * 0.4

    if (this.active) {
      const crate = this.active
      if (crate.phase === "drift") {
        const targetX = -3
        const dx = targetX - crate.pos.x
        crate.pos.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.2 * dt)
        crate.mesh.position.copy(crate.pos)
        crate.mesh.rotation.y += dt * 0.6
      } else {
        crate.pos.addScaledVector(crate.vel, dt)
        crate.mesh.position.copy(crate.pos)
        if (crate.phase === "to-dock") {
          crate.mesh.rotation.y += dt * 6
        }
      }

      if (crate.phase === "to-dock") {
        const dockView = this.dockViews.get(crate.dockCode)
        if (dockView) {
          const dist = crate.pos.distanceTo(dockView.mesh.position)
          if (dist < 0.5) {
            crate.phase = "docked"
            crate.mesh.position.copy(dockView.mesh.position)
            this.hud.statusEl.textContent = `Docked ${crate.dockCode} — 301 -> ${crate.spec.url}`
            this.fireRedirectBeam(dockView.mesh.position.clone())
            this.status = "between"
            this.statusLockUntil = now + 500
            this.refreshHud()
          }
        }
      }

      if (crate.phase === "lost" && crate.pos.y < -3) {
        this.crateLayer.remove(crate.mesh)
        this.active = null
      }

      if (crate.phase === "bounce") {
        if (crate.pos.x < -4 || crate.pos.y > 3) {
          crate.vel.multiplyScalar(0.4)
        }
        if (crate.vel.length() < 0.5) {
          crate.vel.set(0, 0, 0)
          crate.phase = "drift"
          this.fired = false
          this.status = "collision"
        }
      }
    }

    if (this.status === "between" && now >= this.statusLockUntil) {
      if (this.active && this.active.phase === "docked") {
        this.crateLayer.remove(this.active.mesh)
        this.active = null
      }
      if (!this.active) {
        if (this.engine.isWaveCleared()) {
          this.completeWave()
        } else {
          this.spawnNext()
        }
      }
    }
  }
}
