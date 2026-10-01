// AID-3643: visual-delta smoke evidence for the pg-c01 presentation-only
// fixes. Pixels are captured ONLY for the changed states (chooser contrast,
// title hierarchy, structured markdown, LearningRail context) plus the
// COMPLETE receipt visible — closing the capture-05 gap from AID-3590
// (the standalone session pane now scrolls inside the OS window instead of
// being clipped). Every capture is registered in qa/aid3643/capture-log.jsonl
// (UTC ISO, project, viewport, browser engine, computed styles where
// relevant) so the capture manifest carries real metadata, not inferred ones.
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { appendFileSync } from 'node:fs'

const SHOTS = 'qa/aid3643'
const LOG = `${SHOTS}/capture-log.jsonl`

function logCapture(entry: Record<string, unknown>) {
  appendFileSync(LOG, `${JSON.stringify({ utc: new Date().toISOString(), ...entry })}\n`)
}

async function captureMetadata(page: Page, testInfo: TestInfo) {
  return {
    project: testInfo.project.name,
    viewport: page.viewportSize(),
    engine: page.context().browser()?.browserType().name() ?? 'unknown',
  }
}

async function shoot(page: Page, testInfo: TestInfo, name: string) {
  const path = `${SHOTS}/${testInfo.project.name}-${name}.png`
  await page.screenshot({ path })
  logCapture({ shot: path, ...(await captureMetadata(page, testInfo)) })
}

// The standalone session pane (the scrollable surface inside the OS window).
function sessionPane(page: Page) {
  return page.locator('.practice-standalone div.practice-app')
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

async function runDailyCycleToReceipt(page: Page) {
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  for (const stepId of ['A', 'B', 'C']) {
    await page.getByLabel(`Peça da etapa ${stepId}`).fill(`peça ${stepId} com citação fonte-1 L2`)
  }
  await page.getByRole('button', { name: /concluir a tentativa/i }).click()
  for (const criterion of ['c1-mínimos', 'c2-vereditos', 'c3-citações', 'c4-incerteza', 'c5-privacidade', 'c6-resposta']) {
    const scope = page.locator('li', { hasText: criterion }).first()
    // Position the criterion below the sticky action bar inside the session
    // pane (on small panes it overlays the pane's top edge), then select the
    // verdict via keyboard (focus + Space) — real interaction that cannot be
    // intercepted by the sticky overlay.
    await scope.evaluate((element) => {
      const pane = element.closest('.practice-app')
      if (pane === null) return
      pane.scrollTop += element.getBoundingClientRect().top - pane.getBoundingClientRect().top - 84
    })
    await scope.getByRole('radio', { name: 'Suficiente', exact: true }).focus()
    await page.keyboard.press('Space')
    await expect(scope.getByRole('radio', { name: 'Suficiente', exact: true })).toBeChecked()
    await scope.getByLabel(`Evidência do critério ${criterion}`).fill('peça + citação fonte-2 G4')
  }
  await page.getByRole('button', { name: /ir para o takeaway/i }).click()
  await page.getByLabel(/\(a\)/).fill('o telefone com código do portão')
  await page.getByLabel(/\(b\)/).fill('a frase do dia só entrou com fonte-1 L1')
  await page.getByRole('button', { name: /concluir a prática/i }).click()
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
  logCapture({ check: 'chooser-inactive-computed-style', ...inactiveStyle, ...((await captureMetadata(page, testInfo)) as object) })

  await shoot(page, testInfo, '01-chooser-contraste')

  // Select pg-c01: P3 hierarchy (human title primary) + P2 structured text.
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  const identity = page.locator('.practice-identity')
  await expect(identity).toContainText('pg-c01 · pg-c01-dados-minimos-e-verificacao v1')
  await expect(identity).toContainText('pg-c01@v1')
  await expect(identity).toContainText('ee57638361b6')
  // No literal markdown markers survive on the daily surface.
  const literalMarkers = await sessionPane(page)
    .evaluate((element) => element.textContent?.includes('**') ?? false)
  expect(literalMarkers).toBe(false)
  await shoot(page, testInfo, '02-hierarquia-titulo')

  // P2 structured example: the worked example renders quote/list/bold; the
  // session pane scrolls the example into full view.
  const example = page.locator('.practice-source .practice-markdown').first()
  await expect(example).toBeVisible()
  await expect(example.locator('blockquote').first()).toBeVisible()
  await example.locator('blockquote').first().evaluate((element) => {
    element.scrollIntoView({ block: 'start' })
  })
  await shoot(page, testInfo, '03-texto-estruturado')

  // P2 LearningRail: with pg-c01 selected the rail orients on the daily
  // practice and no longer tells the learner to run pg-d01. Captured at the
  // top of the practice content so the shot shows the rail beside the new
  // header hierarchy (distinct from the scrolled example shot above).
  const rail = page.locator('.learning-rail')
  await expect(rail).toContainText('Cotidiano: dados mínimos e verificação')
  await expect(rail).not.toContainText('Execute a prática pg-d01')
  await expect(rail).not.toContainText('Reproduza antes de perguntar')
  await sessionPane(page).evaluate((element) => {
    element.scrollTop = 0
  })
  await shoot(page, testInfo, '04-rail-contexto')
})

