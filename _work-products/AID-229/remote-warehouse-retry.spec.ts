import { expect, test, type Frame, type Page } from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.js'

type WarehouseHook = {
  game: {
    snapshot: { phase: string; keys: readonly string[]; pendingIndex: number }
    shelfOfKey(key: string): number
    predictShelf(shelf: number): void
    retry(): void
  }
}

async function warehouseFrame(page: Page): Promise<Frame> {
  await expect.poll(() => page.frames().find((frame) => frame.url().includes('/apps/warehouse/'))?.url()).toContain('/apps/warehouse/')
  const frame = page.frames().find((candidate) => candidate.url().includes('/apps/warehouse/'))
  if (frame === undefined) throw new Error('WAREHOUSE iframe remoto não carregou')
  await expect.poll(() => frame.evaluate(() => Boolean((window as Window & { __warehouse?: WarehouseHook }).__warehouse))).toBe(true)
  return frame
}

async function records(page: Page) {
  return page.evaluate(async () => new Promise<{ evidenceId: string; attemptId: string; missionRunId: string; status: string }[]>((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os-verification', 2)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result
      const request = db.transaction('raw-evidence-v2').objectStore('raw-evidence-v2').getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        db.close()
        resolve(request.result.map((item) => ({ evidenceId: item.evidenceId, attemptId: item.record?.attempt_id, missionRunId: item.missionRunId, status: item.status })))
      }
    }
  }))
}

test('candidato remoto preserva FAIL e aceita retry PASS correlacionado após reload', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  await page.getByRole('button', { name: /Trilha técnica.*Dev/ }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Revisar agora' }).click()

  const frame = await warehouseFrame(page)
  await expect.poll(() => frame.evaluate(() => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.keys.length ?? 0)).toBeGreaterThan(0)
  await frame.evaluate(() => {
    const hook = (window as Window & { __warehouse?: WarehouseHook }).__warehouse
    if (!hook) throw new Error('hook ausente')
    while (hook.game.snapshot.phase === 'predicting') {
      const key = hook.game.snapshot.keys[hook.game.snapshot.pendingIndex]
      if (key === undefined) break
      hook.game.predictShelf(hook.game.shelfOfKey(key) === 0 ? 1 : 0)
    }
  })
  await expect.poll(() => frame.evaluate(() => (window as Window & { __warehouse?: WarehouseHook }).__warehouse?.game.snapshot.phase)).toBe('failed')
  await expect(page.getByText('Veredito independente: FAIL', { exact: true })).toBeVisible({ timeout: 15_000 })
  const failed = await records(page)
  expect(failed).toHaveLength(1)
  expect(failed[0]).toMatchObject({ attemptId: 'kv-warehouse-L1-attempt-1', status: 'verified' })

  await frame.evaluate(() => {
    const hook = (window as Window & { __warehouse?: WarehouseHook }).__warehouse
    if (!hook) throw new Error('hook ausente')
    hook.game.retry()
    while (hook.game.snapshot.phase === 'predicting') {
      const key = hook.game.snapshot.keys[hook.game.snapshot.pendingIndex]
      if (key === undefined) break
      hook.game.predictShelf(hook.game.shelfOfKey(key))
    }
  })
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible({ timeout: 15_000 })
  const retried = await records(page)
  expect(retried).toHaveLength(2)
  expect(retried.map((record) => record.attemptId).sort()).toEqual(['kv-warehouse-L1-attempt-1', 'kv-warehouse-L1-attempt-2'])
  expect(new Set(retried.map((record) => record.evidenceId)).size).toBe(2)
  expect(new Set(retried.map((record) => record.missionRunId)).size).toBe(1)

  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  await expect(page).toHaveURL(/\/hub$/)
  await page.reload()
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible({ timeout: 15_000 })
  expect(await records(page)).toEqual(retried)
  await page.screenshot({ path: 'warehouse-retry-pass.png', fullPage: true })
})
