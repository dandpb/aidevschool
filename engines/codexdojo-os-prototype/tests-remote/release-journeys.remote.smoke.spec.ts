import { expect, test, type Frame, type Page } from '@playwright/test'

async function enterSchool(page: Page) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
}

async function missionFrame(page: Page, pathPart: string): Promise<Frame> {
  await expect.poll(() =>
    page.frames().some((frame) => frame !== page.mainFrame() && frame.url().includes(pathPart)),
  ).toBe(true)
  const frame = page.frames().find(
    (candidate) => candidate !== page.mainFrame() && candidate.url().includes(pathPart),
  )
  if (frame === undefined) throw new Error(`mission frame ${pathPart} was not loaded`)
  return frame
}

async function expectSameOriginFrame(page: Page, iframeTitle: string, pathPart: string) {
  const frameElement = page.locator(`iframe[title="${iframeTitle}"]`)
  await expect(frameElement).toBeVisible({ timeout: 30_000 })
  const src = await frameElement.getAttribute('src')
  expect(src, 'mission iframe has a src').toBeTruthy()
  const origin = new URL(src as string, page.url()).origin
  expect(origin, 'mission must be served from the deployed OS origin').toBe(
    new URL(page.url()).origin,
  )
  return missionFrame(page, pathPart)
}

function completeWarehouse(frame: Frame) {
  return expect
    .poll(() =>
      frame.evaluate(() => {
        type Hook = { game: { snapshot: { phase: string } } }
        return (window as Window & { __warehouse?: Hook }).__warehouse?.game.snapshot.phase
      }),
    )
    .toBe('predicting')
    .then(() =>
      frame.evaluate(() => {
        type Hook = {
          game: {
            snapshot: { phase: string; keys: readonly string[]; pendingIndex: number }
            shelfOfKey(key: string): number
            predictShelf(shelf: number): void
          }
        }
        const hook = (window as Window & { __warehouse?: Hook }).__warehouse
        if (hook === undefined) throw new Error('Warehouse hook unavailable')
        while (hook.game.snapshot.phase === 'predicting') {
          const key = hook.game.snapshot.keys[hook.game.snapshot.pendingIndex]
          if (key === undefined) break
          hook.game.predictShelf(hook.game.shelfOfKey(key))
        }
      }),
    )
}

test('remote IA Prática release journey enters the school, mounts the hosted literacy mission from the deployed origin, and keeps the canonical count untouched', async ({ page }) => {
  await enterSchool(page)
  const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  const canonicalCount = canonicalLabel?.match(/\d+/)?.[0]
  expect(canonicalCount).toBeTruthy()

  await page.getByRole('button', { name: /Começar missão|Revisar agora|Continuar missão/ }).click()
  await expect(page).toHaveURL(/\/mission\//)
  const literacy = await expectSameOriginFrame(
    page,
    'Missão IA não é uma fonte de verdade',
    'literacydojo',
  )
  await expect(literacy.locator('body')).toContainText(/IA não é uma fonte de verdade/, {
    timeout: 30_000,
  })
  await expect(page.getByText(`${canonicalCount} verificadas · sem alteração local`)).toBeVisible()

  await page.getByRole('button', { name: '← Hub' }).click()
  await expect(page).toHaveURL(/\/hub$/)
  await expect(page.getByText(/\d+ competências verificadas/)).toBeVisible()
})

test('remote Dev release journey mounts the hosted warehouse simulation from the deployed origin, completes a round, and reports the verifier honestly', async ({ page }) => {
  test.setTimeout(90_000)
  await enterSchool(page)
  await page.goto('/mission/dev/game-02-warehouse')
  await expect(page.getByText('Ainda não enviada', { exact: true })).toBeVisible()
  const warehouse = await expectSameOriginFrame(page, 'Missão WAREHOUSE: Key-Value Store (in-memory)', 'warehouse')
  await expect(warehouse.locator('body')).toContainText(/Hash/i, { timeout: 30_000 })

  await completeWarehouse(warehouse)
  await expect(page.getByText('Verificador indisponível', { exact: true })).toBeVisible()
  await expect(page.getByText('Evidência rejeitada', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await expect(page.getByText('Temporariamente indisponível', { exact: true })).toBeVisible()
})
