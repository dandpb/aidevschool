// AID-306 pre-check (adapted from _work-products/AID-290/precheck-draft.mjs)
// Expected pin: 3f6419063e1dad923317c911227a8b21fcf50ad7 (branch aid-271/literacy-reflow-320, fast-forward of release line 75c6cec7)
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
const require = createRequire('/paperclip/tmp/aid306/wt/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL
const PIN = '3f6419063e1dad923317c911227a8b21fcf50ad7'
const MANIFEST_SHA = 'fc694824d22e0dbd0def7be6c284ce37d8274342df34e3855eb03c4fc6c7d658'
const OS_SHA = '4658412b9d3c8a3a4f5623178b7be03dbd43eaf10c85da062d9b1febcc966541'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')

// 1. remote manifest identity
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA, sha(mbody))
check('manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)
check('manifest-os-bytes', manifest.surfaces.os.sha256 === OS_SHA, manifest.surfaces.os.sha256.slice(0, 16))

// 2. surfaces reachable
for (const p of ['/', '/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/']) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS bundle embeds same-origin literacy pin, not the stale deploy
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
check('os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'))
check('os-no-stale-external-pin', !osJs.includes('6a8ddc9afe6838bdcf19a465'))

// 4. embedded literacy app declares the expected contentVersion
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-08-21.1', litJs.includes('2026-08-21.1'))
check('literacy-not-2026-07-25.1', !litJs.includes('2026-07-25.1'))

// 5. AID-271 fix present in published literacy CSS: no body min-width floor;
//    .voxel-world reflows with min-width:0 (defect: docScrollW=320 > innerW=298)
const litCssPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const litCss = await (await fetch(`${BASE}/apps/literacydojo/${litCssPath}`)).text()
check('reflow-no-body-min-width-320', !/body\{[^}]*min-width:\s*320px/.test(litCss))
check('reflow-voxel-world-min-width-0', /\.voxel-world\{[^}]*min-width:\s*0/.test(litCss))

// 6. live MOTOR handshake: l01 + l02 + one Dev mission regression + reflow predicate @320 in-iframe
const browser = await chromium.launch()
for (const [label, path] of [['l01', '/mission/ai-pratica/l01'], ['l02', '/mission/ai-pratica/l02'], ['warehouse', '/mission/dev/game-02-warehouse']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const ready = []
  page.on('console', (m) => { const t = m.text(); if (t.includes('engine.ready')) ready.push(t.slice(0, 200)) })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    let status = ''
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(4000)
      status = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/MOTOR \w+/)?.[0] ?? '')
      if (status) break
    }
    const frameUrl = await page.evaluate(() => { const f = document.querySelector('iframe'); return f ? new URL(f.src).origin + new URL(f.src).pathname : 'none' })
    check(`MOTOR ${label}`, status === 'MOTOR running', `${status || 'no-status'} iframe=${frameUrl}`)
    if (label.startsWith('l')) check(`${label} iframe same-origin`, frameUrl.startsWith(new URL(BASE).origin + '/apps/literacydojo/'), frameUrl)
  } catch (e) {
    check(`MOTOR ${label}`, false, e.message.slice(0, 120))
  }
  await page.close()
}

// 7. QA reflow predicate (AID-264 §3) inside the embedded iframe at 320px AND at the
//    tighter ~298px geometry the host shell actually delivers (producer smoke;
//    independent GO remains with QA via AID-307).
for (const vw of [320, 298]) {
  const page = await browser.newPage({ viewport: { width: vw, height: 640 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub/, { timeout: 20000 })
    await page.goto(BASE + '/mission/ai-pratica/l01', { waitUntil: 'domcontentloaded' })
    const handle = await page.waitForSelector('iframe[src*="literacydojo"]', { timeout: 20000 })
    const frame = await handle.contentFrame()
    let pred
    for (let i = 0; i < 15; i++) {
      pred = await frame.evaluate(() => {
        const d = document.scrollingElement ?? document.documentElement
        return { docScrollW: d.scrollWidth, innerW: window.innerWidth, ok: d.scrollWidth <= window.innerWidth }
      })
      if (pred.docScrollW > 0) break
      await page.waitForTimeout(1000)
    }
    check(`reflow-iframe@${vw}`, pred.ok, `docScrollW=${pred.docScrollW} innerW=${pred.innerW}`)
  } catch (e) {
    check(`reflow-iframe@${vw}`, false, e.message.slice(0, 120))
  }
  await page.close()
}
await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
