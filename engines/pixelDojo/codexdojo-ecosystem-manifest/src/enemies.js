(function attachEnemies(global) {
  const enemies = [
    { id: "bug", name: "Bug", x: 320, y: 224, w: 24, h: 24, color: "#ff5c7a", dx: 1.1, dy: 0, penalty: "quality" },
    { id: "flaky", name: "Flaky Test", x: 576, y: 160, w: 26, h: 26, color: "#ffb86c", dx: 0, dy: 1.2, penalty: "coverage" },
    { id: "debt", name: "Tech Debt", x: 256, y: 288, w: 28, h: 28, color: "#a98467", dx: 1, dy: 0, penalty: "architecture" },
    { id: "scope", name: "Scope Creep", x: 480, y: 320, w: 30, h: 30, color: "#c77dff", dx: 0.9, dy: 0.9, penalty: "aiMastery" },
    { id: "monolith", name: "Legacy Monolith", x: 96, y: 448, w: 48, h: 32, color: "#7a7f91", dx: 0.8, dy: 0, penalty: "quality" },
  ]

  global.CodexDojoEnemies = { enemies }
})(window)
