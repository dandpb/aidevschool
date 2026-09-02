import { expect, test, type FrameLocator, type Frame, type Page } from '@playwright/test'
import { lessons } from '../../literacyDojo/src/data/generated/lessons'

const chapterLessons = new Map(
  lessons.filter((lesson) => ['l01', 'l02', 'l03', 'l15', 'l16', 'l18', 'l19', 'l20', 'l21', 'l22', 'l23', 'l24', 'l25', 'l26', 'l27'].includes(lesson.id)).map((lesson) => [lesson.id, lesson]),
)

type ChapterLessonId = 'l01' | 'l02' | 'l03' | 'l15' | 'l16' | 'l18' | 'l19' | 'l20' | 'l21' | 'l22' | 'l23' | 'l24' | 'l25' | 'l26' | 'l27'

// AID-571 (#227): the literacy option cards render
// `<label class="option-card"><input/><span>…</span></label>` with a hover
// transform transition, so `check()` on the 20px input under the text span can
// have its click swallowed by a re-render ("Clicking the checkbox did not
// change its state"). A learner clicks the card, so we click the label and
// assert the end state retryably; the isChecked() guard keeps re-clicks
// idempotent for checkboxes (radios cannot toggle off via their label).
async function checkControl(mission: FrameLocator, testId: string) {
  const input = mission.getByTestId(testId)
  const card = input.locator('xpath=ancestor::label[1]')
  await expect(async () => {
    if (!(await input.isChecked())) {
      await card.click()
    }
    await expect(input).toBeChecked({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
}

async function completeLiteracyMission(page: Page, lessonId: ChapterLessonId) {
  const lesson = chapterLessons.get(lessonId)
  if (lesson === undefined) throw new Error(`Missing generated lesson ${lessonId}`)
  const mission = page.frameLocator('.mission-runtime iframe')
  await mission.getByTestId('start-lesson').click()
  for (const [index, activity] of lesson.activities.entries()) {
    if (activity.type === 'choice') {
      for (const optionId of activity.evaluation.correctOptionIds) {
        await checkControl(mission, `option-${optionId}`)
      }
    } else if (activity.type === 'output_comparison') {
      await checkControl(mission, `output-${activity.evaluation.betterOutputId}`)
      for (const criterionId of activity.evaluation.requiredCriterionIds) {
        await checkControl(mission, `criterion-${criterionId}`)
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
        await checkControl(mission, `context-${contextId}`)
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
    } else if (activity.type === 'rubric_review') {
      for (const criterion of activity.data.criteria) {
        const verdict = activity.evaluation.expectedVerdicts[criterion.id]
        if (verdict === undefined) throw new Error(`Missing expected verdict for criterion ${criterion.id}`)
        await checkControl(mission, `rubric-${criterion.id}-${verdict}`)
      }
    } else if (activity.type === 'safety_classification') {
      for (const item of activity.data.items) {
        const label = activity.evaluation.classification[item.id]
        if (label === undefined) throw new Error(`Missing classification for item ${item.id}`)
        await checkControl(mission, `item-${item.id}-${label}`)
      }
    } else {
      throw new Error(`Unexpected chapter-continuity activity ${activity.type}`)
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

async function completeDockingBay(frame: Frame) {
  await expect.poll(() => frame.evaluate(() => {
    type Hook = { game: { snapshot: { phase: string } } }
    const phase = (window as Window & { __dockingBay?: Hook }).__dockingBay?.game.snapshot.phase
    return phase === 'briefing' || phase === 'predicting'
  })).toBe(true)
  await frame.evaluate(() => {
    type Pod = { id: string }
    type Hook = {
      game: {
        snapshot: { phase: string; pods: readonly Pod[] }
        start(): void
        podWouldDock(pod: Pod): boolean
        predictDock(podId: string, willDock: boolean): void
      }
    }
    const hook = (window as Window & { __dockingBay?: Hook }).__dockingBay
    if (hook === undefined) throw new Error('Docking Bay hook unavailable')
    if (hook.game.snapshot.phase === 'briefing') hook.game.start()
    for (const pod of hook.game.snapshot.pods) {
      if (hook.game.snapshot.phase !== 'predicting') break
      hook.game.predictDock(pod.id, hook.game.podWouldDock(pod))
    }
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
  test.setTimeout(180_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()

  await page.getByRole('button', { name: 'Começar missão' }).click()
  await completeLiteracyMission(page, 'l02')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'O que a IA faz bem e onde costuma falhar' })).toBeVisible()
  await page.getByRole('button', { name: 'Começar missão' }).click()
  await completeLiteracyMission(page, 'l03')
  // Public IA Prática rail is l01-l03. After l02 and l03, the remaining rail
  // mission is l01, not l04+ from the full catalog.
  await page.getByRole('button', { name: 'Começar missão' }).click()
  await expect(page.getByRole('heading', { name: 'Sua primeira conversa com uma IA' })).toBeVisible()
  await expect(page.locator('.mission-runtime iframe')).toBeVisible()
  await expect(
    page.frameLocator('.mission-runtime iframe').getByTestId('start-lesson'),
  ).toBeVisible({ timeout: 20000 })
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

  // Wave O2 T1 (spec AID-528 rev 3): l24 "Anexe, cole ou descreva" opens
  // mod-07 as the 18th ai-pratica mission (chapterOrder 18, canonical prereq
  // l18 — completed above). Completes end-to-end through multiSelect choice,
  // prompt_builder, and missing_context.
  await page.goto('/mission/ai-pratica/l24')
  await expect(page.getByRole('heading', { name: 'Anexe, cole ou descreva' })).toBeVisible()
  await completeLiteracyMission(page, 'l24')

  // Wave O2 T2 (spec AID-528 rev 3 §2.2): l25 "Anexos seguros" is the 19th
  // ai-pratica mission (chapterOrder 19, canonical prereq l12 — completed
  // above). Completes end-to-end through safety_classification, choice, and
  // missing_context.
  await page.goto('/mission/ai-pratica/l25')
  await expect(page.getByRole('heading', { name: 'Anexos seguros: proteja antes de enviar' })).toBeVisible()
  await completeLiteracyMission(page, 'l25')

  // Wave O2 T3 (spec AID-528 rev 3 §2.3): l26 "Confira o que a IA extraiu"
  // closes mod-07 as the 20th ai-pratica mission (chapterOrder 20, canonical
  // prereq l20 — completed above). Completes end-to-end through
  // output_comparison, choice, and sort.
  await page.goto('/mission/ai-pratica/l26')
  await expect(page.getByRole('heading', { name: 'Confira o que a IA extraiu' })).toBeVisible()
  await completeLiteracyMission(page, 'l26')

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

  // The dev track also publishes the Dev-journey literacy lessons (l15-l17
  // + l21-l23 + l27, module 05). Wave l21-l23 (spec AID-528 rev 2) anchors on the
  // canonical prerequisites l16/l15, so complete the anchor chain first
  // (l15 -> l16) to unlock the wave missions, then host and complete each
  // new lesson end-to-end through its three activities.
  await page.goto('/mission/dev/l15')
  await expect(page.getByRole('heading', { name: 'Quando usar IA e quando não usar' })).toBeVisible()
  await completeLiteracyMission(page, 'l15')

  await page.goto('/mission/dev/l16')
  await expect(page.getByRole('heading', { name: 'Seu primeiro código com um assistente de IA' })).toBeVisible()
  await completeLiteracyMission(page, 'l16')

  // Wave dev l21 (spec AID-528 rev 2): l21 "Peça testes que valem a pena" is
  // published as the 11th dev mission (chapterOrder 11, canonical prereq l16).
  // Completes end-to-end through prompt_builder, missing_context, and
  // multiSelect choice.
  await page.goto('/mission/dev/l21')
  await expect(page.getByRole('heading', { name: 'Peça testes que valem a pena' })).toBeVisible()
  await completeLiteracyMission(page, 'l21')

  // Wave dev l22 (spec AID-528 rev 2): l22 "Revise o código sugerido como
  // engenheiro" is the 12th dev mission (chapterOrder 12, canonical prereq
  // l16). Completes end-to-end through rubric_review, output_comparison,
  // and sort.
  await page.goto('/mission/dev/l22')
  await expect(page.getByRole('heading', { name: 'Revise o código sugerido como engenheiro' })).toBeVisible()
  await completeLiteracyMission(page, 'l22')

  // Wave dev l23 (spec AID-528 rev 2): l23 "O que aceitar: limites do
  // assistente" closes the wave as the 13th dev mission (chapterOrder 13,
  // canonical prereq l15). Completes end-to-end through choice,
  // safety_classification, and multiSelect choice.
  await page.goto('/mission/dev/l23')
  await expect(page.getByRole('heading', { name: 'O que aceitar: limites do assistente' })).toBeVisible()
  await completeLiteracyMission(page, 'l23')

  // Wave O1 T1 (spec AID-610 rev 2 §2.1): l27 "Debug com assistente:
  // reproduza antes de perguntar" opens the O1 dev wave as the 14th dev
  // mission (chapterOrder 14, canonical prereq l21 — completed above).
  // Completes end-to-end through sort, prompt_builder, and missing_context.
  await page.goto('/mission/dev/l27')
  await expect(page.getByRole('heading', { name: 'Debug com assistente: reproduza antes de perguntar' })).toBeVisible()
  await completeLiteracyMission(page, 'l27')

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

  // Wave OP-A (AID-462): game-09 DOCKING BAY is published as the 10th dev
  // mission (chapterOrder 10, prereq game-08-timeline-tower). The hosted mission
  // must complete end-to-end through the deterministic public API truth; the
  // dock oracle uses the clamp's contract check (AID-467 fix-forward).
  await page.goto('/mission/dev/game-09-docking-bay')
  await expect(page.getByRole('heading', { name: 'DOCKING BAY: Plugin System' })).toBeVisible()
  await completeDockingBay(await gameFrame(page, 5209))
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
    'ai-pratica:l24',
    'ai-pratica:l25',
    'ai-pratica:l26',
    'dev:game-02-warehouse',
    'dev:game-03-wormhole',
    'dev:game-05-relay-station',
    'dev:game-06-pipeline-plant',
    'dev:game-07-checkpoint-city',
    'dev:game-08-timeline-tower',
    'dev:game-09-docking-bay',
    'dev:l15',
    'dev:l16',
    'dev:l21',
    'dev:l22',
    'dev:l23',
    'dev:l27',
  ]) {
    expect(progress.missionStatusByKey[key]).toBe('completed')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
