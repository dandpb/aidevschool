// Log River Delta — three.js scene.
//
// A real 3D rendering of the structured-log aggregation pipeline:
//
//   4 tributaries (services) converge on a delta reservoir. A weir with N
//   visible slots guards the intake (RF-019 backpressure). Past the weir,
//   droplets fall through indexer channels (RF-011) and settle into hot →
//   warm → cold tiers (RF-012, RF-013); cold droplets visibly compress into
//   ice blocks (compression ratio displayed). The query probe (Z) scans the
//   reservoir and magnetizes matches to a result rail; the Trace Tower (T)
//   stacks correlation-matched droplets in timestamp + span-parent order
//   (RF-007, RF-014, RF-015).
//
// The scene is a projection of RiverState (game/logriver.ts). It owns no
// game logic — every visible transition is a read of state.

import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  SphereGeometry,
  Scene as ThreeScene,
  Vector3,
  WebGLRenderer,
} from "three"
import type {
  IndexedLog,
  LogEntry,
  LogLevel,
  LogSource,
  Metrics,
  Phase,
  QueryFilter,
  RiverState,
} from "./logriver"
import { correlationDye, levelColor, SOURCES } from "./logriver"

const TRIBUTARY_X: readonly number[] = [-6, -2, 2, 6]
const TRIBUTARY_Z = -8
const WEIR_Z = -1.5
const TIER_HOT_Z = 1.5
const TIER_WARM_Z = 4
const TIER_COLD_Z = 6.5
const TRACE_TOWER_X = 9

const DROPLET_RADIUS = 0.22
const ICE_BLOCK_SIZE = 0.4
const MAX_DROPLETS = 256

type DropletVisual = {
  mesh: Mesh<SphereGeometry, MeshStandardMaterial>
  ice?: Mesh<BoxGeometry, MeshStandardMaterial>
  // Lerp target the visual eases toward each frame.
  target: Vector3
  scale: number
}

export class LogRiverScene {
  private readonly holder: HTMLElement
  private readonly renderer: WebGLRenderer
  private readonly camera: PerspectiveCamera
  private readonly scene: ThreeScene
  private readonly clock = new Clock()
  private readonly dropletPool: DropletVisual[] = []
  private readonly dropletByLogId = new Map<string, DropletVisual>()
  private readonly weirSlots: Mesh<BoxGeometry, MeshBasicMaterial>[] = []
  private readonly indexerChannels: Mesh<BoxGeometry, MeshBasicMaterial>[] = []
  private readonly traceSlots: Mesh<BoxGeometry, MeshBasicMaterial>[] = []
  private readonly probe: Mesh
  private readonly probeLight: PointLight
  private readonly dyePalette: readonly string[]

  constructor(holder: HTMLElement, dyePalette: readonly string[]) {
    this.holder = holder
    this.dyePalette = dyePalette
    const width = holder.clientWidth || 800
    const height = holder.clientHeight || 600

    this.renderer = new WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(width, height)
    this.renderer.setClearColor(new Color(0x05080f), 1)
    holder.appendChild(this.renderer.domElement)

    this.scene = new ThreeScene()
    this.camera = new PerspectiveCamera(50, width / height, 0.1, 200)
    this.camera.position.set(0, 9, 13)
    this.camera.lookAt(0, 0, 2)

    // Lights.
    const ambient = new AmbientLight(0x404a6a, 0.7)
    this.scene.add(ambient)
    const key = new DirectionalLight(0xffe6b0, 0.9)
    key.position.set(4, 12, 6)
    this.scene.add(key)
    const rim = new DirectionalLight(0x6688cc, 0.5)
    rim.position.set(-6, 4, -8)
    this.scene.add(rim)
    this.probeLight = new PointLight(0x66ddff, 0.0, 12)
    this.probeLight.position.set(0, 2, 4)
    this.scene.add(this.probeLight)

    this.buildRiverbed()
    this.buildWeir()
    this.buildIndexer()
    this.buildTiers()
    this.buildTraceTower()
    this.probe = this.buildProbe()
    this.scene.add(this.probe)

    // Pre-allocate the droplet pool (hidden until used).
    const sphereGeo = new SphereGeometry(DROPLET_RADIUS, 14, 10)
    const iceGeo = new BoxGeometry(ICE_BLOCK_SIZE, ICE_BLOCK_SIZE, ICE_BLOCK_SIZE)
    for (let i = 0; i < MAX_DROPLETS; i += 1) {
      const mat = new MeshStandardMaterial({
        color: new Color(0.5, 0.5, 0.5),
        emissive: new Color(0.5, 0.5, 0.5),
        emissiveIntensity: 0.6,
        roughness: 0.4,
      })
      const mesh = new Mesh(sphereGeo, mat)
      mesh.visible = false
      this.scene.add(mesh)
      const iceMat = new MeshStandardMaterial({
        color: new Color(0.4, 0.7, 1.0),
        emissive: new Color(0.2, 0.4, 0.7),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.85,
        roughness: 0.6,
      })
      const ice = new Mesh(iceGeo, iceMat)
      ice.visible = false
      this.scene.add(ice)
      this.dropletPool.push({ mesh, ice, target: new Vector3(), scale: 1 })
    }
  }

