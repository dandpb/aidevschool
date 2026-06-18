(function attachMemory(global) {
  const key = "codexDojoManifestMemory"

  function loadEntries() {
    try {
      const raw = global.localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch (_error) {
      return []
    }
  }

  function saveEntries(entries) {
    try {
      global.localStorage.setItem(key, JSON.stringify(entries.slice(-8)))
    } catch (_error) {
      return
    }
  }

  function addEntry(entry) {
    const entries = loadEntries()
    const nextEntry = {
      id: `${Date.now()}-${entry.cycleId}`,
      cycleId: entry.cycleId,
      cycleName: entry.cycleName,
      artifacts: entry.artifacts,
      score: entry.score,
      createdAt: new Date().toISOString(),
    }
    entries.push(nextEntry)
    saveEntries(entries)
    return entries
  }

  function clearEntries() {
    try {
      global.localStorage.removeItem(key)
    } catch (_error) {
      return
    }
  }

  global.CodexDojoMemory = { addEntry, clearEntries, loadEntries }
})(window)
