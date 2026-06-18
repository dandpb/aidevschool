(function attachGame(global) {
  const { cycles } = global.CodexDojoCycles
  const { agents } = global.CodexDojoAgents
  const { artifacts } = global.CodexDojoArtifacts
  const enemyTemplates = global.CodexDojoEnemies.enemies
  const world = global.CodexDojoWorld
  const memory = global.CodexDojoMemory
  const playerApi = global.CodexDojoPlayer

  function createGame(canvas, hud) {
    const ctx = canvas.getContext("2d")
    ctx.imageSmoothingEnabled = false
    const state = createState()
    const input = createInputState()
    let lastTick = 0

    bindInput(input, state, hud)
    updateHud(hud, state)
    setMessage(hud, "Collect Cycle 1 artifacts. Speak with agents for guidance.")

    function frame(time) {
      const delta = Math.min(32, time - lastTick || 16)
      lastTick = time
      update(state, input, hud, delta)
      render(ctx, state)
      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)
    return { input, state }
  }

  function createState() {
    return {
      player: playerApi.createPlayer(),
      enemies: enemyTemplates.map((enemy) => ({ ...enemy })),
      cycleIndex: 0,
      completedCycles: {},
      collected: {},
      score: 0,
      quality: 60,
      coverage: 35,
      architecture: 40,
      aiMastery: 30,
      hazardCooldown: 0,
      memoryEntries: memory.loadEntries(),
      messageCooldown: 0,
    }
  }

  function createInputState() {
    return { up: false, down: false, left: false, right: false, interact: false }
  }

  function bindInput(input, state, hud) {
    const mapKey = (key, pressed) => {
      if (key === "ArrowUp" || key.toLowerCase() === "w") input.up = pressed
      if (key === "ArrowDown" || key.toLowerCase() === "s") input.down = pressed
      if (key === "ArrowLeft" || key.toLowerCase() === "a") input.left = pressed
      if (key === "ArrowRight" || key.toLowerCase() === "d") input.right = pressed
      if (key === "e" || key === "Enter" || key === " ") input.interact = pressed
    }
    global.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "r") resetRun(state, hud)
      mapKey(event.key, true)
    })
    global.addEventListener("keyup", (event) => mapKey(event.key, false))
  }

  function update(state, input, hud, delta) {
    playerApi.movePlayer(state.player, input, world)
    moveEnemies(state.enemies, delta)
    collectArtifacts(state, hud)
    handleAgentDialogue(state, input, hud)
    handleHazards(state, hud, delta)
    completeCycleIfReady(state, hud)
    state.messageCooldown = Math.max(0, state.messageCooldown - delta)
    updateHud(hud, state)
  }

  function moveEnemies(enemies, delta) {
    const step = delta / 16
    enemies.forEach((enemy) => {
      const next = { x: enemy.x + enemy.dx * step, y: enemy.y + enemy.dy * step, w: enemy.w, h: enemy.h }
      if (world.rectHitsWall(next)) {
        enemy.dx *= -1
        enemy.dy *= -1
      } else {
        enemy.x = next.x
        enemy.y = next.y
      }
    })
  }

  function collectArtifacts(state, hud) {
    getActiveArtifacts(state).forEach((artifact) => {
      if (!state.collected[artifact.id] && intersects(state.player, boxAround(artifact, 22))) {
        state.collected[artifact.id] = true
        state.score += artifact.value
        setMessage(hud, `Collected ${artifact.name}. Useful artifact added to this cycle.`)
      }
    })
  }

  function handleAgentDialogue(state, input, hud) {
    const agent = agents.find((candidate) => distance(candidate, state.player) < 44)
    if (agent) {
      setMessage(hud, `${agent.name}: ${agent.dialogue}`, input.interact ? 3200 : 120)
    }
  }

  function handleHazards(state, hud, delta) {
    state.hazardCooldown = Math.max(0, state.hazardCooldown - delta)
    if (state.hazardCooldown > 0) return
    const enemy = state.enemies.find((candidate) => intersects(state.player, candidate))
    if (!enemy) return
    state[enemy.penalty] = Math.max(0, state[enemy.penalty] - 6)
    state.score = Math.max(0, state.score - 15)
    state.player.x = Math.max(40, state.player.x - Math.sign(enemy.dx || 1) * 18)
    state.player.y = Math.max(40, state.player.y - Math.sign(enemy.dy || 1) * 18)
    state.hazardCooldown = 900
    setMessage(hud, `${enemy.name} hit the build. ${labelFor(enemy.penalty)} dropped.`)
  }

  function completeCycleIfReady(state, hud) {
    const cycle = cycles[state.cycleIndex]
    if (!cycle || state.completedCycles[cycle.id]) return
    const done = cycle.requiredArtifacts.every((artifactId) => state.collected[artifactId])
    if (!done) return
    state.completedCycles[cycle.id] = true
    applyRewards(state, cycle.rewards)
    state.memoryEntries = memory.addEntry({
      cycleId: cycle.id,
      cycleName: cycle.name,
      artifacts: cycle.requiredArtifacts.map((id) => artifactName(id)),
      score: state.score,
    })
    if (state.cycleIndex < cycles.length - 1) state.cycleIndex += 1
    setMessage(hud, cycle.completionText, 5000)
  }

  function render(ctx, state) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    world.drawWorld(ctx)
    drawAgents(ctx)
    drawArtifacts(ctx, state)
    drawEnemies(ctx, state.enemies)
    playerApi.drawPlayer(ctx, state.player)
  }

  function drawAgents(ctx) {
    agents.forEach((agent) => {
      ctx.fillStyle = "#0b0d16"
      ctx.fillRect(agent.x - 6, agent.y + 18, 36, 8)
      ctx.fillStyle = agent.color
      ctx.fillRect(agent.x, agent.y, 24, 24)
      ctx.fillStyle = "#f8f4d8"
      ctx.fillRect(agent.x + 6, agent.y + 7, 4, 4)
      ctx.fillRect(agent.x + 15, agent.y + 7, 4, 4)
    })
  }

  function drawArtifacts(ctx, state) {
    getVisibleArtifacts(state).forEach((artifact) => {
      const collected = state.collected[artifact.id]
      ctx.globalAlpha = collected ? 0.35 : 1
      ctx.fillStyle = artifact.color
      ctx.fillRect(artifact.x, artifact.y, 18, 18)
      ctx.fillStyle = "#0b0d16"
      ctx.fillRect(artifact.x + 5, artifact.y + 5, 8, 8)
      ctx.globalAlpha = 1
    })
  }

  function drawEnemies(ctx, enemies) {
    enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.color
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h)
      ctx.fillStyle = "#0b0d16"
      ctx.fillRect(enemy.x + 5, enemy.y + 6, 5, 5)
      ctx.fillRect(enemy.x + enemy.w - 10, enemy.y + 6, 5, 5)
    })
  }

  function updateHud(hud, state) {
    const cycle = cycles[state.cycleIndex] || cycles[cycles.length - 1]
    hud.cycleName.textContent = cycle.name
    hud.cycleStatus.textContent = state.completedCycles[cycle.id] ? "Cycle complete." : "Collect required artifacts."
    hud.score.textContent = state.score
    hud.quality.textContent = state.quality
    hud.coverage.textContent = `${state.coverage}%`
    hud.architecture.textContent = state.architecture
    hud.aiMastery.textContent = state.aiMastery
    hud.memoryCount.textContent = state.memoryEntries.length
    renderArtifactList(hud.requiredArtifacts, cycle.requiredArtifacts, state)
    renderArtifactList(hud.collectedArtifacts, Object.keys(state.collected), state)
    renderMemory(hud.memoryLog, state.memoryEntries)
  }

  function renderArtifactList(node, artifactIds, state) {
    node.innerHTML = artifactIds.map((id) => `<li class="${state.collected[id] ? "done" : ""}">${artifactName(id)}</li>`).join("")
  }

  function renderMemory(node, entries) {
    node.innerHTML = entries
      .slice(-4)
      .reverse()
      .map((entry) => `<li>${entry.cycleName}: ${entry.artifacts.length} artifacts, score ${entry.score}</li>`)
      .join("")
  }

  function resetRun(state, hud) {
    memory.clearEntries()
    Object.assign(state, createState())
    setMessage(hud, "Run reset. Memory log cleared for a clean practice loop.")
  }

  function getActiveArtifacts(state) {
    const cycle = cycles[state.cycleIndex]
    return artifacts.filter((artifact) => artifact.cycleId === cycle.id)
  }

  function getVisibleArtifacts(state) {
    const current = cycles[state.cycleIndex]
    return artifacts.filter((artifact) => artifact.cycleId === current.id || state.completedCycles[artifact.cycleId])
  }

  function artifactName(id) {
    return artifacts.find((artifact) => artifact.id === id)?.name || id
  }

  function applyRewards(state, rewards) {
    Object.keys(rewards).forEach((key) => {
      state[key] = Math.min(key === "score" ? 9999 : 100, state[key] + rewards[key])
    })
  }

  function setMessage(hud, text, duration) {
    hud.message.textContent = text
    hud.message.dataset.visible = "true"
    if (duration) hud.messageTimer = duration
  }

  function boxAround(item, size) {
    return { x: item.x, y: item.y, w: size, h: size }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }

  function labelFor(stat) {
    return { quality: "Code Quality", coverage: "Test Coverage", architecture: "Architecture", aiMastery: "AI Mastery" }[stat]
  }

  global.CodexDojoGame = { createGame, world }
})(window)
