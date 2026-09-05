import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createPipelineAccessibleProjection } from "./scene/accessible"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __pipelinePlant?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => new GameController("L1"),
  windowKey: "__pipelinePlant",
  mountHud,
  renderer: {
    loadWebgl: async (canvas, game, hooks) => {
      const { PipelineScene } = await import("./scene/pipelineScene")
      const scene = new PipelineScene(canvas, hooks)
      scene.onTankClick = () => {
        const level = game.snapshot.level.id
        // clicking the tank toggles the current overflow/bounded prediction preview (L1/L4 buffered)
        if (level === "L1" || level === "L4") game.predictOverflow(!game.bufferedOverflows())
      }
      return scene
    },
    createAccessible: (_target, game, controlsRoot) =>
      createPipelineAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-06-pipeline-plant",
      missionVersion: 1,
      unitId: "U6-file-upload",
      engineVersion: "0.1.0",
      contentVersion: "game-06-pipeline-plant@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") return { status: "completed", stage: "apply", progress: 1 }
      if (state.phase === "failed") return { status: "failed", stage: "apply", progress: 1 }
      if (state.phase === "briefing") return { status: "running", stage: "understand", progress: 0 }
      return { status: "running", stage: "respond", progress: 0.5 }
    },
  },
})
