// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"

vi.mock(import("./progress"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getAgents: vi.fn(actual.getAgents),
    getProjects: vi.fn(actual.getProjects),
    getStages: vi.fn(actual.getStages),
  }
})

vi.mock(import("./render/events"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    bindEvents: vi.fn(actual.bindEvents),
  }
})

import { AppMountError, mountCodexDojo } from "./app"
import * as progress from "./progress"
import { bindEvents } from "./render/events"

describe("mountCodexDojo", () => {
  it("throws AppMountError when agents or stages are empty", () => {
    const root = {} as HTMLElement
    vi.mocked(progress.getAgents).mockReturnValueOnce([])
    vi.mocked(progress.getStages).mockReturnValueOnce([])
    vi.mocked(progress.getProjects).mockReturnValueOnce([])
    expect(() => mountCodexDojo(root)).toThrow(AppMountError)
  })

  it("binds events once across mount and re-renders", () => {
    const root = document.createElement("div")
    mountCodexDojo(root)

    const agentsButton = root.querySelector("[data-view='agents']")
    expect(agentsButton).not.toBeNull()
    agentsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(bindEvents).toHaveBeenCalledTimes(1)
  })
})
