// AID-3849 (DEFECT-1 from QA-ROUND L23/AID-3697, P1 in the 320×568 viewport):
// the standalone chooser nav kept the base `height: 100%` of `.practice-app`,
// so at 320×568 its content overflowed the nav box and slid UNDER the session
// div (later sibling wins the paint order). The switch-confirm alert inside
// the nav lost its pointer hit target — `elementFromPoint` at the Cancel
// button center returned the session h1, and a real tap could never land.
// Fixed in src/styles/practice.css (nav sizes to content like the session
// div already does). This spec is the failing-test-first proof: geometry
// probe mirroring the L23 capture-log check + a real pointer click. The
// viewport is forced inside the test, so it runs once regardless of project.
import { expect, test } from '@playwright/test'

const SHOTS = 'qa/aid3849'

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

test('switch-alert cancel keeps a pointer hit target at 320×568', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-375', 'viewport forçado 320×568 — executa 1×')
  await openPracticeApp(page)
  await page.setViewportSize({ width: 320, height: 568 })
  await page.getByRole('button', { name: /pg-c01 ·/i }).click()
  await expect(page.getByRole('heading', { level: 1, name: /cotidiano: dados mínimos e verificação/i })).toBeVisible()
  await page.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }).click()
  await page.getByLabel('Peça da etapa A').fill('pedido mínimo com rótulos neutros')

  // C5 (recoverable error): switching during an active attempt requires an
  // explicit confirmed restart; Cancel must keep the attempt untouched.
  await page.getByRole('button', { name: /pg-d01 ·/i }).click()
  await expect(page.getByRole('alert')).toContainText(/tentativa em curso/i)
  const cancel = page.getByRole('button', { name: /cancelar e continuar pg-c01/i })
  await cancel.scrollIntoViewIfNeeded()

  // Geometry probe (mirrors the L23 c5-defect-pointer-obstruction check): the
  // element at the Cancel center must be the button or inside the alert.
  const hit = await cancel.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const target = document.elementFromPoint(x, y)
    return {
      center: { x: Math.round(x), y: Math.round(y) },
      hitTag: target?.tagName ?? null,
      hitIsCancelOrInsideAlert: !!(target && (target === el || el.contains(target) || target.closest('p[role="alert"]'))),
    }
  })
  expect(hit.hitIsCancelOrInsideAlert, `elementFromPoint(${hit.center.x},${hit.center.y}) → ${hit.hitTag}`).toBe(true)

  await page.screenshot({ path: `${SHOTS}/${testInfo.project.name}-switch-alert-320.png`, fullPage: true })
  await cancel.click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Peça da etapa A')).toHaveValue(/pedido mínimo/i)
})
