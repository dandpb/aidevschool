import { expect, test } from '@playwright/test'

type WarehouseHook = {
  readonly game: {
    readonly snapshot: {
      readonly keys: readonly string[]
      readonly pendingIndex: number
    }
    shelfOfKey(key: string): number
  }
}

test('completes l02 through the mission-first host without changing canonical mastery', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' })).toBeVisible()
  await page.getByRole('button', { name: /Trilha técnica.*Dev/ }).click()
  await expect(page.getByText(/Você escolheu Trilha Dev/)).toBeVisible()
  await page.getByRole('button', { name: /Recomendada para começar.*IA Prática/ }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'IA não é uma fonte de verdade' })).toBeVisible()
  const canonicalChip = await page.locator('.hub-chips span').nth(1).textContent()
  const canonicalMastery = canonicalChip?.match(/\d+/)?.[0]
  expect(canonicalMastery).toBeTruthy()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await expect(mission.getByRole('heading', { name: 'IA não é uma fonte de verdade' })).toBeVisible()
  await mission.getByRole('button', { name: 'Começar', exact: true }).click()
  await mission.getByTestId('output-out-b').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('criterion-c-limites').check()
  await mission.getByTestId('submit-attempt').click()
  await expect(mission.getByText('Isso! Resposta útil', { exact: false })).toBeVisible()
  await mission.getByTestId('finish-lesson').click()

  await expect(mission.getByTestId('result-screen')).toBeVisible()
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await expect(page.getByText('Gate canônico não executado', { exact: false })).toBeVisible()
  await expect(page.getByText(`${canonicalMastery} verificadas · sem alteração local`)).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  await expect(page.getByText('Verificação independente', { exact: true })).toBeVisible()
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  await expect(page.getByText('Não alterada por este fluxo', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  await expect(page.getByText(`${canonicalMastery} competências verificadas`)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('shows independent FAIL separately from local and canonical progress', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  const canonicalChip = await page.locator('.hub-chips span').nth(1).textContent()
  const canonicalMastery = canonicalChip?.match(/\d+/)?.[0]
  expect(canonicalMastery).toBeTruthy()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await expect(mission.getByRole('heading', { name: 'IA não é uma fonte de verdade' })).toBeVisible()
  await mission.getByRole('button', { name: 'Começar', exact: true }).click()
  await mission.getByTestId('output-out-a').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('submit-attempt').click()

  await expect(page.getByText('Verificação pede nova tentativa', { exact: true })).toBeVisible()
  await expect(page.getByText('Veredito independente: FAIL', { exact: true })).toBeVisible()
  await expect(page.getByText('Gate canônico não executado', { exact: false })).toBeVisible()
  await expect(page.getByText(`${canonicalMastery} verificadas · sem alteração local`, { exact: true })).toBeVisible()
})

test('preserves Warehouse evidence as pending without inventing a verifier verdict', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Trilha técnica.*Dev/ }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await expect(
    page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const mission = page.frameLocator(
    'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  )
  await expect(mission.getByTestId('shelf-0')).toBeVisible()
  const frame = page.frames().find((candidate) => candidate.url().startsWith('http://127.0.0.1:5202/'))
  if (frame === undefined) throw new Error('Warehouse mission frame was not loaded')
  const keyCount = await frame.evaluate(() => {
    const hook = (window as Window & { __warehouse?: WarehouseHook }).__warehouse
    if (hook === undefined) throw new Error('Warehouse test hook is unavailable')
    return hook.game.snapshot.keys.length
  })
  for (let index = 0; index < keyCount; index += 1) {
    const shelf = await frame.evaluate(() => {
      const hook = (window as Window & { __warehouse?: WarehouseHook }).__warehouse
      if (hook === undefined) throw new Error('Warehouse test hook is unavailable')
      const state = hook.game.snapshot
      const key = state.keys[state.pendingIndex]
      return key === undefined ? null : hook.game.shelfOfKey(key)
    })
    if (shelf === null) break
    await mission.getByTestId(`shelf-${shelf}`).click()
  }

  await expect(mission.getByTestId('hud-status')).toContainText('Wave cleared')
  await expect(page.getByText('Aguardando verificador independente', { exact: true })).toBeVisible()
  await expect(page.getByText('Veredito independente:', { exact: false })).toHaveCount(0)
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  await expect(page.getByText('Aguardando verificador', { exact: true })).toBeVisible()

  const stored = await page.evaluate(async () => new Promise<unknown[]>((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os-verification', 2)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const request = database.transaction('raw-evidence-v2').objectStore('raw-evidence-v2').getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        database.close()
        resolve(request.result)
      }
    }
  }))
  expect(stored).toEqual([
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'pending',
      subject: {
        missionId: 'game-02-warehouse',
        unitId: 'U2-key-value-store',
      },
    }),
  ])

  await page.reload()
  await expect(page.getByText('Aguardando verificador', { exact: true })).toBeVisible()
})
