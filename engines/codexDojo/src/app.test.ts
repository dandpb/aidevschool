// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"

vi.mock(import("./render/events"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    bindEvents: vi.fn(actual.bindEvents),
  }
})

import { mountCodexDojo } from "./app"
import { bindEvents } from "./render/events"

describe("mountCodexDojo", () => {
  it("binds events once across mount and re-renders", () => {
    const root = document.createElement("div")
    mountCodexDojo(root)

    const agentsButton = root.querySelector("[data-view='agents']")
    expect(agentsButton).not.toBeNull()
    agentsButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))

    expect(bindEvents).toHaveBeenCalledTimes(1)
  })
})
