import * as THREE from "three"

/**
 * Day-phase buckets, in 24-hour wall time.
 * Boundaries inclusive of start hour, exclusive of end hour.
 * Source of truth: docs/concepts/CONCEPTS.md > Day/Night cycle.
 */
export const PHASE_BOUNDARIES: ReadonlyArray<{ phase: DayPhase; start: number; end: number }> = [
  { phase: "night", start: 0, end: 5 },
  { phase: "dawn", start: 5, end: 7 },
  { phase: "morning", start: 7, end: 11 },
  { phase: "noon", start: 11, end: 14 },
  { phase: "afternoon", start: 14, end: 17 },
  { phase: "sunset", start: 17, end: 19 },
  { phase: "dusk", start: 19, end: 20 },
  { phase: "night", start: 20, end: 24 },
]

export type DayPhase = "dawn" | "morning" | "noon" | "afternoon" | "sunset" | "dusk" | "night"

export interface DayNightPalette {
  /** Sky background colour at peak daytime (zenith side of the gradient). */
  readonly skyDay: THREE.Color
  /** Sky background colour at horizon (lighter / warmer) at peak daytime. */
  readonly skyDayHorizon: THREE.Color
  /** Sky background colour at peak night. */
  readonly skyNight: THREE.Color
  /** Sky background colour at horizon during night. */
  readonly skyNightHorizon: THREE.Color
  /** Warm sun glow at dawn / sunset. */
  readonly sunWarm: THREE.Color
  /** Midday white-yellow sun. */
  readonly sunMidday: THREE.Color
  /** Cool night fill. */
  readonly skyFill: THREE.Color
  /** Hemisphere top colour (sky hemisphere). */
  readonly hemiTop: THREE.Color
  /** Hemisphere bottom colour (ground bounce). */
  readonly hemiBottom: THREE.Color
  /** Daytime hemisphere colours (warm sky / cool ground). */
  readonly hemiTopDay: THREE.Color
  readonly hemiBottomDay: THREE.Color
  /** Night hemisphere colours (cool sky / cool ground). */
  readonly hemiTopNight: THREE.Color
  readonly hemiBottomNight: THREE.Color
  /** Fog colour day / night. */
  readonly fogDay: THREE.Color
  readonly fogNight: THREE.Color
}

export const DEFAULT_PALETTE: DayNightPalette = {
  skyDay: new THREE.Color("#a3d0e8"),
  skyDayHorizon: new THREE.Color("#cfe6f0"),
  skyNight: new THREE.Color("#0d1424"),
  skyNightHorizon: new THREE.Color("#1a2238"),
  sunWarm: new THREE.Color("#ffb074"),
  sunMidday: new THREE.Color("#fff4d6"),
  skyFill: new THREE.Color("#5d6b88"),
  hemiTop: new THREE.Color("#a3d0e8"),
  hemiBottom: new THREE.Color("#7fa572"),
  hemiTopDay: new THREE.Color("#a3d0e8"),
  hemiBottomDay: new THREE.Color("#7fa572"),
  hemiTopNight: new THREE.Color("#1a2238"),
  hemiBottomNight: new THREE.Color("#0d1424"),
  fogDay: new THREE.Color("#c0d5e0"),
  fogNight: new THREE.Color("#1a2238"),
}

/** Real seconds per in-sim 24h cycle. The spec says 5 minutes = 300 s. */
export const SIM_SECONDS_PER_CYCLE = 300

/** Convert real seconds to in-sim hours. */
export const realSecondsToSimHours = (realSeconds: number): number =>
  (realSeconds / SIM_SECONDS_PER_CYCLE) * 24

/** Phase for a given simTime in 0..24 (out-of-range values are wrapped). */
export function phaseFor(simTime: number): DayPhase {
  const h = ((simTime % 24) + 24) % 24
  for (const b of PHASE_BOUNDARIES) {
    if (h >= b.start && h < b.end) return b.phase
  }
  return "night"
}

/**
 * Sun direction (XZ plane arc) and height for a given simTime.
 * East horizon at 6, zenith at 12, west horizon at 18, below from 18→6.
 * Y is up. We do not care about geographic realism — the visual arc is enough.
 */
export function sunPositionFor(simTime: number, radius = 80): THREE.Vector3 {
  const h = ((simTime % 24) + 24) % 24
  // Angle: 0 at 6h (east, x=+1), PI/2 at 12h (zenith, y=+1), PI at 18h (west, x=-1).
  const t = ((h - 6) / 12) * Math.PI
  const x = Math.cos(t) * radius
  const y = Math.sin(t) * radius
  const z = -10 // small offset for shadow angle variety
  return new THREE.Vector3(x, y, z)
}

/**
 * Sun intensity for a given simTime. Reaches 1 at noon, fades to 0 at horizon,
 * 0 below horizon (only hemisphere/ambient carry the scene at night).
 */
