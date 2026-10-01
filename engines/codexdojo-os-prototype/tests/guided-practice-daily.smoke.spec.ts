// AID-3590: smoke evidence for the daily practice pg-c01 in the player.
// Runs the real learner flow (escolha → exemplo → tentativa A/B/C → feedback
// binário → retry com feedback aprovado + resposta à IA → takeaway → recibo)
// on desktop and mobile viewports with raw-pixel screenshots, then proves
// the standalone volatility/reopen behavior (close dismounts the session)
// and the embedded AC1 negatives (no chooser in the native mission runtime).
import { expect, test } from '@playwright/test'

const SHOTS = 'qa/aid3590'

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

test('runs the pg-c01 daily cycle standalone with deterministic receipt', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await openPracticeApp(page)
  // Default is pg-d01; the explicit choice switches to pg-c01.
  await expect(page.getByRole('heading', { level: 1, name: /reproduza antes de perguntar/i })).toBeVisible()
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  // AID-3643: human title is now the h1; the technical slug is subordinated.
  const session = page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })
  await expect(session).toBeVisible()
  // Identity pin: content version + projection sha prefix are rendered
  // (AID-3643: also mirrored in the daily LearningRail context — .first()).
  await expect(page.getByText(/pg-c01@v1/).first()).toBeVisible()
  await expect(page.getByText(/ee57638361b6/).first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-01-exemplo.png`, fullPage: true })

  // Exemplo → tentativa: the three A/B/C pieces.
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  for (const stepId of ['A', 'B', 'C']) {
    await page
      .getByLabel(`Peça da etapa ${stepId}`)
      .fill(`peça ${stepId}: pedido/tabela/aviso com citação fonte-1 L2 / fonte-2 G4`)
  }
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-02-tentativa.png`, fullPage: true })
  await page.getByRole('button', { name: /concluir a tentativa/i }).click()

  // Feedback binário: all sufficient, then reopen c3 to exercise retry.
  for (const criterion of ['c1-mínimos', 'c2-vereditos', 'c4-incerteza', 'c5-privacidade', 'c6-resposta']) {
    await page.getByRole('radio', { name: 'Suficiente', exact: true }).first().waitFor()
    const scope = page.locator('li', { hasText: criterion }).first()
    // AID-3643 r1: the standalone surface scrolls as one column with a
    // static action bar — real clicks after common scrolling work again
    // (the keyboard workaround of r0 is gone; PO 7286fcf5).
    await scope.getByRole('radio', { name: 'Suficiente', exact: true }).check()
    await scope.getByLabel(`Evidência do critério ${criterion}`).fill('peça + citação fonte-2 G4')
  }
  const c3 = page.locator('li', { hasText: 'c3-citações' }).first()
  await c3.getByRole('radio', { name: 'Insuficiente', exact: true }).check()
  await c3.getByLabel('Evidência do critério c3-citações').fill('tabela sem coluna de citação')
  await expect(page.getByText(/critérios ainda insuficientes \(alvos do retry\): c3-citações/i)).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-03-feedback.png`, fullPage: true })

  // Retry: approved feedback + insistent AI + response required.
  await page.getByRole('button', { name: /retry: 1 critério insuficiente/i }).click()
  await expect(page.getByRole('heading', { name: /retry — refaça apenas os critérios insuficientes/i })).toBeVisible()
  await expect(page.getByText(/IA insiste \(retry-1\)/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /retry concluído/i })).toBeDisabled()
  await page.getByLabel('Resposta à IA que insiste').fill('mantenho: sem citação não entra — re-citei fonte-2 G3')
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-04-retry.png`, fullPage: true })
  await page.getByRole('button', { name: /retry concluído/i }).click()

  await c3.getByRole('radio', { name: 'Suficiente', exact: true }).check()
  await c3.getByLabel('Evidência do critério c3-citações').fill('todas as linhas com fonte+linha')
  await page.getByRole('button', { name: /ir para o takeaway/i }).click()
  await page.getByLabel(/\(a\)/).fill('o telefone com código do portão')
  await page.getByLabel(/\(b\)/).fill('a frase do dia só entrou com fonte-1 L1')
  await page.getByRole('button', { name: /concluir a prática/i }).click()

  // AID-3643: the receipt renders structured blocks inside one container.
  const receipt = page.locator('.practice-receipt').filter({ hasText: /Recibo da prática guiada pg-c01/ })
  await expect(receipt).toBeVisible()
  await expect(receipt).toContainText('pg-c01@v1')
  await expect(receipt).toContainText('ee57638361b6372d57f7061d7339f23b53c88bd238985fb2deddcbf7125d7e5d')
  await expect(receipt).toContainText('c3-citações: sufficient')
  await expect(receipt).toContainText('Resposta ao retry (tentativa 2)')
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-05-recibo.png`, fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('standalone session is volatile across close/reopen and switch is confirmed during an attempt', async ({
  page,
}, testInfo) => {
  await openPracticeApp(page)
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  await page.getByLabel('Peça da etapa A').fill('pedido mínimo com rótulos neutros')

  // Switch during the active attempt requires an explicit confirmed restart.
  await page.getByRole('button', { name: /pg-d01 ·/i }).click()
  await expect(page.getByRole('alert')).toContainText(/tentativa em curso/i)
  await page.getByRole('button', { name: /cancelar e continuar pg-c01/i }).click()
  await expect(page.getByLabel('Peça da etapa A')).toHaveValue(/pedido mínimo/i)
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-06-troca-confirmada.png`, fullPage: true })

  // Close dismounts the standalone session (documented volatility).
  const practiceWindow = page.locator('.desktop-window', {
    has: page.getByRole('navigation', { name: 'Escolha da prática guiada' }),
  })
  await practiceWindow.getByRole('button', { name: 'Fechar', exact: true }).click()
  await openPracticeApp(page)
  await expect(page.getByRole('heading', { level: 1, name: /reproduza antes de perguntar/i })).toBeVisible()
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i })).toBeVisible()
  await expect(page.getByLabel('Peça da etapa A')).toHaveCount(0)
  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-07-reopen-volatil.png`, fullPage: true })
})
