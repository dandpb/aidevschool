(function attachArtifacts(global) {
  const artifacts = [
    { id: "code-scroll", name: "Code Scroll", cycleId: "cycle-1", x: 224, y: 96, color: "#ffd166", value: 40 },
    { id: "test-shield", name: "Test Shield", cycleId: "cycle-1", x: 416, y: 160, color: "#7cff9b", value: 45 },
    { id: "docs-map", name: "Docs Map", cycleId: "cycle-1", x: 288, y: 320, color: "#55d9ff", value: 35 },
    { id: "memory-crystal", name: "Memory Crystal", cycleId: "cycle-1", x: 352, y: 384, color: "#b388ff", value: 50 },
    { id: "review-seal", name: "Review Seal", cycleId: "cycle-2", x: 608, y: 96, color: "#f78c6c", value: 55 },
    { id: "metrics-gem", name: "Metrics Gem", cycleId: "cycle-2", x: 544, y: 320, color: "#55d9ff", value: 60 },
    { id: "comparison-mirror", name: "Comparison Mirror", cycleId: "cycle-2", x: 288, y: 192, color: "#ffffff", value: 50 },
    { id: "next-challenge-key", name: "Next Challenge Key", cycleId: "cycle-2", x: 448, y: 416, color: "#ffd166", value: 70 },
  ]

  global.CodexDojoArtifacts = { artifacts }
})(window)
