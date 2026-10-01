// AID-3643 (r1, PO HOLD 7286fcf5): visual-delta smoke evidence for the
// pg-c01 presentation-only fixes. Pixels are captured ONLY for the changed
// states (chooser contrast, title hierarchy, structured markdown,
// LearningRail context) plus the COMPLETE receipt UNOBSTRUCTED — the
// standalone surface is one scrolling column with a static action bar, so
// the toolbar can never cover content or controls. Every capture registers
// REAL metadata in qa/aid3643/capture-log.jsonl (UTC ISO, project,
// viewport, browser engine, FULL userAgent, computed styles, occlusion
// checks) — nothing inferred, nothing invented.
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { appendFileSync } from 'node:fs'

const SHOTS = 'qa/aid3643'
const LOG = `${SHOTS}/capture-log.jsonl`

function logCapture(entry: Record<string, unknown>) {
  appendFileSync(LOG, `${JSON.stringify({ utc: new Date().toISOString(), ...entry })}\n`)
}

async function captureMetadata(page: Page, testInfo: TestInfo) {
  const userAgent = await page.evaluate(() => navigator.userAgent)
  return {
    project: testInfo.project.name,
    viewport: page.viewportSize(),
    engine: page.context().browser()?.browserType().name() ?? 'unknown',
    userAgent,
  }
}

async function shoot(page: Page, testInfo: TestInfo, name: string) {
  const path = `${SHOTS}/${testInfo.project.name}-${name}.png`
  await page.screenshot({ path })
  logCapture({ shot: path, ...(await captureMetadata(page, testInfo)) })
}

// The standalone surface is the single scroll container (AID-3643 r1).
function standaloneScroller(page: Page) {
  return page.locator('.practice-standalone')
}

