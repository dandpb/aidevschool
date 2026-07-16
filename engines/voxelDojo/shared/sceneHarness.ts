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
  createScene: (canvas: HTMLCanvasElement) => TScene
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
  onState: (state: TState, game: TController, scene: TScene) => void
  /** HUD mount function from the game's scene/hud.ts. */
  mountHud: (root: HTMLElement, game: TController) => void
}

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
  const scene = opts.createScene(canvas)

  opts.wireInteraction?.(game, scene)
  game.subscribe((state) => opts.onState(state, game, scene))
  opts.mountHud(hudRoot, game)

  const w = window as unknown as Record<string, unknown>
  w[opts.windowKey] = { game }
}
