import { expect, test } from "@playwright/test"

// AID-1857/t1 — codexDojo e2e mínimo contra `vite preview` (build real, sem
// deploy externo). Cobre o caminho feliz crítico da engine: mount do app-shell,
// catálogo não-vazio, ciclo de eventos (navegação/seleção/avanço de estágio/
// filtro de roadmap/briefing de projeto) e zero pageerror/console-error.
// Espelha o contrato do jsdom `src/app.e2e.test.ts` no browser de verdade.

test("codexDojo dashboard mounts via vite preview and runs the happy-path event cycle", async ({
  page,
}) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  await page.goto("/")

  // Mount: app-shell renderizado no #app com a marca do painel.
  await expect(page.locator("#app")).not.toBeEmpty()
  await expect(page.getByText("codexDojo").first()).toBeVisible()

  // Catálogo não-vazio: contagens pinadas do substrato gerado (agents/cycle).
  await expect(page.locator(".agent-node")).toHaveCount(14)
  await expect(page.locator(".stage-chip")).toHaveCount(6)
  await expect(page.locator(".metric-item")).toHaveCount(10)
  await expect(page.getByText("Learning gate").first()).toBeVisible()
  await expect(page.getByText("Rate Limiter (Token Bucket)").first()).toBeVisible()

  // Ciclo de eventos — visão agents: seleção de agente re-renderiza o painel.
  // (cliques scoped ao nav: a overview também expõe atalhos `data-view`
  // duplicados — realidade de DOM que o jsdom não pinava.)
  await page.locator(".nav-button[data-view='agents']").click()
  await expect(page.getByText("MAESTRO").first()).toBeVisible()
  await page.locator("[data-agent='critico']").click()
  await expect(page.getByText("CRÍTICO").first()).toBeVisible()
  await expect(page.getByText("Toda crítica precisa de evidência").first()).toBeVisible()

  // Ciclo de eventos — visão cycle: avançar estágio pelo botão de ação.
  await page.locator(".nav-button[data-view='cycle']").click()
  await expect(page.getByText("Diagnosticar nível").first()).toBeVisible()
  await page.locator("[data-stage='projetar']").click()
  await expect(page.getByText("Criar mini-projeto").first()).toBeVisible()
  await page.locator("[data-action='advance-stage']").click()
  await expect(page.getByText("Implementar versão 1").first()).toBeVisible()

  // Ciclo de eventos — visão roadmap: filtro por fase + briefing de projeto.
  await page.locator(".nav-button[data-view='roadmap']").click()
  const projectCards = page.locator(".project-card")
  const catalogSize = await projectCards.count()
  expect(catalogSize).toBeGreaterThan(0)
  await page.locator("[data-filter='concorrencia']").click()
  await expect(page.getByText("Concurrent Task Queue").first()).toBeVisible()
  await expect(page.getByText("Rate Limiter (Token Bucket)")).toHaveCount(0)
  await page.locator("[data-project='p04']").click()
  await expect(page.locator(".nav-button[data-view='project']")).toHaveClass(/is-active/)
  await expect(
    page.getByText("Orquestrar jobs concorrentes com prioridades e retry.").first(),
  ).toBeVisible()

  // Guard de runtime: o caminho feliz não emite pageerror nem console.error.
  expect(runtimeErrors).toEqual([])
})

test("linuxLab view stays a launch bridge only when no OS URL is configured", async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on("pageerror", (error) => runtimeErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      runtimeErrors.push(message.text())
    }
  })

  await page.goto("/")
  // Sem VITE_CODEXDOJO_OS_URL no build de preview: o bridge resolved mostra
  // o status de configuração e NÃO renderiza âncora de launch nem desktop
  // falso (fronteira linuxLab ↔ codexdojo-os-prototype).
  await page.locator(".nav-button[data-view='linuxLab']").click()
  await expect(page.getByText("Linux Lab").first()).toBeVisible()
  await expect(page.locator("[data-codexdojo-os-launch]")).toHaveCount(0)
  await expect(page.locator("[data-linux-app]")).toHaveCount(0)
  await expect(page.locator("[data-action='run-linux-lab']")).toHaveCount(0)
  await expect(page.getByText("Configure").first()).toBeVisible()

  expect(runtimeErrors).toEqual([])
})