  private buildRiverbed(): void {
    // The delta floor — a dark plane with subtle emissive grid feel.
    const bed = new Mesh(
      new PlaneGeometry(28, 22),
      new MeshStandardMaterial({
        color: new Color(0x0a1426),
        emissive: new Color(0x0a1426),
        emissiveIntensity: 0.2,
        roughness: 0.9,
      }),
    )
    bed.rotation.x = -Math.PI / 2
    bed.position.set(0, -0.5, 0)
    this.scene.add(bed)

    // Tributary streams — 4 thin emissive ribbons from the back wall to the
    // reservoir mouth, one per service.
    SOURCES.forEach((_source, idx) => {
      const x = TRIBUTARY_X[idx] ?? 0
      const stream = new Mesh(
        new PlaneGeometry(0.6, 8),
        new MeshBasicMaterial({
          color: new Color(0.2, 0.4, 0.7),
          transparent: true,
          opacity: 0.35,
        }),
      )
      stream.rotation.x = -Math.PI / 2
      stream.rotation.z = Math.atan2(0, -x) * 0.1
      stream.position.set(x * 0.6, -0.45, (TRIBUTARY_Z + WEIR_Z) / 2)
      this.scene.add(stream)
      // Source label plate at the back wall.
      const plate = new Mesh(
        new BoxGeometry(1.4, 0.6, 0.1),
        new MeshBasicMaterial({ color: new Color(0x1c2840) }),
      )
      plate.position.set(x, 0.4, TRIBUTARY_Z - 0.4)
      this.scene.add(plate)
    })
  }

  private buildWeir(): void {
    // Weir frame: N slot indicators across the reservoir mouth.
    const slots = 8
    for (let i = 0; i < slots; i += 1) {
      const x = -3.5 + i * 1.0
      const slot = new Mesh(
        new BoxGeometry(0.7, 0.9, 0.3),
        new MeshBasicMaterial({ color: new Color(0x22304a) }),
      )
      slot.position.set(x, 0.0, WEIR_Z)
      this.scene.add(slot)
      this.weirSlots.push(slot)
    }
    // Weir beam underneath.
    const beam = new Mesh(
      new BoxGeometry(9, 0.25, 0.5),
      new MeshStandardMaterial({
        color: new Color(0x4a4030),
        emissive: new Color(0x1a1408),
        roughness: 0.8,
      }),
    )
    beam.position.set(0, -0.4, WEIR_Z)
    this.scene.add(beam)
  }

  private buildIndexer(): void {
    // Four indexer channels past the weir, one per index dimension.
    const labels = ["level", "source", "corr", "time"]
    labels.forEach((_label, idx) => {
      const x = -3 + idx * 2
      const channel = new Mesh(
        new BoxGeometry(0.5, 0.15, 1.6),
        new MeshBasicMaterial({ color: new Color(0x1c2840) }),
      )
      channel.position.set(x, -0.3, (WEIR_Z + TIER_HOT_Z) / 2)
      this.scene.add(channel)
      this.indexerChannels.push(channel)
    })
  }

