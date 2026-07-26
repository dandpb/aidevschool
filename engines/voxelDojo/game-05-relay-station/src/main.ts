import { TeachingGameHostAdapter } from "@aidevschool/evidence/host-protocol"
import type { MissionProjection } from "../../shared/projection"
import { createSceneHarness } from "../../shared/sceneHarness"
import { GameController, type GameState } from "./game/controller"
import { createRelayAccessibleProjection } from "./scene/accessible"
import { mountHud } from "./scene/hud"

declare global {
  interface Window {
    /** Test hook: lets the Playwright smoke drive the public game API deterministically. */
    __relayStation?: { game: GameController }
  }
}

createSceneHarness<GameState, GameController, MissionProjection<GameState>>({
  createGame: () => new GameController("L1"),
  windowKey: "__relayStation",
  mountHud,
  renderer: {
    loadWebgl: async (canvas, game, hooks) => {
      const { RelayScene } = await import("./scene/relayScene")
      const scene = new RelayScene(canvas, hooks)
      scene.onStationClick = (stationId) => {
        const level = game.snapshot.level.id
        if (level === "L4") {
          game.reconnect(stationId)
          return
        }
        game.togglePredict(stationId)
      }
      return scene
    },
    createAccessible: (_target, game, controlsRoot) =>
      createRelayAccessibleProjection(game, controlsRoot),
  },
  hostedMission: {
    adapter: new TeachingGameHostAdapter({
      engineId: "voxelDojo",
      missionId: "game-05-relay-station",
      missionVersion: 1,
      unitId: "U5-websocket-chat",
      engineVersion: "0.1.0",
      contentVersion: "game-05-relay-station@0.1.0",
    }),
    launch: (game) => {
      if (game.snapshot.phase === "briefing") game.start()
    },
    projectState: (state) => {
      if (state.phase === "cleared") return { status: "completed", stage: "apply", progress: 1 }
      if (state.phase === "failed") return { status: "failed", stage: "apply", progress: 1 }
      if (state.phase === "briefing") return { status: "running", stage: "understand", progress: 0 }
      return {
        status: "running",
        stage: "respond",
        progress: Math.min(
          0.8,
          0.2 + (state.predicted.size / Math.max(1, state.stations.length)) * 0.6,
        ),
      }
    },
  },
})