test('complete daily receipt visible in scrolled captures', async ({ page }, testInfo) => {
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
    logCapture({ check: 'chooser-inactive-computed-style', ...mobileStyle, ...((await captureMetadata(page, testInfo)) as object) })
    await shoot(page, testInfo, '07-mobile-chooser-contraste')
  }

  await runDailyCycleToReceipt(page)

  // Maximize the practice window for the receipt captures: a real user
  // action that gives the receipt the largest honest viewport, keeping the
  // number of overlapping captures small on narrow panes.
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

  // Pixel coverage of the WHOLE receipt inside the session pane, with
  // overlapping steps so consecutive shots always overlap and the union
  // provably covers the receipt from top to bottom. Desktop carries the
  // full stitched series; on mobile the pane is too narrow for a sane
  // series, so it registers top + end shots (declared partial in the
  // capture manifest — the complete-receipt evidence is the desktop series).
  const pane = sessionPane(page)
  const geometry = await pane.evaluate((element) => {
    const receiptEl = document.querySelector('.practice-receipt')
    if (receiptEl === null) throw new Error('receipt not found for geometry')
    const paneRect = element.getBoundingClientRect()
    const receiptTop = receiptEl.getBoundingClientRect().top - paneRect.top + element.scrollTop
    return {
      paneClientHeight: element.clientHeight,
      receiptTopInPane: receiptTop,
      receiptHeight: receiptEl.getBoundingClientRect().height,
      receiptBottomInPane: receiptTop + receiptEl.getBoundingClientRect().height,
    }
  })
  const overlap = 120
  const step = Math.max(1, geometry.paneClientHeight - overlap)
  const firstScroll = Math.max(0, geometry.receiptTopInPane - 40)
  const lastScroll = Math.max(firstScroll, geometry.receiptBottomInPane - geometry.paneClientHeight + 40)
  const scrolls: number[] = []
  if (testInfo.project.name === 'desktop-1280') {
    for (let position = firstScroll; position < lastScroll; position += step) scrolls.push(position)
    if (scrolls.length === 0 || scrolls[scrolls.length - 1] !== lastScroll) scrolls.push(lastScroll)
  } else {
    scrolls.push(firstScroll, lastScroll)
  }

  let shotNumber = 1
  for (const position of scrolls) {
    await pane.evaluate((element, scrollTop) => {
      element.scrollTop = scrollTop
    }, position)
    await expect(receipt).toBeVisible()
    if (shotNumber === scrolls.length) {
      // The last capture must show the very end of the receipt, fully inside
      // the pane (clip) rect — the AID-3590 capture-05 gap closed.
      // The receipt's END must be fully inside the pane (its top is covered
      // by the previous shot: consecutive steps overlap by construction).
      const endVisible = await pane.evaluate((element) => {
        const receiptEl = document.querySelector('.practice-receipt')
        const lastChild = receiptEl?.querySelector('.practice-markdown')?.lastElementChild ?? null
        if (receiptEl === null || lastChild === null) return null
        return { lastBottom: lastChild.getBoundingClientRect().bottom, paneBottom: element.getBoundingClientRect().bottom }
      })
      expect(endVisible).not.toBeNull()
      expect((endVisible as { lastBottom: number; paneBottom: number }).lastBottom).toBeLessThanOrEqual(
        (endVisible as { lastBottom: number; paneBottom: number }).paneBottom + 1,
      )
      await expect(receipt.getByText('a frase do dia só entrou com fonte-1 L1').last()).toBeVisible()
    }
    await shoot(page, testInfo, `${String(shotNumber + 4).padStart(2, '0')}-recibo-${String(shotNumber).padStart(2, '0')}-de-${String(scrolls.length).padStart(2, '0')}`)
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
