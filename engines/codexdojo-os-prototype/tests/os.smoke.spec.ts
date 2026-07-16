import { expect, test } from '@playwright/test'

test('renders canonical learner status and operates a desktop lab', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/')
  await expect(page).toHaveTitle(/codexDojo OS/)
  await expect(page.getByRole('button', { name: /Atividades/ })).toBeVisible()
  await expect(page.locator('.canonical-unit')).toContainText(/Unidade canônica/i)

  if (testInfo.project.name === 'tablet-768') {
    const tabletStatsVisible = await page.evaluate(() => {
      const stats = document.querySelector('.topbar-stats > span')
      return stats instanceof HTMLElement && getComputedStyle(stats).display !== 'none'
    })
    expect(tabletStatsVisible).toBe(false)
  }

  const sideRailOverlapsWindow = await page.evaluate(() => {
    if (document.documentElement.clientWidth <= 760) return false
    const desktopWindow = document.querySelector('.desktop-window')?.getBoundingClientRect()
    const learningRail = document.querySelector('.learning-rail')?.getBoundingClientRect()
    const sideRail = learningRail !== undefined
      && learningRail.width < document.documentElement.clientWidth * 0.6
    return desktopWindow !== undefined && sideRail
      ? desktopWindow.right > learningRail.left
      : false
  })
  expect(sideRailOverlapsWindow).toBe(false)

  const windowFillsMobileWorkspace = await page.evaluate(() => {
    if (document.documentElement.clientWidth > 760) return true
    const desktopWindow = document.querySelector('.desktop-window')?.getBoundingClientRect()
    return desktopWindow !== undefined
      ? desktopWindow.width >= document.documentElement.clientWidth - 32
      : false
  })
  expect(windowFillsMobileWorkspace).toBe(true)

  await page.getByRole('button', { name: /Atividades/ }).click()
  const launcher = page.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await expect(launcher).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar aplicativos ou fundamentos' }).fill('Terminal')
  await launcher.getByRole('button', { name: /Terminal/ }).click()

  const command = page.getByLabel('daniel@dojo:~$')
  await command.fill('learn process')
  await command.press('Enter')
  await expect(page.getByText(/MICROLIÇÃO: o shell interpretou seu texto/)).toBeVisible()

  await page.screenshot({ path: `qa/${testInfo.project.name}-terminal.png`, fullPage: true })
  expect(consoleErrors).toEqual([])
})

test('keeps the focused mentor input inside the resized mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-375')

  await page.goto('/')
  const viewportPolicy = await page.locator('meta[name="viewport"]').getAttribute('content')
  expect(viewportPolicy).toContain('interactive-widget=resizes-content')

  const mentorInput = page.getByRole('textbox', { name: 'Pergunta para o mentor local' })
  await mentorInput.click()
  await page.setViewportSize({ width: 375, height: 500 })

  const inputFitsVisibleViewport = await mentorInput.evaluate((input) => {
    const rect = input.getBoundingClientRect()
    return rect.top >= 0 && rect.bottom <= document.documentElement.clientHeight
  })
  expect(inputFitsVisibleViewport).toBe(true)
})