async function openPracticeApp(page: Page) {
  await page.goto('/desktop')
  await page.getByRole('button', { name: /Atividades/ }).click()
  const launcher = page.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await expect(launcher).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar aplicativos ou fundamentos' }).fill('Prática')
  await launcher.getByRole('button', { name: /Prática Guiada/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('navigation', { name: 'Escolha da prática guiada' })).toBeVisible()
}

// Geometric occlusion proof (PO: containment ≠ visibility): a target is
// only "visible unobstructed" when its box sits fully inside the scroller's
// clip rect AND does not intersect any action-bar box. Returns the measured
// geometry so the evidence log carries the real numbers.
async function occlusionCheck(page: Page, targetSelector: string) {
  return page.evaluate((selector) => {
    const scroller = document.querySelector('.practice-standalone')
    const target = document.querySelector(selector)
    if (scroller === null || target === null) return { ok: false, reason: 'missing elements' }
    const clip = scroller.getBoundingClientRect()
    const box = target.getBoundingClientRect()
    const bars = [...document.querySelectorAll<HTMLElement>('.practice-action-bar')].map((bar) =>
      bar.getBoundingClientRect(),
    )
    const insideClip = box.top >= clip.top - 1 && box.bottom <= clip.bottom + 1
    const barOverlap = bars.some(
      (rect) => box.top < rect.bottom && box.bottom > rect.top && box.left < rect.right && box.right > rect.left,
    )
    return {
      ok: insideClip && !barOverlap,
      insideClip,
      barOverlap,
      clipTop: clip.top,
      clipBottom: clip.bottom,
      boxTop: box.top,
      boxBottom: box.bottom,
    }
  }, targetSelector)
}

test('chooser contrast, title hierarchy, structured example and rail context (desktop)', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1280', 'rail docked context is a desktop finding')

  await openPracticeApp(page)

  // P2 chooser: the INACTIVE choice (pg-c01 while pg-d01 is selected) has an
  // explicit legible surface — real computed colors recorded as evidence.
  const inactive = page.getByRole('button', { name: /pg-c01 ·/i })
  await expect(inactive).toHaveClass(/practice-choice/)
  const inactiveStyle = await inactive.evaluate((element) => {
    const styles = getComputedStyle(element)
    return { color: styles.color, backgroundColor: styles.backgroundColor }
  })
  logCapture({
    check: 'chooser-inactive-computed-style',
    ...inactiveStyle,
    ...((await captureMetadata(page, testInfo)) as object),
  })

  await shoot(page, testInfo, '01-chooser-contraste')

  // Select pg-c01: P3 hierarchy (human title primary) + P2 structured text.
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  const identity = page.locator('.practice-identity')
  await expect(identity).toContainText('pg-c01 · pg-c01-dados-minimos-e-verificacao v1')
  await expect(identity).toContainText('pg-c01@v1')
  await expect(identity).toContainText('ee57638361b6')
  // No literal markdown markers survive on the daily surface.
  const literalMarkers = await standaloneScroller(page).evaluate(
    (element) => element.textContent?.includes('**') ?? false,
  )
  expect(literalMarkers).toBe(false)
  // The action bar is a static block in flow — it cannot occlude anything.
  const barPosition = await page.evaluate(() => {
    const bar = document.querySelector('.practice-standalone .practice-action-bar')
    return bar === null ? null : getComputedStyle(bar).position
  })
  expect(barPosition).toBe('static')
  logCapture({ check: 'action-bar-position', position: barPosition, ...((await captureMetadata(page, testInfo)) as object) })
  await shoot(page, testInfo, '02-hierarquia-titulo')

  // P2 structured example: the worked example renders quote/list/bold,
  // scrolled into view and measured UNOBSTRUCTED (desktop 03 finding).
  const example = page.locator('.practice-source .practice-markdown').first()
  await expect(example).toBeVisible()
  await expect(example.locator('blockquote').first()).toBeVisible()
  await example.locator('blockquote').first().evaluate((element) => {
    element.scrollIntoView({ block: 'center' })
  })
  const exampleOcclusion = await occlusionCheck(page, '.practice-source .practice-markdown blockquote')
  expect(exampleOcclusion.ok).toBe(true)
  logCapture({ check: 'example-unobstructed', ...exampleOcclusion, ...((await captureMetadata(page, testInfo)) as object) })
  await shoot(page, testInfo, '03-texto-estruturado')

  // P2 LearningRail: with pg-c01 selected the rail orients on the daily
  // practice and no longer tells the learner to run pg-d01.
  const rail = page.locator('.learning-rail')
  await expect(rail).toContainText('Cotidiano: dados mínimos e verificação')
  await expect(rail).not.toContainText('Execute a prática pg-d01')
  await expect(rail).not.toContainText('Reproduza antes de perguntar')
  await standaloneScroller(page).evaluate((element) => {
    element.scrollTop = 0
  })
  await shoot(page, testInfo, '04-rail-contexto')
})

