// AID-5006: the dev-family practices pg-d02..pg-d04 must be playable end to
// end in the standalone player with full accessibility: keyboard-only
// navigation (focus + Enter/Space through the whole graded cycle), ARIA
// state (aria-pressed chooser, aria-current phase rail, role=alert switch
// gate) and zero collision at 320×568 now that the chooser carries five
// entries. Geometry probes mirror the AID-3849 capture-log check. The
// viewport is forced inside the test, so it runs once regardless of project.
import { expect, test } from '@playwright/test'

const SHOTS = 'qa/aid5006'

async function openPracticeApp(page: import('@playwright/test').Page) {
  await page.goto('/desktop')
  await page.getByRole('button', { name: /Atividades/ }).click()
  const launcher = page.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await expect(launcher).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar aplicativos ou fundamentos' }).fill('Prática')
  await launcher.getByRole('button', { name: /Prática Guiada/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('navigation', { name: 'Escolha da prática guiada' })).toBeVisible()
}

async function assertNoHorizontalCollision(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
    innerWidth: window.innerWidth,
  }))
  expect(
    overflow.scrollWidth,
    `scrollWidth ${overflow.scrollWidth} must fit ${overflow.innerWidth}px`,
  ).toBeLessThanOrEqual(overflow.innerWidth)
}

test('pg-d02 is keyboard-playable end to end at 320×568 with zero collision', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-375', 'viewport forçado 320×568 — executa 1×')
  test.setTimeout(240_000)
  await openPracticeApp(page)
  await page.setViewportSize({ width: 320, height: 568 })

  // Five-entry chooser: the last choice keeps a real pointer hit target and
  // nothing overflows the 320px viewport (AID-3849 regression guard, now
  // with the larger dev-family chooser).
  const lastChoice = page.getByRole('button', { name: /pg-c01 ·/i })
  await lastChoice.scrollIntoViewIfNeeded()
  const hit = await lastChoice.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
    return target !== null && (target === el || el.contains(target))
  })
  expect(hit, 'the pg-c01 chooser button keeps its hit target at 320×568').toBe(true)
  await assertNoHorizontalCollision(page)

  // Keyboard-only content choice (focus + Enter, no pointer).
  const d02 = page.getByRole('button', { name: /pg-d02 ·/i })
  await d02.focus()
  await expect(d02).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: /pedido estruturado de 5 campos/i })).toBeVisible()
  await expect(d02).toHaveAttribute('aria-pressed', 'true')

  // Exemplo → tentativa: CTA via keyboard; focus lands on the new phase
  // heading (AID-3564 F1); the phase rail announces the current step.
  const exemploCta = page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i })
  await exemploCta.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /2\. Tentativa/i })).toBeFocused()
  await expect(page.locator('.practice-phase-rail li[aria-current="step"]')).toHaveText(/tentativa/)

  for (let step = 1; step <= 6; step += 1) {
    await page.getByLabel(`Evidência do passo ${step}`).fill(`$ cmd ${step}\nsaída real`)
  }
  await page.getByRole('button', { name: /concluir a tentativa/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /3\. Feedback pela rúbrica/i })).toBeFocused()
  await assertNoHorizontalCollision(page)

  // Rubric: radio verdicts via keyboard (focus + Space) on all 7 criteria.
  const criteria = await page.locator('.practice-rubric > li').all()
  expect(criteria.length).toBeGreaterThanOrEqual(7)
  for (const item of criteria) {
    const criterionId = await item.locator('details summary code').first().textContent()
    expect(criterionId !== null && criterionId.length > 0).toBe(true)
    const met = item.getByLabel('Atendido', { exact: true })
    await met.focus()
    await page.keyboard.press(' ')
    await expect(met).toBeChecked()
    await item.getByLabel(`Evidência do critério ${criterionId}`).fill('comando + saída citados')
  }

  await page.getByRole('button', { name: /ir para o takeaway/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: /5\. Takeaway/i })).toBeFocused()

  await page.getByLabel(/\(a\)/).fill('a decisão implícita mais perigosa era o breaking suprimido')
  await page.getByLabel(/\(b\)/).fill('a NÃO-META impediu a entrega dupla')
  await page.getByRole('button', { name: /concluir a prática/i }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/Recibo da prática guiada pg-d02/)).toBeVisible()
  await assertNoHorizontalCollision(page)

  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-pgd02-320-concluida.png`, fullPage: true })
})

test('pg-d03 and pg-d04 open from the chooser and announce the active step', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-375', 'viewport forçado 320×568 — executa 1×')
  test.setTimeout(240_000)
  await openPracticeApp(page)
  await page.setViewportSize({ width: 320, height: 568 })

  for (const [id, title] of [
    ['pg-d03', /refatoração com rede de segurança/i],
    ['pg-d04', /pacote de contexto \+ prd\/spec/i],
  ] as const) {
    await page.getByRole('button', { name: new RegExp(`${id} ·`, 'i') }).click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.locator('.practice-phase-rail li[aria-current="step"]')).toHaveText(/exemplo/)
    await assertNoHorizontalCollision(page)
    await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-${id}-320-exemplo.png`, fullPage: true })
  }

  // ARIA switch gate still announces before discarding an active attempt.
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  await page.getByLabel('Evidência do passo 1').fill('baseline verde registrado')
  await page.getByRole('button', { name: /pg-d02 ·/i }).click()
  const alert = page.getByRole('alert')
  await expect(alert).toContainText(/tentativa em curso em pg-d04/i)
  await assertNoHorizontalCollision(page)
  await alert.getByRole('button', { name: /cancelar e continuar pg-d04/i }).click()
  await expect(page.getByLabel('Evidência do passo 1')).toHaveValue(/baseline verde/i)
})
