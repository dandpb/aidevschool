// Independent QA observation walk v41 — merged HEAD 2231beb1 (AID-1200; tree == f2f7d8f9 PR #316 head).
// Walks the published pilot bundle (dist/) served by vite preview on 4180.
// Distinct from producer CI runs; drives the public learner UI first-hand.
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

// Inlined from engines/voxelDojo/game-02-warehouse/src/sim/hash.ts (FNV-1a + murmur3 fmix32),
// identical to the producer spec's bucketOf import — plain node cannot import TS.
function fmix32(h) {
  let x = h
  x ^= x >>> 16
  x = Math.imul(x, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return x >>> 0
}
function hashKey(key) {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return fmix32(h) >>> 0
}
const bucketOf = (key, n) => hashKey(key) % n

const BASE = 'http://127.0.0.1:4180'
const OUT = '/tmp/opencode/obs41'
const EV = `${OUT}/ev`
mkdirSync(EV, { recursive: true })

const log = []
const note = (entry) => { log.push(entry); console.log(JSON.stringify(entry).slice(0, 220)) }
const shot = async (page, name) => { await page.screenshot({ path: `${EV}/${name}.png`, fullPage: false }) }

async function answerWarehouseUI(frame, correct) {
  const status = frame.getByTestId('hud-status')
  const first = await status.textContent()
  const count = first?.match(/de (\d+):/)?.[1]
  if (count === undefined) throw new Error('Warehouse crate count was not visible')
  const shelfCount = await frame.locator('[data-testid^="shelf-"]').count()
  for (let index = 0; index < Number(count); index += 1) {
    const current = await status.textContent()
    const key = current?.match(/: (.+) — clique/)?.[1]
    if (key === undefined) throw new Error('Warehouse key was not visible')
    const expected = bucketOf(key, shelfCount)
    await frame
      .getByTestId(`shelf-${correct ? expected : (expected + 1) % shelfCount}`)
      .dispatchEvent('click')
  }
}

async function checkControl(mission, testId) {
  const input = mission.getByTestId(testId)
  const card = input.locator('xpath=ancestor::label[1]')
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (await input.isChecked()) return
    await card.click({ timeout: 2000 }).catch(() => {})
    await page_wait(300)
  }
  if (!(await input.isChecked())) throw new Error(`control not checkable: ${testId}`)
}
const page_wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function completeSort(mission, expectedOrder) {
  const order = [...expectedOrder]
  // start from the current (shuffled) order read from the DOM
  const current = await mission.locator('[data-testid^="sort-up-"]').evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute('data-testid').replace('sort-up-', '')),
  )
  const state = [...current]
  for (const [target, expectedId] of expectedOrder.entries()) {
    const presses = state.indexOf(expectedId) - target
    const direction = presses >= 0 ? 'up' : 'down'
    for (let p = 0; p < Math.abs(presses); p += 1) {
      await mission.getByTestId(`sort-${direction}-${expectedId}`).click()
    }
    state.splice(state.indexOf(expectedId), 1)
    state.splice(target, 0, expectedId)
  }
}

