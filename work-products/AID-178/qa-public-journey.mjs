import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import playwright from '../../engines/codexdojo-os-prototype/node_modules/@playwright/test/index.js'

const { chromium } = playwright
const baseUrl = 'https://6a8ddcddb4a14cda431ff91e--aidevschool-codexdojo-os.netlify.app'
const expectedLiteracyOrigin = 'https://6a8ddc9afe6838bdcf19a465--aidevschool-literacydojo.netlify.app'
const canonicalPath = new URL('../../learner/learning_state.yaml', import.meta.url)
const screenshot = new URL('./qa-public-journey-result.png', import.meta.url).pathname
const expectedHashes = {
  termos: '385d87d6c123385137dee041abe6f9904b193ad19811cc71e45c7399a6763b12',
  privacidade: '27fe5a37e1aff970029adcd348cb32c0597b1fb3bee5ba4c5eada235b42cd487',
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const canonicalBefore = {
  hash: sha256(await readFile(canonicalPath)),
  mtimeMs: (await stat(canonicalPath)).mtimeMs,
}
const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const verifierResponses = []
  page.on('response', async (response) => {
    if (!response.url().includes('/.netlify/functions/literacy-verify')) return
    verifierResponses.push({
      url: response.url(),
      status: response.status(),
      body: await response.text(),
    })
  })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Entrar na escola' }).click()
  await page.getByRole('button', { name: 'Começar missão' }).click()

  const iframe = page.locator('iframe[title="Missão IA não é uma fonte de verdade"]')
  await iframe.waitFor({ state: 'attached' })
  const src = await iframe.getAttribute('src')
  if (!src) throw new Error('iframe sem src')
  if (new URL(src).origin !== expectedLiteracyOrigin) throw new Error(`origem inesperada: ${new URL(src).origin}`)

  const mission = page.frameLocator('iframe[title="Missão IA não é uma fonte de verdade"]')
  const legal = {}
  for (const [name, label] of [['termos', /termos do piloto/i], ['privacidade', /privacidade/i]]) {
    const href = await mission.getByRole('link', { name: label }).first().getAttribute('href')
    if (!href) throw new Error(`link ${name} sem href`)
    const response = await page.request.get(new URL(href, src).href)
    const body = await response.body()
    legal[name] = { url: response.url(), status: response.status(), sha256: sha256(body) }
    if (response.status() !== 200) throw new Error(`${name} retornou ${response.status()}`)
    if (legal[name].sha256 !== expectedHashes[name]) throw new Error(`hash ${name} divergente: ${legal[name].sha256}`)
  }

  await mission.getByRole('button', { name: 'Começar missão', exact: true }).click()
  await mission.getByTestId('output-out-b').click()
  await mission.getByTestId('criterion-c-fontes').click()
  await mission.getByTestId('criterion-c-limites').click()
  await mission.getByTestId('submit-attempt').click()
  await mission.getByTestId('finish-lesson').click()
  await mission.getByTestId('result-screen').waitFor({ timeout: 30_000 })
  await page.waitForTimeout(3_000)

  const resultText = await mission.getByTestId('result-screen').innerText()
  const verificationText = await mission.getByTestId('verification-status').innerText()
  await page.screenshot({ path: screenshot, fullPage: true })
  if (/mastered/i.test(resultText)) throw new Error('UI de resultado contém mastered')
  if (!/não altera (o )?estado canônico|não altera domínio canônico/i.test(resultText)) throw new Error('distinção canônica ausente')
  if (!/Recibo independente:/.test(verificationText)) throw new Error(`recibo ausente: ${verificationText}`)
  if (verifierResponses.length !== 1) throw new Error(`esperava 1 resposta do verificador, obteve ${verifierResponses.length}`)
  const verifier = { ...verifierResponses[0], parsed: JSON.parse(verifierResponses[0].body) }
  const receipt = verifier.parsed.receipt ?? verifier.parsed
  if (receipt.verdict !== 'PASS' || receipt.context_isolated !== true) throw new Error(`recibo inválido: ${verifier.body}`)
  if (receipt.lesson_id !== 'l02' || receipt.lesson_version !== 3) throw new Error(`identidade de conteúdo inválida: ${verifier.body}`)
  if (!receipt.attempt_id || !verificationText.includes(receipt.attempt_id)) throw new Error(`attempt_id não correlacionado: ${receipt.attempt_id}`)
  if (receipt.producer_writes_mastered !== false) throw new Error('recibo permite producer_writes_mastered')

  const canonicalAfter = {
    hash: sha256(await readFile(canonicalPath)),
    mtimeMs: (await stat(canonicalPath)).mtimeMs,
  }
  if (JSON.stringify(canonicalAfter) !== JSON.stringify(canonicalBefore)) throw new Error('estado canônico local mudou')
  console.log(JSON.stringify({
    result: 'PASS', baseUrl, iframeSrc: src, legal,
    verifier: { url: verifier.url, status: verifier.status, receipt },
    verificationText, resultContainsMastered: /mastered/i.test(resultText),
    canonicalBefore, canonicalAfter, screenshot,
  }, null, 2))
} finally {
  await browser.close()
}
