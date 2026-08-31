import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createTimelineAccessibleProjection } from "./scene/accessible"
import { mountHud } from "./scene/hud"
import { TowerScene } from "./scene/towerScene"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __timelineTower?: { game: GameController }
  }
}

/** The scene's sync takes derived labels; the projection contract carries only
 * the snapshot, so the adapter recomputes the same labels from the controller's
 * truth accessors (deterministic folds of the same log). */
function towerProjection(scene: TowerScene, game: GameController): MissionProjection<GameState> {
  return {
    mount: () => scene.mount(),
    focus: () => scene.focus(),
    dispose: () => scene.dispose(),
    sync: (state) => {
      scene.sync(state, game.truthStatus(), game.truthShipped() ? "shipped" : "none")
    },
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => new GameController("L1"),
  windowKey: "__timelineTower",
  mountHud,
  renderer: {
    loadWebgl: async (canvas, game, hooks) => towerProjection(new TowerScene(canvas, hooks), game),
    createAccessible: (_target, game, controlsRoot) =>
      createTimelineAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-08-timeline-tower",
      missionVersion: 1,
      unitId: "U8-event-driven",
      engineVersion: "0.1.0",
      contentVersion: "game-08-timeline-tower@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") return { status: "completed", stage: "apply", progress: 1 }
      if (state.phase === "failed") return { status: "failed", stage: "apply", progress: 1 }
      if (state.phase === "briefing") return { status: "running", stage: "understand", progress: 0 }
      if (state.level.id === "L1") {
        const progress = Math.min(1, state.appendStep / 6)
        return { status: "running", stage: "respond", progress }
      }
      return { status: "running", stage: "respond", progress: 0.5 }
    },
  },
})
