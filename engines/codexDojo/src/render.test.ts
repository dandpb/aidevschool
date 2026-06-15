import { describe, expect, it } from "vitest"
import { renderShell } from "./render/shell"
import { type AppState, initialState } from "./state"

// Render snapshots — the byte-level parity oracle. Any structural refactor
// (view registry, intent-decoder) must keep these byte-identical. renderShell
// composes the nav + every view renderer, so one snapshot per view covers all
// of them.

const stateWith = (overrides: Partial<AppState>): AppState => ({ ...initialState, ...overrides })

describe("renderShell — parity oracle", () => {
  it("renders the overview view", () => {
    expect(renderShell(stateWith({ view: "overview" }))).toMatchSnapshot()
  })

  it("renders the agents view with a selected agent", () => {
    expect(renderShell(stateWith({ view: "agents", selectedAgentId: "revisor" }))).toMatchSnapshot()
  })

  it("renders the agents view showing the copied-prompt state", () => {
    expect(
      renderShell(
        stateWith({ view: "agents", selectedAgentId: "arquiteto", copiedAgentId: "arquiteto" }),
      ),
    ).toMatchSnapshot()
  })

  it("renders the cycle view with partial progress", () => {
    expect(
      renderShell(
        stateWith({
          view: "cycle",
          selectedStageId: "revisar",
          completedStageIds: ["diagnosticar", "escolher"],
        }),
      ),
    ).toMatchSnapshot()
  })

  it("renders the roadmap view filtered to apps", () => {
    expect(renderShell(stateWith({ view: "roadmap", projectFilter: "apps" }))).toMatchSnapshot()
  })

  it("renders the project view", () => {
    expect(renderShell(stateWith({ view: "project" }))).toMatchSnapshot()
  })
})
