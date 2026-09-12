import { chromium } from '../../engines/codexdojo-os-prototype/node_modules/playwright/index.mjs'
import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'

const canonical = 'https://aidevschool-codexdojo-os.netlify.app'
const immutable = 'https://6a8c366553da9a55fed22b04--aidevschool-codexdojo-os.netlify.app'
const outputDir = new URL('./', import.meta.url)

async function probe(base, path) {
  const response = await fetch(`${base}${path}`, { redirect: 'follow' })
  const body = Buffer.from(await response.arrayBuffer())
  return {
    path,
    status: response.status,
    contentType: response.headers.get('content-type'),
    sha256: createHash('sha256').update(body).digest('hex'),
    bytes: body.length,
  }
}

async function runJourney(base, label) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  const consoleErrors = []
  const failedRequests = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', (request) => failedRequests.push({ url: request.url(), error: request.failure()?.errorText }))

  await page.goto(base, { waitUntil: 'networkidle' })
  const landingHeading = await page.getByRole('heading').first().innerText()
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Começar missão' }).click()
  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  await mission.getByTestId('output-out-b').check()
  await mission.getByTestId('criterion-c-fontes').check()
  await mission.getByTestId('criterion-c-limites').check()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()
  await page.waitForTimeout(2_000)
  const postCompletionText = await page.locator('body').innerText()
  await writeFile(new URL(`${label}-post-completion.txt`, outputDir), postCompletionText)
  await page.screenshot({ path: new URL(`${label}-post-completion.png`, outputDir).pathname, fullPage: true })
  const verificationLocator = page.getByText(/Ainda não enviada|Verificação independente aprovada|Verificação pede nova tentativa|Verificador indisponível/, { exact: true })
  await verificationLocator.waitFor()
  const verification = await verificationLocator.innerText()
  const boundaryLocator = page.getByText(/gate canônico continua separado|continuam registros diferentes/i)
  const boundary = await boundaryLocator.first().innerText()
  await page.screenshot({ path: new URL(`${label}-result.png`, outputDir).pathname, fullPage: true })
  await page.getByRole('button', { name: 'Voltar ao hub' }).click()
  const hubUrl = page.url()
  const result = { base, landingHeading, boundary, verification, hubUrl, consoleErrors, failedRequests }
  await browser.close()
  return result
}

const paths = ['/', '/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/']
const canonicalProbes = await Promise.all(paths.map((path) => probe(canonical, path)))
const immutableProbes = await Promise.all(paths.map((path) => probe(immutable, path)))
const result = {
  executedAt: new Date().toISOString(),
  environment: { node: process.version, browser: 'Chromium headless', viewport: '1280x800' },
  canonicalProbes,
  immutableProbes,
  hashesMatch: canonicalProbes.every((probeResult, index) => probeResult.sha256 === immutableProbes[index].sha256),
  journeys: [await runJourney(canonical, 'canonical'), await runJourney(immutable, 'immutable')],
}
await writeFile(new URL('post-go-smoke-result.json', outputDir), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
