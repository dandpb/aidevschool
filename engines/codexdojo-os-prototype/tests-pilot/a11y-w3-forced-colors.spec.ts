// AID-1096/W3 — forced-colors wave 1 (B7 da baseline AID-914 §3; contrato
// docs/design/design-foundations.md §4) no loop de missão do OS, contra o build
// estático do pilot. Sob emulação forced-colors:
// 1. o ResultScreen expõe os papéis canônicos do loop (§3.4): feedback-panel
//    (região de verificação, live region) e retry-activity (recuperação);
// 2. a região de verificação mantém borda distinguível sob system colors
//    (geometria preservada — o fundo suave sozinho não sobrevive);
// 3. o outline de foco dos controles do loop sobrevive (largura/offset).
//
// Nota de harness: a emulação usa browser.newContext({ forcedColors: 'active' })
// explícito — o parâmetro via test.use não se propaga neste runner.
//
// Mutation-guard: remover os data-testid de src/journey/ResultScreen.tsx quebra
// (1); remover o bloco @media (forced-colors: active) de src/styles/journey.css
// quebra (2)/(3).
import { expect, test } from '@playwright/test'
import type { FrameLocator, Page } from '@playwright/test'
import { bucketOf } from '../../voxelDojo/game-02-warehouse/src/sim/hash'

async function forcedColorsPage(browser: import('@playwright/test').Browser): Promise<Page> {
  const ctx = await browser.newContext({
    forcedColors: 'active',
    viewport: { width: 1280, height: 800 },
  })
  return ctx.newPage()
}

async function enterSchool(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
}

async function answerWarehouse(frame: FrameLocator): Promise<void> {
  const status = frame.getByTestId('hud-status')
  const first = await status.textContent()
  const count = first?.match(/de (\d+):/)?.[1]
  if (count === undefined) throw new Error('Warehouse crate count was not visible')
  const shelfCount = await frame.locator('[data-testid^="shelf-"]').count()
  for (let index = 0; index < Number(count); index += 1) {
    const current = await status.textContent()
    const key = current?.match(/: (.+) — clique/)?.[1]
    if (key === undefined) throw new Error('Warehouse key was not visible')
    const expected = bucketOf(key, shelfCount)
    await frame.getByTestId(`shelf-${expected}`).dispatchEvent('click')
  }
}

test('AID-1096/W3: papéis canônicos do loop e borda sobrevivem a forced-colors no ResultScreen', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const page = await forcedColorsPage(browser)
  await enterSchool(page)
  await page.goto('/mission/dev/game-02-warehouse')
  const frame = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  await expect(frame.getByTestId('hud-status')).toContainText('— clique na prateleira', {
    timeout: 60_000,
  })
  await answerWarehouse(frame)

  // pilot: gateway indisponível → ResultScreen com região de verificação viva
  await expect(page.getByText('Verificador indisponível', { exact: true })).toBeVisible()

  const panel = page.getByTestId('feedback-panel')
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute('aria-live', 'polite')
  await expect(panel).toHaveAttribute('aria-atomic', 'true')
  const retry = page.getByTestId('retry-activity')
  await expect(retry).toBeVisible()
  await expect(retry).toHaveText('Tentar verificação novamente')

  // (2) borda da região de verificação sob system colors: 2px solid
  const border = await panel.evaluate((node) => {
    const cs = getComputedStyle(node)
    return { style: cs.borderTopStyle, width: cs.borderTopWidth }
  })
  expect(border.style).toBe('solid')
  expect(Number.parseFloat(border.width)).toBeGreaterThanOrEqual(2)

  // (3) outline de foco do controle de recuperação sobrevive (geometria)
  await retry.focus()
  const outline = await retry.evaluate((node) => {
    const cs = getComputedStyle(node)
    return { width: cs.outlineWidth, style: cs.outlineStyle, offset: cs.outlineOffset }
  })
  expect(outline.style).not.toBe('none')
  expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(2)
  expect(Number.parseFloat(outline.offset)).toBeGreaterThanOrEqual(2)
  await page.context().close()
})