  private buildTiers(): void {
    // Three tier platforms: hot (bright), warm (medium), cold (icy).
    const hot = this.tierPlatform(TIER_HOT_Z, 0.4, 0.18, 0.06, 0x3a1a1a)
    const warm = this.tierPlatform(TIER_WARM_Z, 0.45, 0.32, 0.08, 0x3a2a1a)
    const cold = this.tierPlatform(TIER_COLD_Z, 0.5, 0.55, 0.18, 0x1a2a3a)
    this.scene.add(hot, warm, cold)
  }

  private tierPlatform(z: number, r: number, g: number, b: number, emissive: number): Mesh {
    const platform = new Mesh(
      new BoxGeometry(12, 0.12, 1.8),
      new MeshStandardMaterial({
        color: new Color(r, g, b),
        emissive: new Color(emissive),
        emissiveIntensity: 0.5,
        roughness: 0.7,
      }),
    )
    platform.position.set(0, -0.2, z)
    return platform
  }

  private buildTraceTower(): void {
    // Trace Tower base + 4 span slots stacked vertically.
    const base = new Mesh(
      new BoxGeometry(1.6, 0.3, 1.6),
      new MeshStandardMaterial({
        color: new Color(0x1a2238),
        emissive: new Color(0x0a1020),
        roughness: 0.7,
      }),
    )
    base.position.set(TRACE_TOWER_X, -0.2, 1.5)
    this.scene.add(base)
    for (let i = 0; i < 4; i += 1) {
      const slot = new Mesh(
        new BoxGeometry(1.2, 0.7, 1.2),
        new MeshBasicMaterial({ color: new Color(0x22304a) }),
      )
      slot.position.set(TRACE_TOWER_X, 0.4 + i * 0.85, 1.5)
      this.scene.add(slot)
      this.traceSlots.push(slot)
    }
    // Tower pillar.
    const pillar = new Mesh(
      new BoxGeometry(0.1, 4.5, 0.1),
      new MeshBasicMaterial({ color: new Color(0x3a4a6a) }),
    )
    pillar.position.set(TRACE_TOWER_X + 0.8, 2, 1.5)
    this.scene.add(pillar)
  }