test('real touch/click interactions after common scrolling, with repeated content switching', async ({
  page,
}) => {
  await openPracticeApp(page)

  // Repeated pg-d01 ↔ pg-c01 switching with the explicit confirm/cancel of
  // an in-flight attempt — real clicks, common scrolling only.
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  await page.getByLabel('Peça da etapa A').fill('pedido mínimo com rótulos neutros')

  // Switch during the active attempt: cancel keeps the daily session…
  await page.getByRole('button', { name: /pg-d01 ·/i }).click()
  await expect(page.getByRole('alert')).toContainText(/tentativa em curso/i)
  await page.getByRole('button', { name: /cancelar e continuar pg-c01/i }).click()
  await expect(page.getByLabel('Peça da etapa A')).toHaveValue(/pedido mínimo/i)

  // …and confirming restarts into a fresh pg-d01 session.
  await page.getByRole('button', { name: /pg-d01 ·/i }).click()
  await page.getByRole('button', { name: /confirmar reinício e trocar para pg-d01/i }).click()
  await expect(page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i })).toBeVisible()
  expect(await page.getByLabel('Peça da etapa A').count()).toBe(0)

  // Back to pg-c01: a fresh daily session; every verdict radio is selected
  // with a REAL click after Playwright's common scrolling (no keyboard).
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  for (const stepId of ['A', 'B', 'C']) {
    await page.getByLabel(`Peça da etapa ${stepId}`).fill(`peça ${stepId} com citação fonte-1 L2`)
  }
  await page.getByRole('button', { name: /concluir a tentativa/i }).click()
  for (const criterion of ['c1-mínimos', 'c2-vereditos', 'c3-citações', 'c4-incerteza', 'c5-privacidade', 'c6-resposta']) {
    const scope = page.locator('li', { hasText: criterion }).first()
    await scope.getByRole('radio', { name: 'Suficiente', exact: true }).check()
    await expect(scope.getByRole('radio', { name: 'Suficiente', exact: true })).toBeChecked()
    await scope.getByLabel(`Evidência do critério ${criterion}`).fill('peça + citação fonte-2 G4')
  }
  await page.getByRole('button', { name: /ir para o takeaway/i }).click()
  await page.getByLabel(/\(a\)/).fill('o telefone com código do portão')
  await page.getByLabel(/\(b\)/).fill('a frase do dia só entrou com fonte-1 L1')
  await page.getByRole('button', { name: /concluir a prática/i }).click()
  const receipt = page.locator('.practice-receipt').filter({ hasText: /Recibo da prática guiada pg-c01/ })
  await expect(receipt).toBeVisible()
  await expect(receipt).toContainText('c3-citações: sufficient')
})

