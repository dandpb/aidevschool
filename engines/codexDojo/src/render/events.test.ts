// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import type { AppAction } from "../state"
import { bindEvents } from "./events"

describe("bindEvents", () => {
  it("clicking a [data-view] button inside root dispatches the correct AppAction once", () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-view", "agents")
    root.appendChild(button)

    const dispatched: AppAction[] = []
    const dispatch = (action: AppAction) => {
      dispatched.push(action)
    }

    bindEvents(root, dispatch)

    // When
    button.click()

    // Then
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]).toEqual({ kind: "changeView", view: "agents" })
  })

  it("clicking an element with no intent does nothing", () => {
    // Given
    const root = document.createElement("div")
    const span = document.createElement("span")
    span.textContent = "innocent"
    root.appendChild(span)

    const dispatched: AppAction[] = []
    const dispatch = (action: AppAction) => {
      dispatched.push(action)
    }

    bindEvents(root, dispatch)

    // When
    span.click()

    // Then
    expect(dispatched).toHaveLength(0)
  })

  it("clicking a Linux app tile dispatches selectLinuxApp", () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-linux-app", "terminal")
    root.appendChild(button)

    const dispatched: AppAction[] = []
    const dispatch = (action: AppAction) => {
      dispatched.push(action)
    }

    bindEvents(root, dispatch)

    // When
    button.click()

    // Then
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]).toEqual({ kind: "selectLinuxApp", appId: "terminal" })
  })

  it("clicking Run Lab dispatches runLinuxLab", () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-action", "run-linux-lab")
    root.appendChild(button)

    const dispatched: AppAction[] = []
    const dispatch = (action: AppAction) => {
      dispatched.push(action)
    }

    bindEvents(root, dispatch)

    // When
    button.click()

    // Then
    expect(dispatched).toHaveLength(1)
    expect(dispatched[0]).toEqual({ kind: "runLinuxLab" })
  })

  it("clicking [data-copy-agent] with unknown id does not throw", () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-copy-agent", "nonexistent-agent")
    root.appendChild(button)

    const dispatch = vi.fn()
    bindEvents(root, dispatch)

    // When / Then
    expect(() => button.click()).not.toThrow()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("copies the agent prompt and dispatches markCopied on success", async () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-copy-agent", "maestro")
    root.appendChild(button)

    const writeText = vi.fn(() => Promise.resolve(undefined))
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    const dispatch = vi.fn()
    bindEvents(root, dispatch)

    // When
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ kind: "markCopied", agentId: "maestro" })
  })

  it("dispatches markCopied with null when clipboard write fails", async () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-copy-agent", "maestro")
    root.appendChild(button)

    const writeText = vi.fn(() => Promise.reject(new Error("Clipboard denied")))
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    const dispatch = vi.fn()
    bindEvents(root, dispatch)

    // When
    button.click()
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Then
    expect(dispatch).toHaveBeenCalledWith({ kind: "markCopied", agentId: null })
  })

  it("does not crash when navigator.clipboard is unavailable", () => {
    // Given
    const root = document.createElement("div")
    const button = document.createElement("button")
    button.setAttribute("data-copy-agent", "maestro")
    root.appendChild(button)

    vi.stubGlobal("navigator", {})

    const dispatch = vi.fn()
    bindEvents(root, dispatch)

    // When / Then
    expect(() => button.click()).not.toThrow()
  })
})
