(function attachAgents(global) {
  const agents = [
    {
      id: "architect",
      name: "Architect Agent",
      x: 96,
      y: 96,
      color: "#55d9ff",
      dialogue: "Design the smallest robust system. Architecture grows after evidence demands it.",
    },
    {
      id: "test",
      name: "Test Agent",
      x: 512,
      y: 96,
      color: "#7cff9b",
      dialogue: "A useful artifact proves behavior. Collect tests before calling the cycle done.",
    },
    {
      id: "review",
      name: "Review Agent",
      x: 640,
      y: 224,
      color: "#ffd166",
      dialogue: "Review finds risk, not vibes. Bring findings back as sharper code.",
    },
    {
      id: "metrics",
      name: "Metrics Agent",
      x: 544,
      y: 384,
      color: "#b388ff",
      dialogue: "Measure runtime, coverage, complexity, and AI reliance before scaling.",
    },
    {
      id: "memory",
      name: "Memory Agent",
      x: 224,
      y: 384,
      color: "#f78c6c",
      dialogue: "Memory is curated knowledge. Save the lesson, then choose the next challenge.",
    },
    {
      id: "challenge",
      name: "Challenge Agent",
      x: 128,
      y: 224,
      color: "#ff5c7a",
      dialogue: "Every cycle ends with the next project. A school advances by shipping artifacts.",
    },
  ]

  global.CodexDojoAgents = { agents }
})(window)
