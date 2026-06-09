import { agents } from "../data/agents"
import type { View } from "../domain"
import { projectPhases, views } from "../domain"
import type { AppAction, ProjectFilter } from "../state"

export type Dispatch = (action: AppAction) => void

export function bindEvents(root: HTMLElement, dispatch: Dispatch): void {
  root.querySelectorAll("[data-view]").forEach((element) => {
    element.addEventListener("click", () => {
      const view = element.getAttribute("data-view")
      if (isView(view)) {
        dispatch({ kind: "changeView", view })
      }
    })
  })

  root.querySelectorAll("[data-agent]").forEach((element) => {
    element.addEventListener("click", () => {
      const agentId = element.getAttribute("data-agent")
      if (agentId !== null) {
        dispatch({ kind: "selectAgent", agentId })
      }
    })
  })

  root.querySelectorAll("[data-stage]").forEach((element) => {
    element.addEventListener("click", () => {
      const stageId = element.getAttribute("data-stage")
      if (stageId !== null) {
        dispatch({ kind: "selectStage", stageId })
      }
    })
  })

  root.querySelectorAll("[data-filter]").forEach((element) => {
    element.addEventListener("click", () => {
      const filter = element.getAttribute("data-filter")
      if (isProjectFilter(filter)) {
        dispatch({ kind: "setProjectFilter", filter })
      }
    })
  })

  root.querySelectorAll("[data-action='advance-stage']").forEach((element) => {
    element.addEventListener("click", () => dispatch({ kind: "advanceStage" }))
  })

  root.querySelectorAll("[data-copy-agent]").forEach((element) => {
    element.addEventListener("click", () => {
      const agentId = element.getAttribute("data-copy-agent")
      if (agentId !== null) {
        copyAgentPrompt(agentId, dispatch)
      }
    })
  })
}

function copyAgentPrompt(agentId: string, dispatch: Dispatch): void {
  const agent = agents.find((candidate) => candidate.id === agentId)

  if (agent === undefined) {
    return
  }

  void navigator.clipboard
    .writeText(agent.prompt)
    .then(() => dispatch({ kind: "markCopied", agentId }))
    .catch((error: unknown) => {
      if (error instanceof Error) {
        console.warn(`Prompt copy failed: ${error.message}`)
        dispatch({ kind: "markCopied", agentId: null })
        return
      }

      throw error
    })
}

function isView(value: string | null): value is View {
  return value !== null && views.some((view) => view === value)
}

function isProjectFilter(value: string | null): value is ProjectFilter {
  return value === "all" || projectPhases.some((phase) => phase === value)
}
