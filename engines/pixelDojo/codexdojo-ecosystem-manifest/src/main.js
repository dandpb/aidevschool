(function boot(global) {
  const canvas = document.querySelector("#game")
  const hud = {
    aiMastery: document.querySelector("#aiMastery"),
    architecture: document.querySelector("#architecture"),
    collectedArtifacts: document.querySelector("#collectedArtifacts"),
    coverage: document.querySelector("#coverage"),
    cycleName: document.querySelector("#cycleName"),
    cycleStatus: document.querySelector("#cycleStatus"),
    memoryCount: document.querySelector("#memoryCount"),
    memoryLog: document.querySelector("#memoryLog"),
    message: document.querySelector("#message"),
    quality: document.querySelector("#quality"),
    requiredArtifacts: document.querySelector("#requiredArtifacts"),
    score: document.querySelector("#score"),
  }

  if (!canvas) {
    throw new Error("codexDojo: Ecosystem Manifest needs #game canvas.")
  }

  global.__codexDojoGame = global.CodexDojoGame.createGame(canvas, hud)
})(window)
