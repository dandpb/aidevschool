import { projectPhases, type View, views } from "../domain"
import { getAgents } from "../progress"
import type { AppAction, ProjectFilter } from "../state"

export type Dispatch = (action: AppAction) => void

type Intent = {
  attr: string
  value?: string
  decode: (raw: string | null) => AppAction | null
}

// The pure intents: each data-* attribute is one adapter at the DOM seam,
// declared as a single row instead of a hand-rolled query→listen→dispatch block.
const intents: readonly Intent[] = [
  { attr: "data-view", decode: (v) => (isView(v) ? { kind: "changeView", view: v } : null) },
  { attr: "data-agent", decode: (v) => (v !== null ? { kind: "selectAgent", agentId: v } : null) },
  { attr: "data-stage", decode: (v) => (v !== null ? { kind: "selectStage", stageId: v } : null) },
  {
    attr: "data-filter",
    decode: (v) => (isProjectFilter(v) ? { kind: "setProjectFilter", filter: v } : null),
  },
  { attr: "data-action", value: "advance-stage", decode: () => ({ kind: "advanceStage" }) },
]

export function bindEvents(root: HTMLElement, dispatch: Dispatch): void {
  bindIntents(root, dispatch, intents)

  // The one effectful handler: clipboard write is async and dispatches on
  // success/failure, so it stays out of the declarative intent table.
  root.querySelectorAll("[data-copy-agent]").forEach((element) => {
    element.addEventListener("click", () => {
      const agentId = element.getAttribute("data-copy-agent")
      if (agentId !== null) {
        copyAgentPrompt(agentId, dispatch)
      }
    })
  })
}

function bindIntents(root: HTMLElement, dispatch: Dispatch, table: readonly Intent[]): void {
  for (const { attr, value, decode } of table) {
    const selector = value === undefined ? `[${attr}]` : `[${attr}='${value}']`
    root.querySelectorAll(selector).forEach((element) => {
      element.addEventListener("click", () => {
        const action = decode(element.getAttribute(attr))
        if (action !== null) {
          dispatch(action)
        }
      })
    })
  }
}

function copyAgentPrompt(agentId: string, dispatch: Dispatch): void {
  const agent = getAgents().find((candidate) => candidate.id === agentId)

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
