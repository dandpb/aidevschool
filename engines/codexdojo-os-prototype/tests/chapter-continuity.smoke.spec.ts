import { expect, test, type Frame, type Page } from '@playwright/test'
import { lessons } from '../../literacyDojo/src/data/generated/lessons'

const chapterLessons = new Map(
  lessons.filter((lesson) => ['l01', 'l02', 'l03', 'l18', 'l19', 'l20'].includes(lesson.id)).map((lesson) => [lesson.id, lesson]),
)

type ChapterLessonId = 'l01' | 'l02' | 'l03' | 'l18' | 'l19' | 'l20'

async function completeLiteracyMission(page: Page, lessonId: ChapterLessonId) {
  const lesson = chapterLessons.get(lessonId)
  if (lesson === undefined) throw new Error(`Missing generated lesson ${lessonId}`)
  const mission = page.frameLocator('.mission-runtime iframe')
  await mission.getByTestId('start-lesson').click()
  for (const [index, activity] of lesson.activities.entries()) {
    if (activity.type === 'choice') {
      for (const optionId of activity.evaluation.correctOptionIds) {
        await mission.getByTestId(`option-${optionId}`).check()
      }
    } else if (activity.type === 'output_comparison') {
      await mission.getByTestId(`output-${activity.evaluation.betterOutputId}`).check()
      for (const criterionId of activity.evaluation.requiredCriterionIds) {
        await mission.getByTestId(`criterion-${criterionId}`).check()
      }
    } else if (activity.type === 'prompt_builder') {
      for (const field of activity.data.fields) {
        const rule = activity.evaluation.fields[field.id]
        if (rule === undefined) throw new Error(`Missing evaluation rule for field ${field.id}`)
        const word = rule.mustIncludeAny?.[0]
        if (word === undefined) throw new Error(`Missing mustIncludeAny for field ${field.id}`)
        const filler = rule.minLength === undefined ? word : word.repeat(Math.ceil(rule.minLength / word.length) + 1)
        await mission.getByTestId(`field-${field.id}`).fill(filler)
      }
    } else if (activity.type === 'missing_context') {
      for (const contextId of activity.evaluation.requiredContextIds) {
        await mission.getByTestId(`context-${contextId}`).check()
      }
    } else if (activity.type === 'sort') {
      const order = activity.data.items.map((item) => item.id)
      for (const [target, expectedId] of activity.evaluation.expectedOrder.entries()) {
        const presses = order.indexOf(expectedId) - target
        const direction = presses >= 0 ? 'up' : 'down'
        for (let press = 0; press < Math.abs(presses); press += 1) {
          await mission.getByTestId(`sort-${direction}-${expectedId}`).click()
        }
        order.splice(order.indexOf(expectedId), 1)
        order.splice(target, 0, expectedId)
      }
    } else {
      throw new Error(`Unexpected first-chapter activity ${activity.type}`)
    }
    await mission.getByTestId('submit-attempt').click()
    if (index === lesson.activities.length - 1) {
      await mission.getByTestId('finish-lesson').click()
    } else {
      await mission.getByTestId('next-activity').click()
    }
  }
  await expect(page.getByRole('button', { name: 'Voltar ao hub', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click()
}

async function gameFrame(page: Page, port: number): Promise<Frame> {
  await expect(page.locator('.mission-runtime iframe')).toBeVisible()
  await expect.poll(() => page.frames().some((frame) => frame.url().startsWith(`http://127.0.0.1:${port}/`))).toBe(true)
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

async function completeWormhole(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    return (window as Window & { __wormhole?: Hook }).__wormhole?.game.snapshot.phase
  })).toBe('predicting')
  await frame.evaluate(() => {
    type Hook = {
      game: {
        snapshot: { phase: string }
        predictedCodeForPending(): string
        predictCode(code: string): void
      }
    }
    const hook = (window as Window & { __wormhole?: Hook }).__wormhole
    if (hook === undefined) throw new Error('Wormhole hook unavailable')
    while (hook.game.snapshot.phase === 'predicting') {
      const code = hook.game.predictedCodeForPending()
      if (code === '') break
      hook.game.predictCode(code)
    }
  })
}

async function completeRelay(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    return (window as Window & { __relayStation?: Hook }).__relayStation?.game.snapshot.phase
  })).toBe('predicting')
  await frame.evaluate(() => {
    type Hook = {
      game: {
        snapshot: { phase: string }
        truthConnected(): string[]
        togglePredict(stationId: string): void
        submit(): void
      }
    }
    const hook = (window as Window & { __relayStation?: Hook }).__relayStation
    if (hook === undefined) throw new Error('Relay Station hook unavailable')
    for (const stationId of hook.game.truthConnected()) hook.game.togglePredict(stationId)
    hook.game.submit()
  })
}