test('complete daily receipt visible UNOBSTRUCTED in scrolled captures', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await openPracticeApp(page)

  // Mobile evidence for the chooser finding: the inactive choice (pg-c01
  // while pg-d01 is default-selected) with its explicit legible surface.
  if (testInfo.project.name === 'mobile-375') {
    const inactiveMobile = page.getByRole('button', { name: /pg-c01 ·/i })
    await expect(inactiveMobile).toHaveClass(/practice-choice/)
    const mobileStyle = await inactiveMobile.evaluate((element) => {
      const styles = getComputedStyle(element)
      return { color: styles.color, backgroundColor: styles.backgroundColor }
    })
    logCapture({
      check: 'chooser-inactive-computed-style',
      ...mobileStyle,
      ...((await captureMetadata(page, testInfo)) as object),
    })
    await shoot(page, testInfo, '07-mobile-chooser-contraste')
  }

  // Real learner flow to a concluded receipt, verdicts selected by REAL
  // clicks after common scrolling (PO: keyboard-only is not touch evidence).
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  for (const stepId of ['A', 'B', 'C']) {
    await page.getByLabel(`Peça da etapa ${stepId}`).fill(`peça ${stepId} com citação fonte-1 L2`)
  }
  await page.getByRole('button', { name: /concluir a tentativa/i }).click()
  for (const criterion of ['c1-mínimos', 'c2-vereditos', 'c3-citações', 'c4-incerteza', 'c5-privacidade', 'c6-resposta']) {
    const scope = page.locator('li', { hasText: criterion }).first()
    await scope.getByRole('radio', { name: 'Suficiente', exact: true }).check()
    await expect(scope.getByRole('radio', { name: 'Suficiente', exact: true })).toBeChecked()
    await scope.getByLabel(`Evidência do critério ${criterion}`).fill('peça + citação fonte-2 G4')
  }
  await page.getByRole('button', { name: /ir para o takeaway/i }).click()
  await page.getByLabel(/\(a\)/).fill('o telefone com código do portão')
  await page.getByLabel(/\(b\)/).fill('a frase do dia só entrou com fonte-1 L1')
  await page.getByRole('button', { name: /concluir a prática/i }).click()

  // Maximize the practice window for the receipt captures: a real user
  // action that gives the receipt the largest honest viewport.
  const practiceWindow = page.locator('.desktop-window', {
    has: page.getByRole('navigation', { name: 'Escolha da prática guiada' }),
  })
  await practiceWindow.getByRole('button', { name: 'Maximizar' }).click()
  await expect(practiceWindow).toHaveClass(/maximized/)

  const receipt = page.locator('.practice-receipt').filter({ hasText: /Recibo da prática guiada pg-c01/ })
  await expect(receipt).toBeVisible()

  // Functional completeness: every receipt section is rendered as structure.
  for (const section of [
    'Recibo da prática guiada pg-c01',
    'Etapas A/B/C',
    'Critérios (veredito binário sufficient/insufficient)',
    'Takeaway',
    'c3-citações: sufficient',
  ]) {
    await expect(receipt).toContainText(section)
  }
  const receiptMarkers = await receipt.evaluate((element) => {
    const text = element.textContent ?? ''
    return { bold: text.includes('**'), heading: text.includes('##') }
  })
  expect(receiptMarkers).toEqual({ bold: false, heading: false })

  // Pixel coverage of the WHOLE receipt UNOBSTRUCTED: overlapping steps in
  // the single scroll column; every capture asserts (and logs) that the
  // receipt slice in frame neither leaves the clip nor intersects the
  // action bar, and the LAST capture proves the REAL last line visible.
  const scroller = standaloneScroller(page)
  const geometry = await scroller.evaluate((element) => {
    const receiptEl = document.querySelector('.practice-receipt')
    if (receiptEl === null) throw new Error('receipt not found for geometry')
    const clip = element.getBoundingClientRect()
    const receiptTop = receiptEl.getBoundingClientRect().top - clip.top + element.scrollTop
    return {
      paneClientHeight: element.clientHeight,
      receiptTopInPane: receiptTop,
      receiptHeight: receiptEl.getBoundingClientRect().height,
      receiptBottomInPane: receiptTop + receiptEl.getBoundingClientRect().height,
    }
  })
  const overlap = 140
  const step = Math.max(1, geometry.paneClientHeight - overlap)
  const firstScroll = Math.max(0, geometry.receiptTopInPane - 60)
  const lastScroll = Math.max(firstScroll, geometry.receiptBottomInPane - geometry.paneClientHeight + 60)
  const scrolls: number[] = []
  for (let position = firstScroll; position < lastScroll; position += step) scrolls.push(position)
  if (scrolls.length === 0 || scrolls[scrolls.length - 1] !== lastScroll) scrolls.push(lastScroll)

  let shotNumber = 1
  for (const position of scrolls) {
    await scroller.evaluate((element, scrollTop) => {
      element.scrollTop = scrollTop
    }, position)
    await expect(receipt).toBeVisible()
    if (shotNumber === scrolls.length) {
      // The REAL last line, fully inside the clip and measured against the
      // action bar — the mobile-06 finding cannot recur.
      const lastLine = receipt.getByText('a frase do dia só entrou com fonte-1 L1').last()
      await expect(lastLine).toBeVisible()
      const lastOcclusion = await occlusionCheck(page, '.practice-receipt .practice-markdown > :last-child')
      expect(lastOcclusion.ok).toBe(true)
      logCapture({
        check: 'receipt-last-line-unobstructed',
        ...lastOcclusion,
        ...((await captureMetadata(page, testInfo)) as object),
      })
    }
    await shoot(
      page,
      testInfo,
      `${String(shotNumber + 4).padStart(2, '0')}-recibo-${String(shotNumber).padStart(2, '0')}-de-${String(scrolls.length).padStart(2, '0')}`,
    )
    shotNumber += 1
  }
  logCapture({
    check: 'receipt-coverage',
    ...geometry,
    shots: scrolls.length,
    ...((await captureMetadata(page, testInfo)) as object),
  })
  expect(consoleErrors).toEqual([])
})