export function sunIntensityFor(simTime: number): number {
  const h = ((simTime % 24) + 24) % 24
  if (h <= 5 || h >= 20) return 0
  if (h <= 7) return THREE.MathUtils.smoothstep(h, 5, 7) * 0.6
  if (h >= 17) return THREE.MathUtils.lerp(0.6, 0, THREE.MathUtils.smoothstep(h, 17, 19))
  // Daytime ramp: 0.6 at 7, 1.0 at 12, 1.0 at 17
  if (h <= 12) return THREE.MathUtils.lerp(0.6, 1.0, (h - 7) / 5)
  return THREE.MathUtils.lerp(1.0, 0.6, (h - 12) / 5)
}

/** Sun colour interpolation. Warm at edges, white-yellow at zenith. */
function sunColorFor(simTime: number, target: THREE.Color, palette: DayNightPalette): void {
  const h = ((simTime % 24) + 24) % 24
  if (h <= 5 || h >= 20) {
    target.set(palette.skyFill)
    return
  }
  // closeness to 6 or 18 (horizons) ⇒ warmer.
  const distToHorizon = Math.min(Math.abs(h - 6), Math.abs(h - 18))
  const warmness = THREE.MathUtils.clamp(1 - distToHorizon / 4, 0, 1)
  target.copy(palette.sunWarm).lerp(palette.sunMidday, warmness)
}

/** Sky / fog colour mix factor: 1 = full day, 0 = full night. */
function dayMixFor(simTime: number): number {
  const h = ((simTime % 24) + 24) % 24
  if (h <= 5 || h >= 20) return 0
  if (h <= 7) return THREE.MathUtils.smoothstep(h, 5, 7)
  if (h >= 17) return 1 - THREE.MathUtils.smoothstep(h, 17, 19)
  return 1
}

export interface DayNightDeltas {
  /** Current phase string. */
  readonly phase: DayPhase
  /** Current sim time in 0..24, wrapped. */
  readonly simTime: number
  /** Sun direction (world space). */
  readonly sunPosition: THREE.Vector3
  /** Sun intensity (0..1). */
  readonly sunIntensity: number
  /** Sun colour (mixed from palette). */
  readonly sunColor: THREE.Color
  /** Sky zenith colour. */
  readonly skyZenith: THREE.Color
  /** Sky horizon colour. */
  readonly skyHorizon: THREE.Color
  /** Fog colour. */
  readonly fogColor: THREE.Color
  /** Hemisphere top colour. */
  readonly hemiTop: THREE.Color
  /** Hemisphere bottom colour. */
  readonly hemiBottom: THREE.Color
  /** Ambient light intensity. */
  readonly ambientIntensity: number
  /** Hemisphere light intensity. */
  readonly hemiIntensity: number
}

/**
 * Pure day/night simulation. No THREE side-effects, no DOM. Tests can call
 * `tick(60)` repeatedly and assert phase / colour interpolation deterministically.
 */
export class DayNightSystem {
  #simTime: number
  readonly #palette: DayNightPalette

  constructor(initialSimTime = 8, palette: DayNightPalette = DEFAULT_PALETTE) {
    this.#simTime = ((initialSimTime % 24) + 24) % 24
    this.#palette = palette
  }

  /** Advance simulation by real `dt` seconds. Returns deltas for renderers. */
  tick(dt: number): DayNightDeltas {
    this.#simTime = (this.#simTime + realSecondsToSimHours(dt) + 24) % 24
    return this.deltas()
  }

  /** Pure snapshot of current state (no mutation). */
  deltas(): DayNightDeltas {
    const h = this.#simTime
    const mix = dayMixFor(h)
    const sunIntensity = sunIntensityFor(h)
    const sunPosition = sunPositionFor(h)

    const sunColor = new THREE.Color()
    sunColorFor(h, sunColor, this.#palette)

    const skyZenith = this.#palette.skyNight.clone().lerp(this.#palette.skyDay, mix)
    const skyHorizon = this.#palette.skyNightHorizon.clone().lerp(this.#palette.skyDayHorizon, mix)
    const fogColor = this.#palette.fogNight.clone().lerp(this.#palette.fogDay, mix)
    const hemiTop = this.#palette.hemiTopNight.clone().lerp(this.#palette.hemiTopDay, mix)
    const hemiBottom = this.#palette.hemiBottomNight.clone().lerp(this.#palette.hemiBottomDay, mix)
    const ambientIntensity = THREE.MathUtils.lerp(0.18, 0.55, mix)
    const hemiIntensity = THREE.MathUtils.lerp(0.25, 0.7, mix)

    return {
      phase: phaseFor(h),
      simTime: h,
      sunPosition,
      sunIntensity,
      sunColor,
      skyZenith,
      skyHorizon,
      fogColor,
      hemiTop,
      hemiBottom,
      ambientIntensity,
      hemiIntensity,
    }
  }

  get simTime(): number {
    return this.#simTime
  }

  get phase(): DayPhase {
    return phaseFor(this.#simTime)
  }
}