  private buildProbe(): Mesh {
    // The query probe — a small cone that hovers over the reservoir and
    // sweeps when Z fires.
    const probe = new Mesh(
      new BoxGeometry(0.5, 0.5, 0.9),
      new MeshStandardMaterial({
        color: new Color(0x66ddff),
        emissive: new Color(0x66ddff),
        emissiveIntensity: 0.8,
        roughness: 0.3,
      }),
    )
    probe.position.set(0, 1.5, 3.5)
    return probe
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  // Project the supplied RiverState onto the scene graph for this frame.
  sync(state: RiverState, _nowMs: number): void {
    const t = this.clock.getElapsedTime()

    // Weir slot fill — light up slots[0..used-1].
    for (let i = 0; i < this.weirSlots.length; i += 1) {
      const slot = this.weirSlots[i]
      if (slot === undefined) {
        continue
      }
      const filled = i < state.weirSlotsUsed
      const mat = slot.material as MeshBasicMaterial
      mat.color.setHex(filled ? 0xffaa33 : 0x22304a)
    }

    // Indexer channels pulse when there are fresh (hot) logs.
    const freshHot = state.metrics.hot_segments
    for (let i = 0; i < this.indexerChannels.length; i += 1) {
      const channel = this.indexerChannels[i]
      if (channel === undefined) {
        continue
      }
      const mat = channel.material as MeshBasicMaterial
      const lit = freshHot > 0 ? 0.4 + 0.4 * Math.sin(t * 6 + i) : 0.15
      mat.color.setRGB(0.2 * lit + 0.1, 0.5 * lit + 0.1, 0.9 * lit + 0.1)
    }

    // Trace tower slots — light up as spans are stacked.
    for (let i = 0; i < this.traceSlots.length; i += 1) {
      const slot = this.traceSlots[i]
      if (slot === undefined) {
        continue
      }
      const dropped = state.traceTower[i]
      const mat = slot.material as MeshBasicMaterial
      if (dropped === undefined) {
        mat.color.setHex(0x22304a)
      } else {
        const [r, g, b] = correlationDye(dropped.correlation_id, this.dyePalette)
        mat.color.setRGB(r, g, b)
      }
    }

    // Probe sweep animation — when a query was just fired (lastQueryMatches
    // non-empty OR lastQueryTooBroad), brighten and bob the probe.
    const probeActive = state.lastQueryMatches.length > 0 || state.lastQueryTooBroad
    const probeMat = this.probe.material as MeshStandardMaterial
    probeMat.emissiveIntensity = probeActive ? 1.4 : 0.4
    this.probeLight.intensity = probeActive ? 2.5 : 0.0
    this.probe.position.x = Math.sin(t * 1.5) * 2.5
    this.probe.position.y = 1.5 + Math.sin(t * 3) * 0.3
    this.probe.rotation.y = t * 1.5

    // Reset droplet pool — we rebind each frame based on state.
    for (const visual of this.dropletPool) {
      visual.mesh.visible = false
      if (visual.ice !== undefined) {
        visual.ice.visible = false
      }
    }
    this.dropletByLogId.clear()

    // Render tributary droplets for the pending burst (one burst at a time).
    if (state.currentBurst !== null) {
      const burst = state.currentBurst
      const sourceIdx = SOURCES.indexOf(burst.source)
      const x0 = TRIBUTARY_X[sourceIdx] ?? 0
      const progress = 1 - state.batch_window_ms / 6000
      burst.entries.forEach((entry, i) => {
        const visual = this.acquire(entry.log_id)
        if (visual === undefined) {
          return
        }
        const lane = (i % 6) - 2.5
        const z = TRIBUTARY_Z + (WEIR_Z - TRIBUTARY_Z) * clamp01(progress + i * 0.03)
        visual.target.set(x0 + lane * 0.15, 0.2, z)
        this.applyDropletColor(visual, entry, 1, false)
        visual.scale = 1
      })
    }

    // Render indexed logs into their tier zones.
    state.indexed.forEach((log, i) => {
      const visual = this.acquire(log.entry.log_id)
      if (visual === undefined) {
        return
      }
      const pos = this.positionForLog(log, i, state.filter, t)
      visual.target.copy(pos)
      const isIce = log.tier === "cold"
      this.applyDropletColor(visual, log.entry, log.tier === "hot" ? 1.2 : 0.9, log.magnetized)
      visual.scale = isIce ? 0.4 : 1
      if (visual.ice !== undefined) {
        visual.ice.visible = isIce
        if (isIce) {
          const [r, g, b] = correlationDye(log.entry.correlation_id, this.dyePalette)
          const mat = visual.ice.material as MeshStandardMaterial
          mat.color.setRGB(0.4 + r * 0.3, 0.6 + g * 0.3, 0.9)
          mat.emissive.setRGB(r * 0.2, g * 0.2, b * 0.3)
        }
      }
    })

    // Ease every active visual toward its target.
    for (const visual of this.dropletPool) {
      if (!visual.mesh.visible) {
        continue
      }
      visual.mesh.position.lerp(visual.target, 0.18)
      visual.mesh.scale.setScalar(visual.scale)
      if (visual.ice !== undefined && visual.ice.visible) {
        visual.ice.position.copy(visual.mesh.position)
        visual.ice.scale.setScalar(visual.scale)
      }
    }

    // Camera slow drift — life without OrbitControls complexity.
    this.camera.position.x = Math.sin(t * 0.1) * 1.2
    this.camera.lookAt(0, 0, 2)
  }

  private positionForLog(log: IndexedLog, index: number, _filter: QueryFilter, t: number): Vector3 {
    // Trace tower drop takes precedence.
    if (log.in_trace) {
      const stackIdx = Math.max(0, index)
      return new Vector3(TRACE_TOWER_X, 0.4 + stackIdx * 0.85, 1.5)
    }
    // Magnetized (query result) droplets fly to the result rail.
    if (log.magnetized) {
      const railX = -8 + index * 0.4
      return new Vector3(railX, 1.0 + Math.sin(t * 3 + index) * 0.2, 4)
    }
    // Otherwise position by tier.
    const jitterX = ((index * 0.7) % 8) - 4
    const jitterZ = ((index * 1.3) % 1.2) - 0.6
    if (log.tier === "hot") {
      return new Vector3(jitterX, 0.1, TIER_HOT_Z + jitterZ)
    }
    if (log.tier === "warm") {
      return new Vector3(jitterX, 0.1, TIER_WARM_Z + jitterZ)
    }
    if (log.tier === "cold") {
      return new Vector3(jitterX, 0.1, TIER_COLD_Z + jitterZ)
    }
    // Evicted droplets fade offscreen (the visual gets hidden by the caller
    // because we don't acquire them once tier === "evicted").
    return new Vector3(jitterX, -2, TIER_COLD_Z + jitterZ)
  }

  private acquire(logId: string): DropletVisual | undefined {
    const existing = this.dropletByLogId.get(logId)
    if (existing !== undefined) {
      existing.mesh.visible = true
      return existing
    }
    const free = this.dropletPool.find((v) => !v.mesh.visible)
    if (free === undefined) {
      return undefined
    }
    free.mesh.visible = true
    this.dropletByLogId.set(logId, free)
    return free
  }

  private applyDropletColor(
    visual: DropletVisual,
    entry: LogEntry,
    intensity: number,
    magnetized: boolean,
  ): void {
    const levelRgb = levelColor(entry.level as LogLevel)
    const dye = correlationDye(entry.correlation_id, this.dyePalette)
    const mat = visual.mesh.material as MeshStandardMaterial
    if (magnetized) {
      // Magnetized droplets glow with their dye color so the player can
      // follow the correlation trail.
      mat.color.setRGB(dye[0], dye[1], dye[2])
      mat.emissive.setRGB(dye[0], dye[1], dye[2])
      mat.emissiveIntensity = 1.2
    } else {
      mat.color.setRGB(
        (levelRgb[0] + dye[0]) * 0.5,
        (levelRgb[1] + dye[1]) * 0.5,
        (levelRgb[2] + dye[2]) * 0.5,
      )
      mat.emissive.setRGB(levelRgb[0] * 0.6, levelRgb[1] * 0.6, levelRgb[2] * 0.6)
      mat.emissiveIntensity = 0.5 * intensity
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.renderer.dispose()
    if (this.renderer.domElement.parentElement === this.holder) {
      this.holder.removeChild(this.renderer.domElement)
    }
  }
}

function clamp01(v: number): number {
  if (v < 0) {
    return 0
  }
  if (v > 1) {
    return 1
  }
  return v
}

// === HUD projection helpers (used by main.ts to render the HUD overlay) ===

export type HudView = {
  readonly phase: Phase
  readonly weirUsed: number
  readonly weirMax: number
  readonly burstRemaining: number
  readonly burstWindowMax: number
  readonly contractPrompt: string | null
  readonly filter: QueryFilter
  readonly activeSource: LogSource | null
  readonly pendingBurstCount: number
  readonly metrics: Metrics
  readonly banner: string | null
  readonly bannerKind: "pass" | "fail" | "info" | null
  readonly toast: string | null
}

export function hudView(state: RiverState): HudView {
  return {
    phase: state.phase,
    weirUsed: state.weirSlotsUsed,
    weirMax: state.weirSlotsMax,
    burstRemaining: Math.max(0, state.batch_window_ms),
    burstWindowMax: 6000,
    contractPrompt: state.activeContract?.prompt ?? null,
    filter: state.filter,
    activeSource: state.currentBurst?.source ?? null,
    pendingBurstCount: state.bursts.length - state.burstIndex,
    metrics: state.metrics,
    banner: state.banner,
    bannerKind: state.bannerKind,
    toast: state.toast,
  }
}
