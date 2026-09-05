// AID-290 re-pin pre-check (adapted from _work-products/AID-282/precheck-draft.mjs)
// Expected pin: 29b59a9239f5f3d86cbc1e3a27eff290c6e8bcbf (branch aid-290/repin-reduced-motion, descends from afd6789 + 61b85535)
// AID-282 producer pre-check: draft identity + IA Prática MOTOR handshake fix
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
const require = createRequire('/paperclip/tmp/aid273/wt/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL
const PIN = '29b59a9239f5f3d86cbc1e3a27eff290c6e8bcbf'
const MANIFEST_SHA = '48714a7f568faf32df5147d4e497e871efff9dd309306756c1a023700d491e45'
const results = []
const check = (id, ok, detail = '') => { results.push({ id, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail}`) }
const sha = (s) => createHash('sha256').update(s).digest('hex')

// 1. remote manifest identity
const mres = await fetch(`${BASE}/pilot-bundle-manifest.json`)
const mbody = await mres.text()
const manifest = JSON.parse(mbody)
check('manifest-sha256', mres.ok && sha(mbody) === MANIFEST_SHA, sha(mbody))
check('manifest-sourceRevision', manifest.sourceRevision === PIN, manifest.sourceRevision)
check('manifest-os-bytes', manifest.surfaces.os.sha256 === '4170ad5626e14654018d26873c8f3a82228c9d4a854700d4a3cc687d2012dfd3', manifest.surfaces.os.sha256.slice(0, 16))

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

// 5. live MOTOR handshake: l01 + l05 + one Dev mission regression
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
await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} PASS`)
process.exit(failed.length ? 1 : 0)
