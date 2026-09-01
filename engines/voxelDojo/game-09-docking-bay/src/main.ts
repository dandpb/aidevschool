import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createDockingAccessibleProjection } from "./scene/accessible"
import { DockingScene } from "./scene/dockingScene"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __dockingBay?: { game: GameController }
  }
}

/** L4 has no fixed answer count; four grant toggles bound the progress denominator. */
const L4_GRANT_SLOTS = 4

/** The scene's sync already folds everything it needs from the snapshot (the
 * dock truth is delegated to the clamp's own contract check), so the WebGL
 * projection is a passthrough — recoverable, focusable, disposable. */
function bayProjection(scene: DockingScene): MissionProjection<GameState> {
  return {
    mount: () => scene.mount(),
    focus: () => scene.focus(),
    dispose: () => scene.dispose(),
    sync: (state) => scene.sync(state),
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => new GameController("L1"),
  windowKey: "__dockingBay",
  mountHud,
  renderer: {
    loadWebgl: async (canvas) => bayProjection(new DockingScene(canvas)),
    createAccessible: (_target, game, controlsRoot) =>
      createDockingAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-09-docking-bay",
      missionVersion: 1,
      unitId: "U9-plugin-system",
      engineVersion: "0.1.0",
      contentVersion: "game-09-docking-bay@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") return { status: "completed", stage: "apply", progress: 1 }
      if (state.phase === "failed") return { status: "failed", stage: "apply", progress: 1 }
      if (state.phase === "briefing") return { status: "running", stage: "understand", progress: 0 }
      const total =
        state.level.id === "L1" || state.level.id === "L2"
          ? state.pods.length
          : state.level.id === "L3"
            ? (state.probe?.invokedMethods.length ?? 1)
            : L4_GRANT_SLOTS
      const answered =
        state.level.id === "L1"
          ? state.dockPredictions.size
          : state.level.id === "L2"
            ? state.mismatchPredictions.size
            : state.level.id === "L3"
              ? state.sandboxChoices.size
              : state.chosenCapabilities.length
      return { status: "running", stage: "respond", progress: Math.min(1, answered / total) }
    },
  },
})
