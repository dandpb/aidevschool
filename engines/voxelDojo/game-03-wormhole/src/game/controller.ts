import { emitEvidence } from "../evidence/emit"
import {
  applyResolution,
  type CollisionPrediction,
  evaluateCodePredictions,
  evaluateCollisionPredictions,
  evaluateRedirectPredictions,
  LEVELS,
  type LevelConfig,
  type LevelId,
  levelConfig,
  predictedCode,
  type ResolutionStrategy,
  seedMap,
  urlsFor,
  withForcedCollision,
  wouldCollide,
} from "../sim/levels"
import { hashTruncCode, redirect, type ShortMap, shorten } from "../sim/shortener"

export type Phase = "briefing" | "predicting" | "resolving" | "cleared" | "failed"

export interface GameState {
  level: LevelConfig
  phase: Phase
  urls: string[]
  /** the live shortener map (code → entry) */
  map: ShortMap
  /** L1/L3: index of the URL the player is currently predicting */
  pendingIndex: number
  correctPredictions: number
  /** L2: how many redirects the player has answered so far */
  redirectTotal: number
  redirectCorrect: number
  /** L3: collision predictions collected this wave */
  collisionPredictions: CollisionPrediction[]
  /** L4: the constructed colliding pair + the code they fight over */
  colliderIndex: number
  collisionCode: string | null
  chosenResolution: ResolutionStrategy | null
  lastMetrics: Record<string, number | boolean | string> | null
}

export type Listener = (state: GameState) => void

/** Resolution options offered in L4. */
export const RESOLUTION_OPTIONS: readonly ResolutionStrategy[] = ["salted", "increment"] as const

export class GameController {
  private state: GameState
  private listeners: Listener[] = []

  constructor(level: LevelId = "L1") {
    this.state = this.freshState(levelConfig(level))
  }

  private freshState(cfg: LevelConfig): GameState {
    const stream = urlsFor(cfg)
    const { urls, colliderIndex } = withForcedCollision(stream, cfg)
    // L1/L3/L4 start empty (player shortens as they go). L2 is pre-seeded so the player
    // predicts redirects off an existing map.
    const map: ShortMap = cfg.id === "L2" ? seedMap(urls, cfg.strategy) : new Map()
    return {
      level: cfg,
      phase: "briefing",
      urls,
      map,
      pendingIndex: 0,
      correctPredictions: 0,
      redirectTotal: 0,
      redirectCorrect: 0,
      collisionPredictions: [],
      colliderIndex,
      collisionCode: null,
      chosenResolution: null,
      lastMetrics: null,
    }
  }

  get snapshot(): GameState {
    return this.state
  }

  subscribe(fn: Listener): void {
    this.listeners.push(fn)
    fn(this.state)
  }

  private commit(): void {
    for (const fn of this.listeners) fn(this.state)
  }

  start(): void {
    const cfg = this.state.level
    this.state.phase = "predicting"
    if (cfg.id === "L4") {
      // Pre-stamp the first URL of the colliding pair so the second one collides with it.
      const firstUrl = this.state.urls[this.state.colliderIndex - 1]
      if (firstUrl !== undefined) {
        this.state.map = shorten(this.state.map, firstUrl, cfg.strategy).map
        const collider = this.state.urls[this.state.colliderIndex]
        if (collider !== undefined) {
          this.state.collisionCode = hashTruncCode(collider)
        }
      }
    }
    this.commit()
  }

  loadLevel(level: LevelId): void {
    this.state = this.freshState(levelConfig(level))
    this.commit()
  }

  nextLevel(): void {
    const idx = LEVELS.findIndex((l) => l.id === this.state.level.id)
    const next = LEVELS[idx + 1]
    if (next) this.loadLevel(next.id)
  }

  retry(): void {
    this.loadLevel(this.state.level.id)
    this.start()
  }

  // ── L1: predict the code ───────────────────────────────────────────────────

  /** Ground-truth code for the pending URL (HUD hint + smoke hook). */
  predictedCodeForPending(): string {
    const url = this.state.urls[this.state.pendingIndex]
    if (url === undefined) return ""
    return predictedCode(url, this.state.level.strategy, this.state.map.size)
  }

