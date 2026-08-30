import { expect, test, type Frame, type Page } from '@playwright/test'
import { lessons } from '../../literacyDojo/src/data/generated/lessons'

const chapterLessons = new Map(
  lessons.filter((lesson) => ['l01', 'l02', 'l03'].includes(lesson.id)).map((lesson) => [lesson.id, lesson]),
)

async function completeLiteracyMission(page: Page, lessonId: 'l01' | 'l02' | 'l03') {
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
    return (window as Window & { __pipelinePlant?: Hook }).__pipelinePlant?.game.snapshot.phase
  })).toBe('briefing')
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
    hook.game.start()
    hook.game.predictOverflow(hook.game.bufferedOverflows())
  })
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

  await page.goto('/mission/dev/game-06-pipeline-plant')
  await expect(page.getByRole('heading', { name: 'PIPELINE PLANT: File Upload/Processing Pipeline' })).toBeVisible()
  await completePipeline(await gameFrame(page, 5206))
  await returnFromGame(page)

  await page.reload()
  const progress = await readOsProgress(page)
  for (const key of [
    'ai-pratica:l01',
    'ai-pratica:l02',
    'ai-pratica:l03',
    'dev:game-02-warehouse',
    'dev:game-03-wormhole',
    'dev:game-05-relay-station',
    'dev:game-06-pipeline-plant',
  ]) {
    expect(progress.missionStatusByKey[key]).toBe('completed')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