async function completePipeline(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    const phase = (window as Window & { __pipelinePlant?: Hook }).__pipelinePlant?.game.snapshot.phase
    return phase === 'briefing' || phase === 'predicting'
  })).toBe(true)
  await frame.evaluate(() => {
    type Hook = {
      game: {
        snapshot: { phase: string }
        start(): void
        bufferedOverflows(): boolean
        predictOverflow(willOverflow: boolean): void
      }
    }
    const hook = (window as Window & { __pipelinePlant?: Hook }).__pipelinePlant
    if (hook === undefined) throw new Error('Pipeline Plant hook unavailable')
    if (hook.game.snapshot.phase === 'briefing') hook.game.start()
    hook.game.predictOverflow(hook.game.bufferedOverflows())
  })
}

async function completeCheckpointCity(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    const phase = (window as Window & { __checkpointCity?: Hook }).__checkpointCity?.game.snapshot.phase
    return phase === 'briefing' || phase === 'predicting'
  })).toBe(true)
  await frame.evaluate(() => {
    type Hook = {
      game: {
        snapshot: { phase: string }
        start(): void
        pendingAnswer(): string | null
        predict(target: string): void
      }
    }
    const hook = (window as Window & { __checkpointCity?: Hook }).__checkpointCity
    if (hook === undefined) throw new Error('Checkpoint City hook unavailable')
    if (hook.game.snapshot.phase === 'briefing') hook.game.start()
    while (hook.game.snapshot.phase === 'predicting') {
      const answer = hook.game.pendingAnswer()
      if (answer === null) break
      hook.game.predict(answer)
    }
  })
}

async function completeTimelineTower(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    const phase = (window as Window & { __timelineTower?: Hook }).__timelineTower?.game.snapshot.phase
    return phase === 'briefing' || phase === 'playing'
  })).toBe(true)
  await frame.evaluate(() => {
    type Hook = {
      game: {
        snapshot: { phase: string; level: { id: string } }
        start(): void
        nextCorrectEventType(): string
        appendNext(type: string): void
        truthStatus(): string
        predictStatus(status: string): void
      }
    }
    const hook = (window as Window & { __timelineTower?: Hook }).__timelineTower
    if (hook === undefined) throw new Error('Timeline Tower hook unavailable')
    if (hook.game.snapshot.phase === 'briefing') hook.game.start()
    while (hook.game.snapshot.phase === 'playing' && hook.game.snapshot.level.id === 'L1') {
      hook.game.appendNext(hook.game.nextCorrectEventType())
    }
  })
  // The L1 wave resolution leaves the tower cleared; the evidence record for L1
  // is the one the host verifies, so the mission completes on the first level.
}

async function returnFromGame(page: Page) {
  await expect(page.getByRole('button', { name: 'Voltar ao hub', exact: true })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click()
}

async function readOsProgress(page: Page): Promise<{ missionStatusByKey: Record<string, string> }> {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('codexdojo-os', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const database = open.result
      const request = database.transaction('progress').objectStore('progress').get('os-progress')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        database.close()
        resolve(request.result)
      }
    }
  }))
}

