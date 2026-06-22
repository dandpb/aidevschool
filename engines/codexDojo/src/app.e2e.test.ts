// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { mountCodexDojo } from "./app"
import { agents } from "./data/agents"
import { projects } from "./data/projects"

describe("codexDojo core dashboard E2E", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("covers overview, agents, copy prompt, cycle, roadmap, and project briefing surfaces", async () => {
    const root = document.createElement("div")
    const writeText = vi.fn(() => Promise.resolve(undefined))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.stubGlobal("navigator", { clipboard: { writeText } })

    mountCodexDojo(root)

    expect(root.textContent).toContain("codexDojo")
    expect(root.textContent).toContain("20% do ciclo")
    expect(root.textContent).toContain("Rate Limiter (Token Bucket)")
    expect(root.querySelectorAll(".agent-node")).toHaveLength(14)
    expect(root.querySelectorAll(".stage-chip")).toHaveLength(6)
    expect(root.querySelectorAll(".metric-item")).toHaveLength(10)
    expect(root.textContent).toContain("Learning gate")
    expect(root.textContent).toContain("Evidence-gated")

    const metricValues = Array.from(root.querySelectorAll(".metric-item strong")).map((node) =>
      node.textContent?.trim(),
    )
    expect(metricValues.every((value) => value === "não medido ainda")).toBe(true)

    click(root, "[data-view='agents']")
    expect(root.textContent).toContain("10agentes user-facing")
    expect(root.textContent).toContain("14sub-agentes especializados")
    expect(root.textContent).toContain("MAESTRO")

    click(root, "[data-agent='critico']")
    expect(root.textContent).toContain("CRÍTICO")
    expect(root.textContent).toContain("Toda crítica precisa de evidência")

    click(root, "[data-copy-agent='critico']")
    await flushMicrotasks()
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("CRÍTICO"))
    expect(copyButtonLabel(root, "critico")).toBe("Copiado")

    writeText.mockRejectedValueOnce(new Error("Clipboard denied"))
    click(root, "[data-copy-agent='critico']")
    await flushMicrotasks()
    expect(warn).toHaveBeenCalledWith("Prompt copy failed: Clipboard denied")
    expect(copyButtonLabel(root, "critico")).toBe("Copiar prompt")

    click(root, "[data-view='cycle']")
    expect(root.textContent).toContain("Diagnosticar nível")
    click(root, "[data-stage='projetar']")
    expect(root.textContent).toContain("Criar mini-projeto")
    click(root, "[data-action='advance-stage']")
    expect(root.textContent).toContain("Implementar versão 1")
    expect(root.textContent).toContain("30% validado")

    click(root, "[data-view='roadmap']")
    expect(root.querySelectorAll(".project-card")).toHaveLength(projects.length)
    click(root, "[data-filter='concorrencia']")
    expect(root.textContent).toContain("Concurrent Task Queue")
    expect(root.textContent).toContain("WebSocket Chat Server")
    expect(root.textContent).not.toContain("Rate Limiter (Token Bucket)")

    click(root, "[data-project='p04']")
    expect(root.textContent).toContain("P04")
    expect(root.textContent).toContain("Concurrent Task Queue")
    expect(root.textContent).toContain("Orquestrar jobs concorrentes com prioridades e retry.")

    expect(root.querySelector("[data-view='project']")?.className).toContain("is-active")
    expect(agents).toHaveLength(14)
  })
})

function click(root: ParentNode, selector: string): void {
  button(root, selector).click()
}

function button(root: ParentNode, selector: string): HTMLButtonElement {
  const element = root.querySelector(selector)
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected button for selector: ${selector}`)
  }
  return element
}

function copyButtonLabel(root: ParentNode, agentId: string): string {
  return button(root, `[data-copy-agent='${agentId}']`).textContent?.trim() ?? ""
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
