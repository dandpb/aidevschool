import { type View, views } from "../domain"
import type { AppState } from "../state"
import { renderAgents } from "./agents"
import { renderCycle } from "./cycle"
import { renderLinuxLab } from "./linuxLab"
import { renderOverview } from "./overview"
import { renderProject } from "./project"
import { renderRoadmap } from "./roadmap"

type ViewRenderer = (state: AppState) => string

// Keyed by View. The `Record<View, …>` shape is the compile-time exhaustiveness
// guard: add a variant to the View union in domain.ts and tsc forces an entry
// here — stronger than a runtime assertNever in a switch.
const viewMeta: Readonly<Record<View, { label: string; render: ViewRenderer }>> = {
  overview: { label: "Painel", render: renderOverview },
  linuxLab: { label: "Linux Lab", render: renderLinuxLab },
  agents: { label: "Agentes", render: renderAgents },
  cycle: { label: "Ciclo", render: renderCycle },
  roadmap: { label: "Roadmap", render: renderRoadmap },
  project: { label: "Projeto", render: renderProject },
}

// Ordered to match the `views` array — drives nav rendering and view dispatch
// from a single source of truth.
export const viewRegistry: readonly { id: View; label: string; render: ViewRenderer }[] = views.map(
  (id) => ({ id, ...viewMeta[id] }),
)

export function renderView(state: AppState): string {
  return viewMeta[state.view].render(state)
}
