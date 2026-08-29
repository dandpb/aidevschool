import { expect, test, type Page } from '@playwright/test'

type WarehouseHook = {
  readonly game: {
    readonly snapshot: {
      readonly keys: readonly string[]
      readonly pendingIndex: number
    }
    shelfOfKey(key: string): number
  }
}

type CapturedEvent = {
  readonly name: string
  readonly dimensions: Readonly<Record<string, unknown>>
}

const FORBIDDEN_ANALYTICS_FIELDS = [
  'question',
  'answer',
  'attemptExcerpt',
  'mentorContent',
  'deterministicChecks',
  'evidence',
  'record',
  'checkpoint',
  'canonicalPath',
]

async function capturedEvents(page: Page): Promise<CapturedEvent[]> {
  return page.evaluate(() => {
    const capture = (window as Window & {
      __codexdojoAnalytics?: { readonly events: readonly CapturedEvent[] }
    }).__codexdojoAnalytics
    return [...(capture?.events ?? [])]
  })
}

async function expectNoLearnerContent(events: readonly CapturedEvent[]): Promise<void> {
  const serialized = JSON.stringify(events)
  for (const field of FORBIDDEN_ANALYTICS_FIELDS) {
    expect(serialized).not.toContain(`"${field}"`)
  }
}

async function expectActivationOrder(page: Page, trackId: 'ai-pratica' | 'dev'): Promise<void> {
  await expect.poll(async () => (await capturedEvents(page)).some(
    (event) => event.name === 'mission.completed' && event.dimensions.trackId === trackId,
  )).toBe(true)

  const events = await capturedEvents(page)
  const names = events.map((event) => event.name)
  const onboarding = names.indexOf('onboarding.completed')
  const mission = names.indexOf('mission.started')
  const attempted = names.indexOf('structured_attempt.submitted')
  const passed = names.indexOf('structured_attempt.passed')
  const completed = names.indexOf('mission.completed')

  expect(onboarding).toBeGreaterThanOrEqual(0)
  expect(mission).toBeGreaterThan(onboarding)
  expect(attempted).toBeGreaterThan(mission)
  expect(passed).toBeGreaterThan(attempted)
  expect(completed).toBeGreaterThan(passed)
  expect(events.filter((event) => event.name.startsWith('mission.'))).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ dimensions: expect.objectContaining({ trackId }) }),
    ]),
  )
  await expectNoLearnerContent(events)
}

// The single-track shell records technical intent behaviorally: onboarding
// recommendationChanged is captured without a Dev track selection, and the
// first Dev chapter is entered from the published map. The funnel keeps the
// same content-free event vocabulary as the IA Pratica funnel.
async function expectDevRecommendationSignal(page: Page): Promise<void> {
  const events = await capturedEvents(page)
  const onboarding = events.find((event) => event.name === 'onboarding.completed')
  expect(onboarding?.dimensions.recommendationChanged).toBe(true)
  expect(onboarding?.dimensions.trackId).toBe('ai-pratica')
}

test('records the IA Pratica activation funnel without learner content', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  await mission.getByTestId('output-out-b').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('criterion-c-limites').check()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()

  await expectActivationOrder(page, 'ai-pratica')
})

test('records the Dev activation funnel through the same content-free schema', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  // The shell publishes one pilot sequence (IA Prática first). A technical
  // goal keeps the recommendation signal behavioral: it is recorded in
  // onboarding.completed.recommendationChanged, never as track selection.
  await page.getByLabel('Objetivo').selectOption('build-systems')
  await page.getByLabel('Confiança atual').selectOption('medium')
  await expect(page.getByRole('status')).toContainText(
    'As simulações hospedadas entram depois de IA Prática',
  )
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await page.getByRole('button', { name: 'Abrir mapa' }).click()
  await page.getByRole('listitem').filter({
    has: page.getByRole('heading', { level: 3, name: 'WAREHOUSE: Key-Value Store (in-memory)' }),
  }).getByRole('button', { name: 'Abrir' }).click()

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
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()

  await expectActivationOrder(page, 'dev')
  await expectDevRecommendationSignal(page)
})
