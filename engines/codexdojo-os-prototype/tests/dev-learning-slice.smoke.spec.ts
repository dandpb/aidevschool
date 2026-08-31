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

type WormholeHook = {
  readonly game: {
    readonly snapshot: { readonly phase: string }
    start(): void
    predictedCodeForPending(): string
  }
}

type RelayHook = {
  readonly game: {
    start(): void
    truthConnected(): readonly string[]
  }
}

type PipelineHook = {
  readonly game: {
    start(): void
    bufferedOverflows(): boolean
    predictOverflow(willOverflow: boolean): void
  }
}

type CheckpointHook = {
  readonly game: {
    snapshot: { phase: string }
    start(): void
    pendingAnswer(): string | null
    predict(target: string): void
  }
}

type TimelineHook = {
  readonly game: {
    snapshot: { phase: string; level: { id: string } }
    start(): void
    nextCorrectEventType(): string
    appendNext(type: string): void
  }
}

test('independently verifies all six Dev games through the shared mission contract', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.goto('/mission/dev/game-02-warehouse')

  await expect(
    page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }),
  ).toBeVisible()
  const canonicalLabel = await page.getByText(/\d+ competências verificadas/).textContent()
  const canonicalMastery = canonicalLabel?.match(/\d+/)?.[0]
  expect(canonicalMastery).toBeTruthy()

  await expect(page.getByText('Simulação hospedada · 12 min', { exact: true })).toBeVisible()
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

  await expect(mission.getByTestId('hud-status')).toContainText('Missão concluída; evidência emitida.')
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await expect(page.getByText(
    'O verificador independente aprovou esta evidência. O gate canônico continua separado.',
    { exact: true },
  )).toBeVisible()
  await expect(page.getByText(`${canonicalMastery} verificadas · sem alteração local`)).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(page.getByText('Evidência preservada', { exact: true })).toBeVisible()
  await expect(page.getByText('Verificação independente', { exact: true })).toBeVisible()
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  await expect(page.getByText('Não alterada por este fluxo', { exact: true })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'WORMHOLE: URL Shortener' })).toBeVisible()
  await page.locator('.next-mission-card .journey-primary').click()
  const wormhole = page.frameLocator('iframe[title="Missão WORMHOLE: URL Shortener"]')
  await expect.poll(
    () => page.frames().some((candidate) => candidate.url().startsWith('http://127.0.0.1:5203/')),
  ).toBe(true)
  const wormholeFrame = page.frames().find(
    (candidate) => candidate.url().startsWith('http://127.0.0.1:5203/'),
  )
  if (wormholeFrame === undefined) throw new Error('Wormhole mission frame was not loaded')
  await expect.poll(() => wormholeFrame.evaluate(
    () => (window as Window & { __wormhole?: WormholeHook }).__wormhole !== undefined,
  )).toBe(true)
  await wormholeFrame.evaluate(() => {
    const hook = (window as Window & { __wormhole?: WormholeHook }).__wormhole
    if (hook === undefined) throw new Error('Wormhole test hook is unavailable')
    hook.game.start()
  })
  for (let index = 0; index < 12; index += 1) {
    const code = await wormholeFrame.evaluate(() => {
      const hook = (window as Window & { __wormhole?: WormholeHook }).__wormhole
      if (hook === undefined || hook.game.snapshot.phase !== 'predicting') return null
      return hook.game.predictedCodeForPending()
    })
    if (code === null) break
    await wormhole.getByTestId('code-input').fill(code)
    await wormhole.getByTestId('submit-code').click()
  }
  await expect(wormhole.getByTestId('hud-status')).toContainText('cleared')
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(
    page.getByRole('heading', { name: 'RELAY STATION: WebSocket Chat Server' }),
  ).toBeVisible()
  await page.locator('.next-mission-card .journey-primary').click()
  const relay = page.frameLocator(
    'iframe[title="Missão RELAY STATION: WebSocket Chat Server"]',
  )
  await expect.poll(
    () => page.frames().some((candidate) => candidate.url().startsWith('http://127.0.0.1:5205/')),
  ).toBe(true)
  const relayFrame = page.frames().find(
    (candidate) => candidate.url().startsWith('http://127.0.0.1:5205/'),
  )
  if (relayFrame === undefined) throw new Error('Relay mission frame was not loaded')
  await expect.poll(() => relayFrame.evaluate(
    () => (window as Window & { __relayStation?: RelayHook }).__relayStation !== undefined,
  )).toBe(true)
  await relayFrame.evaluate(() => {
    const hook = (window as Window & { __relayStation?: RelayHook }).__relayStation
    if (hook === undefined) throw new Error('Relay test hook is unavailable')
    hook.game.start()
  })
  const connected = await relayFrame.evaluate(() => {
    const hook = (window as Window & { __relayStation?: RelayHook }).__relayStation
    if (hook === undefined) throw new Error('Relay test hook is unavailable')
    return hook.game.truthConnected()
  })
  for (const stationId of connected) {
    await relay.getByTestId(`station-${stationId}`).click()
  }
  await relay.getByTestId('submit').click()
  await expect(relay.getByTestId('hud-status')).toContainText('cleared')
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(
    page.getByRole('heading', { name: 'PIPELINE PLANT: File Upload/Processing Pipeline' }),
  ).toBeVisible()
  await page.locator('.next-mission-card .journey-primary').click()
  const pipeline = page.frameLocator(
    'iframe[title="Missão PIPELINE PLANT: File Upload/Processing Pipeline"]',
  )
  await expect.poll(
    () => page.frames().some((candidate) => candidate.url().startsWith('http://127.0.0.1:5206/')),
  ).toBe(true)
  const pipelineFrame = page.frames().find(
    (candidate) => candidate.url().startsWith('http://127.0.0.1:5206/'),
  )
  if (pipelineFrame === undefined) throw new Error('Pipeline mission frame was not loaded')
  await expect.poll(() => pipelineFrame.evaluate(
    () => (window as Window & { __pipelinePlant?: PipelineHook }).__pipelinePlant !== undefined,
  )).toBe(true)
  await pipelineFrame.evaluate(() => {
    const hook = (window as Window & { __pipelinePlant?: PipelineHook }).__pipelinePlant
    if (hook === undefined) throw new Error('Pipeline Plant test hook is unavailable')
    hook.game.start()
    hook.game.predictOverflow(hook.game.bufferedOverflows())
  })
  await expect(pipeline.getByTestId('hud-status')).toContainText('cleared')
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(
    page.getByRole('heading', { name: 'CHECKPOINT CITY: REST API with Auth' }),
  ).toBeVisible()
  await page.locator('.next-mission-card .journey-primary').click()
  const checkpoint = page.frameLocator(
    'iframe[title="Missão CHECKPOINT CITY: REST API with Auth"]',
  )
  await expect.poll(
    () => page.frames().some((candidate) => candidate.url().startsWith('http://127.0.0.1:5207/')),
  ).toBe(true)
  const checkpointFrame = page.frames().find(
    (candidate) => candidate.url().startsWith('http://127.0.0.1:5207/'),
  )
  if (checkpointFrame === undefined) throw new Error('Checkpoint City mission frame was not loaded')
  await expect.poll(() => checkpointFrame.evaluate(
    () => (window as Window & { __checkpointCity?: CheckpointHook }).__checkpointCity !== undefined,
  )).toBe(true)
  await checkpointFrame.evaluate(() => {
    const hook = (window as Window & { __checkpointCity?: CheckpointHook }).__checkpointCity
    if (hook === undefined) throw new Error('Checkpoint City test hook is unavailable')
    hook.game.start()
    while (hook.game.snapshot.phase === 'predicting') {
      const answer = hook.game.pendingAnswer()
      if (answer === null) break
      hook.game.predict(answer)
    }
  })
  await expect(checkpoint.getByTestId('hud-status')).toContainText('cleared')
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

  await expect(
    page.getByRole('heading', { name: 'TIMELINE TOWER: Event-Driven Order System' }),
  ).toBeVisible()
  await page.locator('.next-mission-card .journey-primary').click()
  const timeline = page.frameLocator(
    'iframe[title="Missão TIMELINE TOWER: Event-Driven Order System"]',
  )
  await expect.poll(
    () => page.frames().some((candidate) => candidate.url().startsWith('http://127.0.0.1:5208/')),
  ).toBe(true)
  const timelineFrame = page.frames().find(
    (candidate) => candidate.url().startsWith('http://127.0.0.1:5208/'),
  )
  if (timelineFrame === undefined) throw new Error('Timeline Tower mission frame was not loaded')
  await expect.poll(() => timelineFrame.evaluate(
    () => (window as Window & { __timelineTower?: TimelineHook }).__timelineTower !== undefined,
  )).toBe(true)
  await timelineFrame.evaluate(() => {
    const hook = (window as Window & { __timelineTower?: TimelineHook }).__timelineTower
    if (hook === undefined) throw new Error('Timeline Tower test hook is unavailable')
    hook.game.start()
    while (hook.game.snapshot.phase === 'playing' && hook.game.snapshot.level.id === 'L1') {
      hook.game.appendNext(hook.game.nextCorrectEventType())
    }
  })
  await expect(timeline.getByTestId('hud-status')).toContainText('cleared')
  await expect(page.getByText('Verificação independente aprovada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()

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
  expect(stored).toHaveLength(6)
  expect(stored).toEqual(expect.arrayContaining([
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'verified',
      subject: {
        missionId: 'game-02-warehouse',
        unitId: 'U2-key-value-store',
      },
    }),
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'verified',
      subject: {
        missionId: 'game-03-wormhole',
        unitId: 'U3-url-shortener',
      },
    }),
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'verified',
      subject: {
        missionId: 'game-05-relay-station',
        unitId: 'U5-websocket-chat',
      },
    }),
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'verified',
      subject: {
        missionId: 'game-06-pipeline-plant',
        unitId: 'U6-file-upload',
      },
    }),
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'verified',
      subject: {
        missionId: 'game-07-checkpoint-city',
        unitId: 'U7-rest-api-auth',
      },
    }),
    expect.objectContaining({
      schemaId: 'teaching-game-evidence',
      status: 'verified',
      subject: {
        missionId: 'game-08-timeline-tower',
        unitId: 'U8-event-driven',
      },
    }),
  ]))

  await page.reload()
  await expect(page.getByText('Veredito PASS', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({
    path: '../../.omo/evidence/integrate-multigame-verifiers/dev-games-desktop.png',
    fullPage: true,
  })
})