test('preserves completed first-release missions across switches and reloads', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await page.getByRole('button', { name: 'Começar missão' }).click()
  await completeLiteracyMission(page, 'l02')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'O que a IA faz bem e onde costuma falhar' })).toBeVisible()
  await page.getByRole('button', { name: 'Começar missão' }).click()
  await completeLiteracyMission(page, 'l03')
  // The hub now recommends the next published lesson (l04+) once l03 is done.
  // Prove the newly published batch actually hosts: the motor handshake must
  // reach the literacy start screen instead of failing or being refused.
  await page.getByRole('button', { name: 'Começar missão' }).click()
  await expect(page.getByRole('heading', { name: 'Dê um objetivo claro' })).toBeVisible()
  await expect(page.locator('.mission-runtime iframe')).toBeVisible()
  await expect(
    page.frameLocator('.mission-runtime iframe').getByTestId('start-lesson'),
  ).toBeVisible({ timeout: 20000 })
  // Complete the remaining first-release lesson l01 through its direct mission
  // URL, exactly like the hosted simulations below.
  await page.goto('/mission/ai-pratica/l01')
  await completeLiteracyMission(page, 'l01')

  // Wave C1 (spec AID-414): l18 "Biblioteca de pedidos" is published as the
  // 15th ai-pratica mission (chapterOrder 15, canonical prereq l14). The
  // direct mission must host the literacy motor and complete end-to-end
  // through its three activities (prompt_builder, output_comparison, choice).
  await page.goto('/mission/ai-pratica/l18')
  await expect(page.getByRole('heading', { name: 'Biblioteca de pedidos: reutilize o que funciona' })).toBeVisible()
  await completeLiteracyMission(page, 'l18')

  // Wave C2 (spec AID-414): l19 "Conversas longas" is the 16th ai-pratica
  // mission (chapterOrder 16, canonical prereq l07 — the module-02 iteration
  // lesson it extends). Completes end-to-end through missing_context, sort,
  // and choice.
  await page.goto('/mission/ai-pratica/l19')
  await expect(page.getByRole('heading', { name: 'Conversas longas: gerencie o contexto' })).toBeVisible()
  await completeLiteracyMission(page, 'l19')

  // Wave C3 (spec AID-414): l20 "Números e fatos" closes the wave as the
  // 17th ai-pratica mission (chapterOrder 17, canonical prereq l10 — the
  // module-03 verification lesson it deepens). Completes end-to-end through
  // multiSelect choice, sort, and missing_context.
  await page.goto('/mission/ai-pratica/l20')
  await expect(page.getByRole('heading', { name: 'Números e fatos: verifique antes de usar' })).toBeVisible()
  await completeLiteracyMission(page, 'l20')

  await page.goto('/mission/dev/game-02-warehouse')
  await expect(page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' })).toBeVisible()
  await completeWarehouse(await gameFrame(page, 5202))
  await returnFromGame(page)

  await page.reload()
  await page.goto('/mission/dev/game-03-wormhole')
  await expect(page.getByRole('heading', { name: 'WORMHOLE: URL Shortener' })).toBeVisible()
  await completeWormhole(await gameFrame(page, 5203))
  await returnFromGame(page)

  await page.goto('/mission/dev/game-05-relay-station')
  await expect(page.getByRole('heading', { name: 'RELAY STATION: WebSocket Chat Server' })).toBeVisible()
  await completeRelay(await gameFrame(page, 5205))
  await returnFromGame(page)

  // The dev track also publishes the Dev-journey literacy lessons (l15-l17,
  // module 05). Prove the batch hosts on the dev track: the l15 motor
  // handshake must reach the literacy start screen; l16/l17 stay locked
  // behind the canonical prerequisite chain (l16: l15, l17: l16).
  await page.goto('/mission/dev/l15')
  await expect(page.getByRole('heading', { name: 'Quando usar IA e quando não usar' })).toBeVisible()
  await expect(page.locator('.mission-runtime iframe')).toBeVisible()
  await expect(
    page.frameLocator('.mission-runtime iframe').getByTestId('start-lesson'),
  ).toBeVisible({ timeout: 20000 })

  await page.goto('/mission/dev/game-06-pipeline-plant')
  await expect(page.getByRole('heading', { name: 'PIPELINE PLANT: File Upload/Processing Pipeline' })).toBeVisible()
  await completePipeline(await gameFrame(page, 5206))
  await returnFromGame(page)

  // Wave OP-A (AID-462): game-07 CHECKPOINT CITY is published as the 8th dev
  // mission (chapterOrder 8, prereq game-06-pipeline-plant). The hosted mission
  // must complete end-to-end through the deterministic public API truth.
  await page.goto('/mission/dev/game-07-checkpoint-city')
  await expect(page.getByRole('heading', { name: 'CHECKPOINT CITY: REST API with Auth' })).toBeVisible()
  await completeCheckpointCity(await gameFrame(page, 5207))
  await returnFromGame(page)

  // Wave OP-A (AID-462): game-08 TIMELINE TOWER is published as the 9th dev
  // mission (chapterOrder 9, prereq game-07-checkpoint-city). The hosted mission
  // must complete end-to-end through the deterministic public API truth.
  await page.goto('/mission/dev/game-08-timeline-tower')
  await expect(page.getByRole('heading', { name: 'TIMELINE TOWER: Event-Driven Order System' })).toBeVisible()
  await completeTimelineTower(await gameFrame(page, 5208))
  await returnFromGame(page)

  await page.reload()
  const progress = await readOsProgress(page)
  for (const key of [
    'ai-pratica:l01',
    'ai-pratica:l02',
    'ai-pratica:l03',
    'ai-pratica:l18',
    'ai-pratica:l19',
    'ai-pratica:l20',
    'dev:game-02-warehouse',
    'dev:game-03-wormhole',
    'dev:game-05-relay-station',
    'dev:game-06-pipeline-plant',
    'dev:game-07-checkpoint-city',
    'dev:game-08-timeline-tower',
  ]) {
    expect(progress.missionStatusByKey[key]).toBe('completed')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
