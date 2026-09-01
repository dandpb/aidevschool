/** Local OS projection: never reads or writes learner/learning_state.yaml. */

export type LocalSuggestion = {
  readonly title: string
  readonly detail: string
  readonly source: "os-progress" | "fallback"
}

const DEV_RAIL = [
  { id: "game-02-warehouse", title: "WAREHOUSE" },
  { id: "game-03-wormhole", title: "WORMHOLE" },
  { id: "game-05-relay-station", title: "RELAY STATION" },
] as const

const DATABASE_NAME = "codexdojo-os"
const STORE_NAME = "progress"
const PROGRESS_KEY = "os-progress"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function projectLocalSuggestion(progress: unknown): LocalSuggestion {
  if (!isRecord(progress) || !isRecord(progress.missionStatusByKey)) {
    return {
      title: "WAREHOUSE",
      detail: "Sugestão neste dispositivo. Sem conta e sem FSRS canônico.",
      source: "fallback",
    }
  }
  const statuses = progress.missionStatusByKey
  const activeTrackId = progress.activeTrackId
  const activeMissionId = progress.activeMissionId
  if (activeTrackId === "dev" && typeof activeMissionId === "string") {
    const active = DEV_RAIL.find((mission) => mission.id === activeMissionId)
    if (active !== undefined) {
      return {
        title: active.title,
        detail: "Missão ativa neste dispositivo. Sugestão neste dispositivo — não é domínio.",
        source: "os-progress",
      }
    }
  }
  for (const mission of DEV_RAIL) {
    if (statuses[`dev:${mission.id}`] !== "completed") {
      return {
        title: mission.title,
        detail: "Próxima missão do trilho Dev neste dispositivo. Sugestão neste dispositivo.",
        source: "os-progress",
      }
    }
  }
  return {
    title: "Catálogo voxel no Engine Hub",
    detail: "O trilho guiado está concluído neste dispositivo. Outras simulações ficam no Hub.",
    source: "os-progress",
  }
}

async function readOsProgress(): Promise<unknown | null> {
  if (typeof indexedDB === "undefined") return null
  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE_NAME)
    request.onerror = () => resolve(null)
    request.onupgradeneeded = () => {
      // Do not create the OS database from dojoToday.
      request.transaction?.abort()
    }
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close()
        resolve(null)
        return
      }
      const get = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PROGRESS_KEY)
      get.onsuccess = () => {
        db.close()
        resolve(get.result ?? null)
      }
      get.onerror = () => {
        db.close()
        resolve(null)
      }
    }
  })
}

export async function loadHostLocalToday(): Promise<LocalSuggestion> {
  try {
    return projectLocalSuggestion(await readOsProgress())
  } catch {
    return projectLocalSuggestion(null)
  }
}

export function renderLocalSuggestion(suggestion: LocalSuggestion): string {
  return `
    <header class="hero">
      <p class="eyebrow">DevSchool · neste dispositivo</p>
      <h1>Sugestão neste dispositivo</h1>
    </header>
    <section class="card mission-card" data-testid="dojo-today-local-suggestion" aria-label="Sugestão neste dispositivo">
      <p class="eyebrow">Não é FSRS canônico</p>
      <h2>${suggestion.title}</h2>
      <p>${suggestion.detail}</p>
      <p class="muted">Esta vista lê o progresso local do OS. Não escreve learner/learning_state.yaml e não marca mastered.</p>
    </section>
    <footer class="note">
      <p>Sugestão neste dispositivo. Sem conta, sem scheduler canônico, sem domínio.</p>
    </footer>`
}
