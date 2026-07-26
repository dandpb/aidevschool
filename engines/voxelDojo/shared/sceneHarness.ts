/**
 * Scene harness for voxelDojo games.
 *
 * The `main.ts` bootstrap was byte-identical across all 16 games except for
 * five variable slots: the Scene constructor, the `__<slug>` window hook name,
 * a click-wiring callback, a state-subscribe callback, and `scene.sync` arity
 * (warehouse passes the controller; air-traffic has an edge-triggered side
 * effect). This factory captures the invariant DOM-wiring skeleton.
 *
 * The scene type is left unconstrained (no `sync` signature requirement) because
 * games differ: game-10 passes `loads: Map`, warehouse passes the controller,
 * others pass nothing extra. Callers wire `onState` to match their scene's sync.
 */
import type {
  RendererFailureReason,
  RendererPreference,
  TeachingGameHostAdapter,
  TeachingGameMissionState,
} from "@aidevschool/evidence/host-protocol"
import type { MissionProjection, ProjectionContextHooks } from "./projection"

export interface SceneHarnessController<TState> {
  subscribe(fn: (state: TState) => void): void
}

export interface SceneHarnessOptions<
  TState,
  TController extends SceneHarnessController<TState>,
  TScene,
> {
  /** Constructs the game controller (called with "L1" by convention). */
  createGame: () => TController
  /** Constructs the scene from the canvas element. */
  createScene?: (canvas: HTMLCanvasElement) => TScene
  /** Window global hook name (e.g. "__hashRing"). Exposes `{ game }` for Playwright. */
  windowKey: string
  /**
   * Wire per-game interaction handlers onto the scene (e.g. `scene.onStationClick`).
   * Receives the controller and scene; default is a no-op.
   */
  wireInteraction?: (game: TController, scene: TScene) => void
  /**
   * Subscribe body invoked on every state change. There is no default because
   * scenes have different `sync` arities — every caller wires this explicitly.
   */
  onState?: (state: TState, game: TController, scene: TScene) => void
  /** HUD mount function from the game's scene/hud.ts. */
  mountHud: (root: HTMLElement, game: TController) => void
  /** Optional mission-host lifecycle; simulation state remains authoritative. */
  hostedMission?: {
    readonly adapter: TeachingGameHostAdapter
    readonly launch: (game: TController) => void | Promise<void>
    readonly projectState: (state: TState) => TeachingGameMissionState
  }
  /** Optional recoverable projection lifecycle for hosted and standalone missions. */
  renderer?: {
    readonly loadWebgl: (
      canvas: HTMLCanvasElement,
      game: TController,
      hooks: ProjectionContextHooks,
    ) => Promise<MissionProjection<TState>>
    readonly createAccessible: (
      target: HTMLElement,
      game: TController,
      controlsRoot: HTMLElement,
    ) => MissionProjection<TState>
    readonly probeWebgl?: () => boolean
    readonly initializationTimeoutMs?: number
  }
}

const DEFAULT_RENDERER_TIMEOUT_MS = 8_000

/**
 * Wire a voxelDojo game to the DOM. Looks up `#stage` and `#hud`, constructs
 * the game + scene, wires interaction + subscribe, mounts the HUD, and exposes
 * the game on `window[windowKey]` for Playwright smoke specs.
 *
 * Throws if `#stage` or `#hud` are missing (same contract as the inline bootstrap).
 */
export function createSceneHarness<
  TState,
  TController extends SceneHarnessController<TState>,
  TScene,
>(opts: SceneHarnessOptions<TState, TController, TScene>): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#stage")
  const hudRoot = document.querySelector<HTMLElement>("#hud")
  if (!canvas || !hudRoot) throw new Error("missing #stage or #hud")

  const game = opts.createGame()
  opts.mountHud(hudRoot, game)
  hudRoot.setAttribute("aria-label", "Controles e explicação da missão")

  if (!Reflect.set(window, opts.windowKey, { game })) {
    throw new TypeError(`unable to expose window hook ${opts.windowKey}`)
  }

  if (opts.renderer !== undefined) {
    createRecoverableRendererHarness(canvas, hudRoot, game, opts)
    return
  }

  if (opts.createScene === undefined || opts.onState === undefined) {
    throw new Error("legacy scene harness requires createScene and onState")
  }
  const scene = opts.createScene(canvas)
  opts.wireInteraction?.(game, scene)
  game.subscribe((state) => opts.onState?.(state, game, scene))
  if (opts.hostedMission !== undefined) {
    const hostedMission = opts.hostedMission
    hostedMission.adapter.start(() => hostedMission.launch(game))
    game.subscribe((state) => hostedMission.adapter.publishState(hostedMission.projectState(state)))
  }
}

function createRecoverableRendererHarness<
  TState,
  TController extends SceneHarnessController<TState>,
  TScene,
