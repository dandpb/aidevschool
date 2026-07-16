import { type Agent, projectPhases, type View, views } from "../domain"
import { type LinuxAppCategoryFilter, linuxAppCategories } from "../linuxLab"
import { findAgent } from "../progress"
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
    attr: "data-project",
    decode: (v) => (v !== null ? { kind: "selectProject", projectId: v } : null),
  },
  {
    attr: "data-filter",
    decode: (v) => (isProjectFilter(v) ? { kind: "setProjectFilter", filter: v } : null),
  },
  {
    attr: "data-linux-app",
    decode: (v) => (v !== null ? { kind: "selectLinuxApp", appId: v } : null),
  },
  {
    attr: "data-linux-category",
    decode: (v) =>
      isLinuxAppCategoryFilter(v) ? { kind: "setLinuxAppCategoryFilter", filter: v } : null,
  },
  { attr: "data-action", value: "advance-stage", decode: () => ({ kind: "advanceStage" }) },
  { attr: "data-action", value: "run-linux-lab", decode: () => ({ kind: "runLinuxLab" }) },
]

export function bindEvents(root: HTMLElement, dispatch: Dispatch): void {
  root.addEventListener("click", (event) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    for (const { attr, value, decode } of intents) {
      const selector = value === undefined ? `[${attr}]` : `[${attr}='${value}']`
      const element = target.closest(selector)
      if (element !== null) {
        const action = decode(element.getAttribute(attr))
        if (action !== null) {
          dispatch(action)
          return
        }
      }
    }

    const copyElement = target.closest("[data-copy-agent]")
    if (copyElement !== null) {
      const agentId = copyElement.getAttribute("data-copy-agent")
      if (agentId !== null) {
        copyAgentPrompt(agentId, dispatch)
      }
    }
  })
}

function copyAgentPrompt(agentId: string, dispatch: Dispatch): void {
  let agent: Agent
  try {
    agent = findAgent(agentId)
  } catch {
    return
  }

  const clipboard = navigator.clipboard
  if (clipboard === undefined) {
    dispatch({ kind: "markCopied", agentId: null })
    return
  }

  void clipboard
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

function isLinuxAppCategoryFilter(value: string | null): value is LinuxAppCategoryFilter {
  return value === "all" || linuxAppCategories.some((category) => category === value)
}
