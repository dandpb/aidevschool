// AID-343 pre-check (pattern: AID-306 precheck.mjs / AID-305 precheck-bridge.mjs)
// >>> SUPERSEDED (2026-08-30T16:0xZ race-correction): constants below verify deploy
// 6a944c43 (manifest 53aa5c52…) — superseded; see RELEASE.md §Correção de corrida.
// The LIVE pin is deploy 6a944cf2 (manifest 7d0e16d9…) — use precheck-final.mjs. <<<
// Candidate pin: 6d72735ba2113cb6198c4d7be26c2f01e5f5d694 (merge PR #182, lote l01–l14)
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
const require = createRequire('/tmp/opencode/promo/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL
const PIN = '6d72735ba2113cb6198c4d7be26c2f01e5f5d694'
const MANIFEST_SHA = '53aa5c522c27ae77759429f25bb738a3006eeb6c3f72934173f3d13e67d9711e'
const OS_SHA = 'd2c8912cd0292676cd8bb7d3e3871dd6f8053c2c1dd9cbbc4c9f07e75e3c5e95'
const LIT_SHA = 'f7598612f3e2db2054c907699d20402b5c3cc75784dfc030a53c612d0243bd9c'
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
check('manifest-literacy-bytes', manifest.surfaces.literacydojo.sha256 === LIT_SHA, manifest.surfaces.literacydojo.sha256.slice(0, 16))
check('manifest-inventory', Array.isArray(manifest.files) && manifest.files.includes('apps/literacydojo/sw.js') && !manifest.files.includes('pilot-bundle-manifest.json'), `${manifest.files?.length ?? 0} files (manifest excludes itself, per pilot-bundle-lib contract)`)

// 2. surfaces reachable
for (const p of ['/', '/apps/literacydojo/', '/apps/warehouse/', '/apps/wormhole/', '/apps/relay-station/']) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. same-origin verification bridge (AID-305 signature)
const bridgeOk = await fetch(`${BASE}/__dojo/bridge/v1/session`, { headers: { 'Sec-Fetch-Site': 'same-origin' } })
const bridgeBody = await bridgeOk.json().catch(() => ({}))
check('bridge-session-200-same-origin', bridgeOk.status === 200 && typeof bridgeBody.token === 'string' && bridgeBody.token.length === 43, `status=${bridgeOk.status} token=${bridgeBody.token?.length ?? 0}ch`)
const bridgeDenied = await fetch(`${BASE}/__dojo/bridge/v1/session`)
const deniedBody = await bridgeDenied.json().catch(() => ({}))
check('bridge-session-403-cross-origin', bridgeDenied.status === 403 && deniedBody.error === 'origin-forbidden', `status=${bridgeDenied.status} err=${deniedBody.error}`)
const verif = await fetch(`${BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }, body: '{}' })
check('bridge-verification-401-no-token', verif.status === 401, String(verif.status))

// 4. OS bundle embeds same-origin literacy pin
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
check('os-embeds-same-origin-literacy', osJs.includes('/apps/literacydojo/'))
check('os-embeds-same-origin-warehouse', osJs.includes('/apps/warehouse/'))

// 5. embedded literacy app declares the expected contentVersion
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-08-21.1', litJs.includes('2026-08-21.1'))

// 6. live MOTOR handshake: continuity controls (l01, l02, warehouse) + new l04–l14 sample
const browser = await chromium.launch()
for (const [label, path] of [['l01', '/mission/ai-pratica/l01'], ['l02', '/mission/ai-pratica/l02'], ['l05', '/mission/ai-pratica/l05'], ['l10', '/mission/ai-pratica/l10'], ['l14', '/mission/ai-pratica/l14'], ['warehouse', '/mission/dev/game-02-warehouse']]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
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
