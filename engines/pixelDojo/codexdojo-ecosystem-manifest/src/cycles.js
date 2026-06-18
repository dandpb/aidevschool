(function attachCycles(global) {
  const cycles = [
    {
      id: "cycle-1",
      name: "Build the First Useful Artifact",
      requiredArtifacts: ["code-scroll", "test-shield", "docs-map", "memory-crystal"],
      completionText: "Cycle 1 complete: the first useful artifact now has code, tests, docs, and memory.",
      rewards: { score: 180, quality: 10, coverage: 18, architecture: 8, aiMastery: 10 },
    },
    {
      id: "cycle-2",
      name: "Improve Quality and Structure",
      requiredArtifacts: ["review-seal", "metrics-gem", "comparison-mirror", "next-challenge-key"],
      completionText: "Cycle 2 complete: quality improved, alternatives compared, and the next challenge is unlocked.",
      rewards: { score: 260, quality: 18, coverage: 12, architecture: 20, aiMastery: 16 },
    },
  ]

  global.CodexDojoCycles = { cycles }
})(window)