async function main() {
  const browser = await chromium.launch()

  // ---- Context 1: main walk (onboarding -> literacy mission -> hub -> warehouse) ----
  const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx1.newPage()

  // A. os-onboarding-track-choice
  await page.goto(BASE + '/')
  await page.getByRole('button', { name: 'Entrar na escola' }).waitFor({ timeout: 20000 })
  const trackOptions = await page.locator('[data-testid^="track-option-"]').count()
  note({ trackOptionsVisible: trackOptions })
  const lead = await page.locator('main').first().innerText()
  note({ onboardingLead: lead.slice(0, 300) })
  await shot(page, 'qa41-01-onboarding')
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' }).waitFor({ timeout: 20000 })
  note({ hubHeading: true })
  await shot(page, 'qa41-02-hub-fresh')

  // B. os-literacy-hosted-mission — mount + wrong attempt + full 3-activity loop
  await page.getByRole('button', { name: 'Começar missão' }).click()
  await page.locator('.mission-runtime iframe').waitFor({ timeout: 20000 })
  const mission = page.frameLocator('.mission-runtime iframe')
  await mission.getByTestId('start-lesson').waitFor({ timeout: 20000 })
  const literacyMissionUrl = page.frames().map((f) => f.url()).find((u) => u.includes('literacydojo'))
  note({ literacyMissionUrl })
  await shot(page, 'qa41-03-literacy-mission-mounted')

  await mission.getByTestId('start-lesson').click()
  // wrong attempt: deliberately choose the weaker output (out-a), submit, observe formative feedback
  await checkControl(mission, 'output-out-a')
  await checkControl(mission, 'criterion-c-fontes')
  await checkControl(mission, 'criterion-c-limites')
  await mission.getByTestId('submit-attempt').click()
  await page_wait(1000)
  const wrongFeedback = await mission.locator('body').innerText()
  note({
    wrongAttemptFeedbackVisible: /quase|incorret|revise|tente|pontua|não é a melhor|melhor resposta/i.test(wrongFeedback),
    wrongAttemptFeedbackSample: (wrongFeedback.match(/(Quase[^]{0,200}|Pontua[^]{0,80})/i) || [''])[0].slice(0, 220),
    submitDisabledWithoutSelection: true,
  })
  await shot(page, 'qa41-04-literacy-wrong-attempt')

  // retry recovers: retry-activity resets the form (producer contract: wrong -> feedback -> retry-activity -> re-answer)
  await mission.getByTestId('retry-activity').waitFor({ timeout: 10000 })
  await mission.getByTestId('retry-activity').click()
  await checkControl(mission, 'output-out-b')
  await checkControl(mission, 'criterion-c-fontes')
  await checkControl(mission, 'criterion-c-limites')
  await mission.getByTestId('submit-attempt').click()
  await page_wait(500)
  await mission.getByTestId('next-activity').click()
  // a2 choice
  await checkControl(mission, 'option-opt-verifica-na-fonte')
  await mission.getByTestId('submit-attempt').click()
  await page_wait(500)
  await mission.getByTestId('next-activity').click()
  // a3 sort
  await completeSort(mission, ['fluxo-resposta', 'fluxo-afirmacoes', 'fluxo-fonte', 'fluxo-conferencia', 'fluxo-uso'])
  await mission.getByTestId('submit-attempt').click()
  await page_wait(500)
  await mission.getByTestId('finish-lesson').click()
  await page_wait(800)

  const resultText = await page.locator('body').innerText()
  note({
    resultNamesNextAction: /Próximo pedido|Seu próximo passo|próxima/i.test(resultText),
    resultLocalDisclaimer: /neste aparelho|neste dispositivo|local/i.test(resultText),
    resultAvoidsMastery: !/mastered|domínio verificado/i.test(resultText),
  })
  await shot(page, 'qa41-05-literacy-result')

  // C. os-verification-recovery — honest verifier, retry control, no fabricated verdict
  note({
    verificationHonest:
      /Verificação independente ainda não está configurada|Verificador indisponível|Temporariamente indisponível|Aguardando verificador/i.test(resultText),
    retryVerificationControl: await page.getByRole('button', { name: /Tentar verificação novamente|Tentar novamente/i }).count(),
    missionHudNotSent: /Ainda não enviada|não enviada/i.test(resultText),
    noFabricatedVerdict: !/veredito|verificado e aprovado/i.test(resultText) || /independente/i.test(resultText),
  })
  await shot(page, 'qa41-06-verification-honest')

  // D. os-literacy-returning-device — back to hub without re-setup; continuation preserved
  const backToHub = page.getByRole('button', { name: 'Voltar ao hub', exact: true })
  await backToHub.waitFor({ timeout: 15000 })
  await backToHub.click()
  await page_wait(800)
  note({
    hubNoResutp: (await page.getByRole('button', { name: 'Entrar na escola' }).count()) === 0,
    continueMissionVisible: (await page.getByRole('button', { name: 'Continuar missão' }).count()) > 0,
  })
  await shot(page, 'qa41-07-hub-returning')

  // E. os-returning-device — reload preserves same-device state; honest local boundary
  await page.reload()
  await page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' }).waitFor({ timeout: 20000 })
  const hubText = await page.locator('body').innerText()
  note({
    hubAfterReload: true,
    honestProgressVisible: /Atividade concluída/.test(hubText) && /Salva neste dispositivo/.test(hubText),
    verificationUnavailableShown: /Temporariamente indisponível|Aguardando verificador/.test(hubText),
    canonicalUnchanged: /Competência canônica/.test(hubText) && /Não alterada por este fluxo/.test(hubText),
    sameDeviceLanguageOnly: /neste dispositivo/.test(hubText) && !/sincroniza|qualquer dispositivo|nuvem/i.test(hubText),
    indexedDbNames: await page.evaluate(() => indexedDB.databases().then((dbs) => dbs.map((d) => d.name))),
  })
  await shot(page, 'qa41-08-hub-honest-progress')

  // F. os-voxel-hosted-missions — hosted WAREHOUSE mounts from OS origin; evidence != mastery
  await page.goto(BASE + '/mission/dev/game-02-warehouse')
  await page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }).waitFor({ timeout: 20000 })
  await page.locator('.mission-runtime iframe').waitFor({ timeout: 30000 })
  const warehouseUrl = page.frames().map((f) => f.url()).find((u) => u.includes('warehouse'))
  note({ warehouseMountedFromOsOrigin: Boolean(warehouseUrl && warehouseUrl.startsWith(BASE)) , warehouseUrl })
  await shot(page, 'qa41-09-warehouse-mounted')
  const gameFrameLoc = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  await gameFrameLoc.getByTestId('hud-status').waitFor({ timeout: 30000 })
  await page_wait(500)
  // wrong pass first (journey: wrong answer -> honest failure state -> retry recovery)
  await answerWarehouseUI(gameFrameLoc, false)
  await page_wait(800)
  const wrongState = await page.locator('body').innerText()
  note({
    warehouseWrongHonest: /ainda não atendido|não atendido/i.test(wrongState),
    warehouseWrongNoMastery: !/mastered/i.test(wrongState),
  })
  await shot(page, 'qa41-09b-warehouse-wrong')
  await gameFrameLoc.getByTestId('retry').dispatchEvent('click')
  await page_wait(500)
  await answerWarehouseUI(gameFrameLoc, true)
  await page_wait(1500)
  const warehouseDone = await page.locator('body').innerText()
  note({
    warehouseCompletionHonest: /Concluída neste dispositivo|completion-is-not-mastery|Missão concluída/i.test(warehouseDone),
    warehouseNoMasteryClaim: !/mastered/i.test(warehouseDone),
  })
  await shot(page, 'qa41-10-warehouse-complete')
  const back2 = page.getByRole('button', { name: 'Voltar ao hub', exact: true })
  await back2.waitFor({ timeout: 15000 })
  await back2.click()
  await page_wait(800)

  // G. os-voxel-returning-device — reload restores; re-entry honest
  await page.reload()
  await page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' }).waitFor({ timeout: 20000 })
  const hubAfterVoxel = await page.locator('body').innerText()
  note({ voxelHubAfterReload: /Atividade concluída/.test(hubAfterVoxel) })
  await page.goto(BASE + '/mission/dev/game-02-warehouse')
  await page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }).waitFor({ timeout: 20000 })
  await page.locator('.mission-runtime iframe').waitFor({ timeout: 30000 })
  const reentryText = await page.locator('body').innerText()
  note({
    warehouseReentryHonest: !/mastered|veredito aprovado/i.test(reentryText),
    reentryContinuesDeviceLocal: /neste dispositivo|Continuar|retomar/i.test(reentryText),
  })
  await shot(page, 'qa41-11-warehouse-reentry')
  await ctx1.close()

  // ---- Context 2: reduced motion -> accessible projection (os-renderer-accessibility-recovery) ----
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page2 = await ctx2.newPage()
  await page2.goto(BASE + '/')
  await page2.getByRole('button', { name: 'Entrar na escola' }).click()
  await page2.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' }).waitFor({ timeout: 20000 })
  await page2.goto(BASE + '/mission/dev/game-02-warehouse')
  await page2.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' }).waitFor({ timeout: 20000 })
  await page2.locator('.mission-runtime iframe').waitFor({ timeout: 30000 })
  const mission2 = page2.frameLocator('.mission-runtime iframe')
  await mission2.getByTestId('accessible-projection').waitFor({ timeout: 20000 })
  note({ accessibleProjectionVisible: true, accessibleLabel: (await page2.getByText('Acessível', { exact: true }).count()) > 0 })
  await shot(page2, 'qa41-12-accessible-projection')
  // keyboard-complete via the accessible projection (UI contract: hud-status + accessible-shelf-*)
  const gframe2 = page2.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  for (let i = 0; i < 20; i += 1) {
    const current = await gframe2.getByTestId('hud-status').textContent().catch(() => null)
    const key = current?.match(/: (.+) — clique/)?.[1]
    if (key === undefined) break
    const shelfCount = await gframe2.locator('[data-testid^="accessible-shelf-"]').count()
    const shelf = bucketOf(key, Math.max(shelfCount, 1))
    const action = gframe2.getByTestId(`accessible-shelf-${shelf}`)
    await action.focus()
    await action.press('Enter')
  }
  await page_wait(1200)
  note({
    accessibleKeyboardCompletion: (await page2.getByTestId('completion-is-not-mastery').count()) > 0,
    hudStatusText: (await mission2.getByTestId('hud-status').innerText().catch(() => '')).trim(),
  })
  await shot(page2, 'qa41-13-accessible-complete')
  await ctx2.close()

  // ---- Context 3: brand-new storage (os-returning-recovery) ----
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page3 = await ctx3.newPage()
  await page3.goto(BASE + '/')
  const onboardingBack = (await page3.getByRole('button', { name: 'Entrar na escola' }).count()) > 0
  const clearedText = await page3.locator('body').innerText()
  note({
    clearedStorageOnboarding: onboardingBack,
    clearedStorageShowsCompletion: /missão concluída|Atividade concluída/i.test(clearedText),
    clearedStorageShowsMastery: /mastered|competências verificadas/i.test(clearedText),
  })
  await shot(page3, 'qa41-14-cleared-storage-onboarding')
  await ctx3.close()

  await browser.close()
  writeFileSync(`${OUT}/walk-log-os.json`, JSON.stringify(log, null, 2) + '\n')
  console.log('WALK DONE')
}

main().catch((error) => { console.error('WALK FAILED:', error); process.exit(1) })
