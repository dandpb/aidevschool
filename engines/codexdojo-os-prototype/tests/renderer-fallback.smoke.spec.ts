import { expect, type Page, test } from '@playwright/test'

type WarehouseHook = {
  readonly game: {
    readonly snapshot: {
      readonly keys: readonly string[]
      readonly pendingIndex: number
      readonly phase: string
    }
    shelfOfKey(key: string): number
  }
}

async function launchWarehouse(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
  await page.goto('/mission/dev/game-02-warehouse')
  await expect(page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' })).toBeVisible()
  await expect.poll(
    () => page.frames().some((frame) => frame.url().startsWith('http://127.0.0.1:5202/')),
  ).toBe(true)
}

function warehouseFrame(page: Page) {
  const frame = page.frames().find((candidate) => candidate.url().startsWith('http://127.0.0.1:5202/'))
  if (frame === undefined) throw new Error('Warehouse mission frame was not loaded')
  return frame
}

async function correctShelf(page: Page): Promise<number | null> {
  return warehouseFrame(page).evaluate(() => {
    const hook = (window as Window & { __warehouse?: WarehouseHook }).__warehouse
    if (hook === undefined) throw new Error('Warehouse test hook is unavailable')
    const state = hook.game.snapshot
    const key = state.keys[state.pendingIndex]
    return key === undefined ? null : hook.game.shelfOfKey(key)
  })
}

async function completeWithAccessibleKeyboard(page: Page): Promise<void> {
  const mission = page.frameLocator(
    'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  )
  for (let index = 0; index < 20; index += 1) {
    const shelf = await correctShelf(page)
    if (shelf === null) break
    const action = mission.getByTestId(`accessible-shelf-${shelf}`)
    await action.focus()
    await action.press('Enter')
  }
  await expect(mission.getByTestId('hud-status')).toContainText('Missão concluída; evidência emitida.')
}

async function evidenceIdentity(page: Page): Promise<Readonly<Record<string, unknown>>> {
  return warehouseFrame(page).evaluate(() => {
    const records = (window as Window & {
      __voxelDojoEvidence?: ReadonlyArray<Readonly<Record<string, unknown>>>
    }).__voxelDojoEvidence ?? []
    const record = records[0]
    if (record === undefined) throw new Error('Expected teaching-game evidence')
    return {
      source: record.source,
      unit_id: record.unit_id,
      project: record.project,
      scenario_id: record.scenario_id,
      game: record.game,
      pass: record.pass,
    }
  })
}

test('reduced motion selects the keyboard-operable semantic projection', async ({ page }) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await launchWarehouse(page)
  const mission = page.frameLocator(
    'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  )

  await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  await expect(page.getByText('Acessível', { exact: true })).toBeVisible()
  await completeWithAccessibleKeyboard(page)
  await expect(page.getByTestId('completion-is-not-mastery')).toBeVisible()
  await expect(page.getByText('O verificador independente aprovou esta evidência. O gate canônico continua separado.', { exact: true })).toBeVisible()
  await expect.poll(() => evidenceIdentity(page)).toEqual({
    source: 'voxeldojo',
    unit_id: 'U2-key-value-store',
    project: '02_key_value_store',
    scenario_id: 'kv-warehouse-L1',
    game: 'KV WAREHOUSE',
    pass: true,
  })
})

test('context loss degrades and retries without resetting simulation or evidence identity', async ({ page }) => {
  test.setTimeout(60_000)
  await launchWarehouse(page)
  const mission = page.frameLocator(
    'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  )
  await expect(page.getByText('3D WebGL', { exact: true })).toBeVisible()
  const canvas = mission.locator('#stage')
  await expect(canvas).toBeVisible()
  expect(await canvas.evaluate((stage) => {
    const surface = stage as HTMLCanvasElement
    return surface.width > 0 && surface.height > 0 && surface.getContext('webgl2') !== null
  })).toBe(true)
  // Playwright's locator.screenshot() hangs on WebGL at 375px; prove paint in-page.
  await expect.poll(() => canvas.evaluate((stage) => {
    const surface = stage as HTMLCanvasElement
    return surface.toDataURL('image/png').length
  })).toBeGreaterThan(2_000)

  for (let index = 0; index < 2; index += 1) {
    const shelf = await correctShelf(page)
    if (shelf === null) throw new Error('Expected a pending shelf prediction')
    await mission.getByTestId(`shelf-${shelf}`).click()
  }
  expect(await warehouseFrame(page).evaluate(
    () => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.pendingIndex,
  )).toBe(2)

  await canvas.evaluate((stage) => {
    stage.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  })
  await expect(page.getByText('Missão preservada em modo acessível')).toBeVisible()
  await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  expect(await warehouseFrame(page).evaluate(
    () => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.pendingIndex,
  )).toBe(2)

  await page.getByRole('button', { name: 'Tentar 3D novamente' }).click()
  await expect(page.getByText('3D WebGL', { exact: true })).toBeVisible()
  expect(await warehouseFrame(page).evaluate(
    () => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.pendingIndex,
  )).toBe(2)
  await page.getByRole('button', { name: 'Usar visualização acessível' }).click()
  await expect(mission.getByTestId('accessible-projection')).toBeVisible()

  await completeWithAccessibleKeyboard(page)
  await expect(page.getByTestId('completion-is-not-mastery')).toBeVisible()
  await expect(page.getByText('O verificador independente aprovou esta evidência. O gate canônico continua separado.', { exact: true })).toBeVisible()
  await expect.poll(() => evidenceIdentity(page)).toEqual({
    source: 'voxeldojo',
    unit_id: 'U2-key-value-store',
    project: '02_key_value_store',
    scenario_id: 'kv-warehouse-L1',
    game: 'KV WAREHOUSE',
    pass: true,
  })
})

test('forced WebGL unavailability fails over without blocking mission controls', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function getContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === 'webgl2' || contextId === 'webgl') return null
      return original.call(this, contextId, ...args as [])
    } as typeof original
  })
  await launchWarehouse(page)
  const mission = page.frameLocator(
    'iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]',
  )

  await expect(page.getByText('WebGL não está disponível neste dispositivo.')).toBeVisible()
  await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  await expect(mission.getByTestId(/accessible-shelf-/).first()).toBeVisible()
})
