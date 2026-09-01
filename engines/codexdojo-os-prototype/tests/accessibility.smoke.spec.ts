import { expect, test } from '@playwright/test'

test('keeps the compact reduced-motion journey keyboard-operable with semantic fallback', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  const devTrack = page.getByTestId('track-option-dev')
  await expect(devTrack).toContainText('Dev')
  await expect(page.getByTestId('track-option-ai-pratica')).toContainText('IA Prática')
  await devTrack.focus()
  await expect(devTrack).toBeFocused()
  expect(await devTrack.evaluate((element) => ({
    outline: getComputedStyle(element).outlineStyle,
    height: element.getBoundingClientRect().height,
  }))).toMatchObject({ outline: 'solid', height: expect.any(Number) })
  expect((await devTrack.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Entrar na escola' }).focus()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { name: 'WAREHOUSE: Key-Value Store (in-memory)' })).toBeVisible()
  const review = page.getByRole('button', { name: 'Revisar agora' })
  await review.focus()
  await page.keyboard.press('Enter')

  const status = page.locator('.mission-status[aria-live="polite"]')
  await expect(status).toBeVisible()
  const mission = page.frameLocator('iframe[title="Missão WAREHOUSE: Key-Value Store (in-memory)"]')
  await expect(mission.getByTestId('accessible-projection')).toBeVisible()
  const firstAction = mission.getByTestId(/accessible-shelf-/).first()
  await firstAction.focus()
  await expect(firstAction).toBeFocused()
  await firstAction.press('Enter')

  expect(await page.evaluate(() => ({
    fits: document.documentElement.scrollWidth <= window.innerWidth,
    reducedAnimation: getComputedStyle(document.querySelector('.next-mission-card') ?? document.body).animationName,
  }))).toEqual({ fits: true, reducedAnimation: 'none' })
})