  predictCode(code: string): void {
    if (this.state.level.id !== "L1" || this.state.phase !== "predicting") return
    const url = this.state.urls[this.state.pendingIndex]
    if (url === undefined) return
    const truth = this.predictedCodeForPending()
    if (truth === code) this.state.correctPredictions++
    this.state.map = shorten(this.state.map, url, this.state.level.strategy).map
    this.state.pendingIndex++
    if (this.state.pendingIndex >= this.state.urls.length) {
      this.finishWave(
        evaluateCodePredictions(
          this.state.correctPredictions,
          this.state.urls.length,
          this.state.level.strategy,
        ),
      )
    }
    this.commit()
  }

  // ── L2: predict the destination ────────────────────────────────────────────

  /** The code whose destination the player must predict next (HUD + smoke). */
  currentRedirectCode(): string | null {
    if (this.state.level.id !== "L2") return null
    const codes = [...this.state.map.keys()]
    return codes[this.state.redirectTotal] ?? null
  }

  /** Ground-truth destination URL for the current redirect code (smoke hook). */
  currentRedirectDestination(): string | null {
    const code = this.currentRedirectCode()
    if (code === null) return null
    return redirect(this.state.map, code).url
  }

  predictDestination(url: string): void {
    if (this.state.level.id !== "L2" || this.state.phase !== "predicting") return
    const code = this.currentRedirectCode()
    if (code === null) return
    const truth = redirect(this.state.map, code).url
    if (truth === url) this.state.redirectCorrect++
    this.state.redirectTotal++
    if (this.state.redirectTotal >= this.state.urls.length) {
      this.finishWave(
        evaluateRedirectPredictions(this.state.redirectCorrect, this.state.urls.length),
      )
    }
    this.commit()
  }

  // ── L3: predict the collision ──────────────────────────────────────────────

  /** The URL the player must currently classify as colliding-or-not (HUD + smoke). */
  currentCollisionUrl(): string | null {
    if (this.state.level.id !== "L3") return null
    return this.state.urls[this.state.pendingIndex] ?? null
  }

  predictCollision(predictedCollision: boolean): void {
    if (this.state.level.id !== "L3" || this.state.phase !== "predicting") return
    const url = this.state.urls[this.state.pendingIndex]
    if (url === undefined) return
    const actual = wouldCollide(this.state.map, url)
    this.state.collisionPredictions.push({ url, predictedCollision, actualCollision: actual })
    // commit the URL into the map so subsequent collisions are judged against a growing set
    this.state.map = shorten(this.state.map, url, this.state.level.strategy).map
    this.state.pendingIndex++
    if (this.state.pendingIndex >= this.state.urls.length) {
      this.finishWave(evaluateCollisionPredictions(this.state.collisionPredictions))
    }
    this.commit()
  }

  // ── L4: pick the resolution ────────────────────────────────────────────────

  /** The colliding URL in L4 (HUD + smoke). */
  colliderUrl(): string | null {
    if (this.state.level.id !== "L4") return null
    return this.state.urls[this.state.colliderIndex] ?? null
  }

  pickResolution(chosen: ResolutionStrategy): void {
    if (this.state.level.id !== "L4" || this.state.phase !== "predicting") return
    const url = this.state.urls[this.state.colliderIndex]
    const code = this.state.collisionCode
    if (url === undefined || code === null) return
    const {
      code: resolvedCode,
      resolved,
      map: resolvedMap,
    } = applyResolution({
      url,
      collidingCode: code,
      map: this.state.map,
      chosen,
    })
    const redir = redirect(resolvedMap, resolvedCode)
    const cleanRedirect = redir.found && redir.url === url
    const pass = resolved && cleanRedirect
    this.state.chosenResolution = chosen
    if (resolved) this.state.map = resolvedMap
    this.finishWave({
      pass,
      metrics: {
        resolution_chosen: chosen,
        resolved_code: resolvedCode,
        resolved_unique: resolved,
        redirect_ok: cleanRedirect,
      },
    })
    this.commit()
  }

  // ── helpers / truth ────────────────────────────────────────────────────────

  private finishWave(outcome: {
    pass: boolean
    metrics: Record<string, number | boolean | string>
  }): void {
    this.state.lastMetrics = outcome.metrics
    this.state.phase = outcome.pass ? "cleared" : "failed"
    emitEvidence(this.state.level.id, outcome.pass, outcome.metrics)
  }
}
