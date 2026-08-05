import { expect, test, type Page } from '@playwright/test'

type ProtocolEnvelope = {
  protocol: string
  version: string
  messageId: string
  hostSessionId: string
  missionRunId: string
  engineId: string
  sentAt: string
}

async function verificationRecordCount(page: Page): Promise<number> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('codexdojo-os-verification', 2)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('raw-evidence-v2')) {
        database.createObjectStore('raw-evidence-v2', { keyPath: 'storageId' })
      }
      if (!database.objectStoreNames.contains('verification-receipts')) {
        database.createObjectStore('verification-receipts', { keyPath: 'evidenceDigest' })
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction(['raw-evidence-v2', 'verification-receipts'])
      const raw = transaction.objectStore('raw-evidence-v2').count()
      const receipts = transaction.objectStore('verification-receipts').count()
      transaction.oncomplete = () => {
        database.close()
        resolve(raw.result + receipts.result)
      }
      transaction.onerror = () => reject(transaction.error)
    }
  }))
}

test('rejects hostile mission envelopes without mutating any authority surface', async ({ page }) => {
  await page.addInitScript(() => {
    const captured: unknown[] = []
    Object.defineProperty(window, '__capturedHostMessages', { value: captured })
    window.addEventListener('message', (event) => {
      if ((event.data as { protocol?: string } | null)?.protocol === 'aidevschool.host-engine') {
        captured.push(event.data)
      }
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  const canonicalCount = canonicalLabel?.match(/\d+/)?.[0]
  expect(canonicalCount).toBeTruthy()
  await page.getByRole('button', { name: 'Começar missão' }).click()
  await expect.poll(
    () => page.frames().some((candidate) => candidate.url().startsWith('http://127.0.0.1:5178/')),
  ).toBe(true)
  const frame = page.frames().find((candidate) => candidate.url().startsWith('http://127.0.0.1:5178/'))
  if (frame === undefined) throw new Error('Literacy mission frame was not loaded')
  await expect.poll(() => frame.evaluate(
    () => (window as Window & { __capturedHostMessages?: unknown[] }).__capturedHostMessages?.length,
  )).toBeGreaterThan(0)
  const captured = await frame.evaluate(() => (
    (window as Window & { __capturedHostMessages?: ProtocolEnvelope[] }).__capturedHostMessages ?? []
  ))
  const correlated = captured.find((message) => message.protocol === 'aidevschool.host-engine')
  if (correlated === undefined) throw new Error('Expected a correlated host envelope')

  // Mission launch analytics are persisted asynchronously. Wait for the
  // legitimate event before taking the security baseline, otherwise its late
  // arrival is indistinguishable from a mutation caused by the hostile input.
  await expect.poll(async () => page.evaluate(() => {
    const queue = JSON.parse(localStorage.getItem('codexdojo-os.analytics.queue.v1') ?? '[]') as Array<{
      name?: string
    }>
    return queue.some((event) => event.name === 'mission.started')
  })).toBe(true)

  const beforeVerification = await verificationRecordCount(page)
  const beforeAnalytics = await page.evaluate(
    () => localStorage.getItem('codexdojo-os.analytics.queue.v1'),
  )

  await page.evaluate((base) => {
    const iframe = document.querySelector<HTMLIFrameElement>('.mission-runtime iframe')
    if (iframe?.contentWindow === null || iframe?.contentWindow === undefined) {
      throw new Error('Mission frame unavailable')
    }
    const state = (overrides: Record<string, unknown> = {}) => ({
      ...base,
      type: 'mission.state',
      messageId: `attack-${crypto.randomUUID()}`,
      sentAt: new Date().toISOString(),
      payload: { revision: 999, status: 'completed', stage: 'apply', progress: 1 },
      ...overrides,
    })
    const dispatch = (data: unknown, origin: string, source: Window | null) => {
      window.dispatchEvent(new MessageEvent('message', { data, origin, source }))
    }
    const expectedOrigin = new URL(iframe.src).origin
    dispatch(state(), expectedOrigin, window)
    dispatch(state(), 'https://attacker.invalid', iframe.contentWindow)
    dispatch(state({ hostSessionId: 'attacker-session' }), expectedOrigin, iframe.contentWindow)
    dispatch(state({ missionRunId: 'attacker-run' }), expectedOrigin, iframe.contentWindow)
    dispatch(state({ engineId: 'voxelDojo' }), expectedOrigin, iframe.contentWindow)
    dispatch(state({ version: '9.9' }), expectedOrigin, iframe.contentWindow)
    dispatch(
      state({ payload: { revision: 999, status: 'completed', stage: 'apply', progress: 1, padding: 'x'.repeat(70_000) } }),
      expectedOrigin,
      iframe.contentWindow,
    )
  }, correlated)

  await page.waitForTimeout(250)
  await expect(page).toHaveURL(/\/mission\/ai-pratica\/l02$/)
  await expect(page.getByTitle('Missão IA não é uma fonte de verdade')).toBeVisible()
  await expect(page.getByText(`${canonicalCount} verificadas · sem alteração local`)).toBeVisible()
  expect(await verificationRecordCount(page)).toBe(beforeVerification)
  expect(await page.evaluate(() => localStorage.getItem('codexdojo-os.analytics.queue.v1'))).toBe(
    beforeAnalytics,
  )
})
