// Guards the pilot deploy: every mission must mount from the OS's own origin,
// with no dev server running. The dev-server suite in ../tests cannot catch a
// broken deploy, because it starts each runtime on its own localhost port —
// which is exactly how a built OS shipped with dead mission iframes.
import { expect, test } from '@playwright/test'

async function enterSchool(page: import('@playwright/test').Page, track?: RegExp) {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'O que você quer conseguir fazer com IA?' }),
  ).toBeVisible()
  if (track) await page.getByRole('button', { name: track }).click()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await expect(page.getByRole('heading', { name: 'Aprenda uma coisa útil agora.' })).toBeVisible()
}

// The assertion that matters: the frame's URL is on the host origin (i.e. the
// bundled /apps/ path won), and content inside it actually rendered. A frame
// pointing at a dev port fails the first check; a frame that failed to load
// fails the second.
async function expectMissionMounted(
  page: import('@playwright/test').Page,
  iframeTitle: string,
  innerContent: RegExp,
) {
  const frameElement = page.locator(`iframe[title="${iframeTitle}"]`)
  await expect(frameElement).toBeVisible()

  const src = await frameElement.getAttribute('src')
  expect(src, 'mission iframe has a src').toBeTruthy()
  const origin = new URL(src as string, page.url()).origin
  expect(origin, 'mission must be served from the OS origin, not a dev server').toBe(
    new URL(page.url()).origin,
  )

  // Assert on text rather than visibility: a failed load renders Chrome's error
  // page (no match), while a mounted runtime may keep some nodes visually
  // hidden or fall back to the non-WebGL projection in headless.
  await expect(
    page.frameLocator(`iframe[title="${iframeTitle}"]`).locator('body'),
  ).toContainText(innerContent)
}

test('IA Prática mission mounts from the bundled build', async ({ page }) => {
  await enterSchool(page)
  await page.getByRole('button', { name: /Começar missão|Revisar agora|Continuar missão/ }).click()
  await expectMissionMounted(
    page,
    'Missão IA não é uma fonte de verdade',
    /IA não é uma fonte de verdade/,
  )
})

test('Dev mission mounts from the bundled build and reports the verifier honestly', async ({
  page,
}) => {
  await enterSchool(page, /Trilha técnica.*Dev/)
  await page.getByRole('button', { name: /Começar missão|Revisar agora|Continuar missão/ }).click()
  await expectMissionMounted(
    page,
    'Missão WAREHOUSE: Key-Value Store (in-memory)',
    /Hash|shelf|WAREHOUSE/i,
  )

  // No local verifier bridge exists in a static deploy. The host must say so
  // rather than imply mastery — producer != verifier survives the pilot build.
  await expect(page.getByText('Ainda não enviada', { exact: true })).toBeVisible()
})
