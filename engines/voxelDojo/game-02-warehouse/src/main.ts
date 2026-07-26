import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createWarehouseAccessibleProjection } from "./scene/accessible"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __warehouse?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => new GameController("L1"),
  windowKey: "__warehouse",
  mountHud,
  renderer: {
    loadWebgl: async (canvas, game, hooks) => {
      const { WarehouseScene } = await import("./scene/warehouseScene")
      const scene = new WarehouseScene(canvas, game, hooks)
      scene.onShelfClick = (shelf) => {
        if (game.snapshot.level.id === "L1" && game.snapshot.phase === "predicting") {
          game.predictShelf(shelf)
        }
      }
      return scene
    },
    createAccessible: (_target, game, controlsRoot) =>
      createWarehouseAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-02-warehouse",
      missionVersion: 1,
      unitId: "U2-key-value-store",
      engineVersion: "0.1.0",
      contentVersion: "game-02-warehouse@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") {
        return { status: "completed", stage: "apply", progress: 1 }
      }
      if (state.phase === "failed") {
        return { status: "failed", stage: "apply", progress: 1 }
      }
      if (state.phase === "briefing") {
        return { status: "running", stage: "understand", progress: 0 }
      }
      const total = Math.max(1, state.keys.length)
      const completed = state.level.id === "L1" ? state.pendingIndex : state.crudIndex
      return {
        status: "running",
        stage: "respond",
        progress: Math.min(0.8, 0.2 + (completed / total) * 0.6),
      }
    },
  },
})
