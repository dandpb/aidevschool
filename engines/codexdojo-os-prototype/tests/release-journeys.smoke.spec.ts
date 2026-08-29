import { expect, test, type Frame, type Page } from '@playwright/test'

async function openSchool(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page).toHaveURL(/\/hub$/)
}

async function gameFrame(page: Page, port: number): Promise<Frame> {
  await expect.poll(
    () => page.frames().some((frame) => frame.url().startsWith(`http://127.0.0.1:${port}/`)),
  ).toBe(true)
  const frame = page.frames().find((candidate) => candidate.url().startsWith(`http://127.0.0.1:${port}/`))
  if (frame === undefined) throw new Error(`Mission frame on port ${port} was not loaded`)
  return frame
}

async function completeWarehouse(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    return (window as Window & { __warehouse?: Hook }).__warehouse?.game.snapshot.phase
  })).toBe('predicting')
  await frame.evaluate(() => {
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
  })
}

test('proves the nontechnical release journey through recovery, verification, and map continuity', async ({ page }) => {
  await openSchool(page)
  const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  const canonicalCount = canonicalLabel?.match(/\d+/)?.[0]
  expect(canonicalCount).toBeTruthy()

  const mentor = page.getByRole('complementary', { name: 'Mentor IA contextual' })
  await mentor.getByRole('button', { name: 'Pista' }).click()
  await mentor.getByLabel('O que voce tentou').fill('Comparei as respostas, mas ainda não conferi a fonte.')
  await mentor.getByLabel('Ponto exato de confusao').fill('Não sei qual critério confirma a fonte.')
  await mentor.getByRole('button', { name: 'Pedir ajuda' }).click()
  await expect(mentor.getByText('Orientacao local deterministica · sem ferramentas')).toBeVisible()

  await page.getByRole('button', { name: 'Começar missão' }).click()
  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await mission.getByTestId('start-lesson').click()
  await mission.getByTestId('output-out-a').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('submit-attempt').click()
  await expect(page.getByText('Verificação pede nova tentativa', { exact: true })).toBeVisible()

  await page.reload()
  await mission.getByTestId('start-lesson').click()
  await mission.getByTestId('output-out-b').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('criterion-c-limites').check()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()

  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/gate canônico continua separado/i)).toBeVisible()
  await expect(page.getByText(`${canonicalCount} verificadas · sem alteração local`)).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await page.reload()
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Abrir mapa' }).click()
  await expect(page.getByRole('heading', { name: 'Seis missões, uma sequência' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'WAREHOUSE, WORMHOLE e RELAY STATION no OS' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 3, name: 'WAREHOUSE: Key-Value Store (in-memory)' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '← Hub' }).click()
  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
})

test('proves the hosted simulation entry through accessible evidence and hub return', async ({ page }) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openSchool(page)
  await page.goto('/mission/dev/game-02-warehouse')

  await completeWarehouse(await gameFrame(page, 5202))
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText(/gate canônico continua separado/i)).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await expect(page).toHaveURL(/\/hub$/)
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir mapa' }).click()
  await expect(
    page.getByRole('heading', { level: 3, name: 'WORMHOLE: URL Shortener' }),
  ).toBeVisible()
})