>(
  canvas: HTMLCanvasElement,
  hudRoot: HTMLElement,
  game: TController,
  opts: SceneHarnessOptions<TState, TController, TScene>,
): void {
  const renderer = opts.renderer
  if (renderer === undefined) return
  const accessibleTarget = document.createElement("div")
  accessibleTarget.className = "accessible-stage"
  accessibleTarget.hidden = true
  canvas.insertAdjacentElement("afterend", accessibleTarget)
  canvas.tabIndex = 0

  let projection: MissionProjection<TState> | null = null
  let latestState: TState | undefined
  let generation = 0
  let disposed = false

  const publishRenderer = (
    requested: RendererPreference,
    active: "webgl" | "dom" | "none",
    status: "probing" | "initializing" | "ready" | "degraded" | "failed",
    reason?: RendererFailureReason,
  ): void => {
    opts.hostedMission?.adapter.publishRendererState({
      requested,
      active,
      status,
      ...(reason === undefined ? {} : { reason }),
    })
  }

  const disposeProjection = (): void => {
    const current = projection
    projection = null
    current?.dispose()
  }

  const showProjection = (active: "webgl" | "dom"): void => {
    canvas.hidden = active !== "webgl"
    accessibleTarget.hidden = active !== "dom"
  }

  const install = (
    next: MissionProjection<TState>,
    active: "webgl" | "dom",
    requested: RendererPreference,
    reason?: RendererFailureReason,
  ): void => {
    if (disposed) {
      next.dispose()
      return
    }
    projection = next
    showProjection(active)
    next.mount(active === "webgl" ? canvas.parentElement ?? document.body : accessibleTarget)
    if (latestState !== undefined) next.sync(latestState)
    publishRenderer(requested, active, reason === undefined ? "ready" : "degraded", reason)
  }

  const activateAccessible = (
    requested: RendererPreference,
    reason?: RendererFailureReason,
  ): void => {
    generation += 1
    disposeProjection()
    publishRenderer(requested, "dom", "initializing")
    try {
      install(renderer.createAccessible(accessibleTarget, game, hudRoot), "dom", requested, reason)
    } catch {
      publishRenderer(requested, "none", "failed", reason ?? "creation-failed")
    }
  }

  const activate = async (
    requested: RendererPreference,
    reducedMotion = false,
  ): Promise<void> => {
    generation += 1
    const currentGeneration = generation
    disposeProjection()
    publishRenderer(requested, "none", "probing")
    if (requested === "accessible" || reducedMotion) {
      activateAccessible(requested)
      return
    }
    const supported = renderer.probeWebgl?.() ?? probeWebgl2()
    if (!supported) {
      activateAccessible(requested, "unsupported")
      return
    }
    publishRenderer(requested, "webgl", "initializing")
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const load = renderer
        .loadWebgl(canvas, game, {
          onContextLost: () => {
            if (currentGeneration === generation) activateAccessible(requested, "context-lost")
          },
          onContextRestored: () => {
            if (currentGeneration === generation) publishRenderer(requested, "webgl", "ready")
          },
          onContextCreationError: () => undefined,
        })
        .then((next) => {
          if (disposed || currentGeneration !== generation) {
            next.dispose()
            throw new StaleProjectionError()
          }
          return next
        })
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new ProjectionTimeoutError()),
          renderer.initializationTimeoutMs ?? DEFAULT_RENDERER_TIMEOUT_MS,
        )
      })
      const next = await Promise.race([load, timeoutPromise])
      if (disposed || currentGeneration !== generation) {
        next.dispose()
        return
      }
      install(next, "webgl", requested)
    } catch (error) {
      if (disposed || currentGeneration !== generation) return
      activateAccessible(
        requested,
        error instanceof ProjectionTimeoutError ? "load-timeout" : "creation-failed",
      )
    } finally {
      if (timeout !== undefined) clearTimeout(timeout)
    }
  }

  game.subscribe((state) => {
    latestState = state
    projection?.sync(state)
    if (opts.hostedMission !== undefined) {
      opts.hostedMission.adapter.publishState(opts.hostedMission.projectState(state))
    }
  })

  if (opts.hostedMission !== undefined) {
    const hostedMission = opts.hostedMission
    hostedMission.adapter.start(
      async (launch) => {
        await activate(launch.rendererPreference, launch.reducedMotion)
        await hostedMission.launch(game)
      },
      (preference) => activate(preference),
    )
    if (!hostedMission.adapter.hosted) void activate("auto")
  } else {
    void activate("auto")
  }

  window.addEventListener(
    "beforeunload",
    () => {
      disposed = true
      generation += 1
      disposeProjection()
    },
    { once: true },
  )
}

function probeWebgl2(): boolean {
  try {
    const probe = document.createElement("canvas")
    return probe.getContext("webgl2") !== null
  } catch {
    return false
  }
}

class ProjectionTimeoutError extends Error {}
class StaleProjectionError extends Error {}
