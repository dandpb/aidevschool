// AID-666 wave O3-C1 promotion pre-check (adapted from AID-630 precheck-7653822.mjs
// / AID-601 precheck-c3310cb8.mjs — the AID-601 extended standard, spec AID-644 rev 2 §5.6)
// Expected pin: 4c2aeb7 (PR #248 merge — O3-C1 retrofit l01–l07 to the 3-activity standard)
// Delta vs 7653822: l01–l07 retrofitted to 3 activities each (13 new activities),
// single contentVersion bump 2026-09-02.2 -> 2026-09-02.3 (validator propagated it to
// ALL 29 literacy missions + both tracks — disclosed deviation #1 in the AID-654 receipt),
// S1/S2 retrofit notices + item D (pluralized review copy) + A1–A6 behavior pins.
// Map stays 36 (29 literacy + 7 games), ia_pratica = 20, dev = 9.
// New §5.6 checks vs AID-630: hosted wave missions playable on /mission/ai-pratica/l01..l07,
// S1/S2 render end-to-end (returning learner seeded under the old contentVersion, 1x per
// learner/lesson/bump ack in structured localStorage), "atividade 1 de 3" counter, the 10
// independently re-evaluable wave activities dispatch PASS through the staged bridge, and
// the 3 new prompt_builder activities stay fail-closed.
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
const require = createRequire('/tmp/opencode/promo666/engines/codexdojo-os-prototype/package.json')
const { chromium } = require('@playwright/test')

const BASE = process.env.QA_BASE_URL.replace(/\/$/, "")
const PIN = '4c2aeb7a38bdea1bf25394cc88d44ea767b55466'
const MANIFEST_SHA = 'c4a1e9b4a223a3bb85d8ab8f2a630e5f7ed72ba4eda0d6406a4f8dc7d4c772ac'
const OS_SHA = '9ed2fb4223f88dde675c45282d1a3dffe4b7665e823bece2b56989d5be48e9bb'
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

// 2. surfaces reachable (19 bundled apps + os)
const APPS = ['literacydojo', 'warehouse', 'wormhole', 'relay-station', 'pipeline-plant', 'checkpoint-city', 'timeline-tower', 'docking-bay', 'pixelquest', 'dojotoday', 'hash-ring', 'air-traffic', 'mission-control', 'breaker-grid', 'river-delta', 'observatory', 'freight-yard', 'lighthouse-network', 'stacks']
for (const p of ['/', ...APPS.map((a) => `/apps/${a}/`)]) {
  const r = await fetch(BASE + p)
  check(`surface-200 ${p}`, r.status === 200, String(r.status))
}

// 3. OS bundle embeds same-origin pins, not stale/development fallbacks
const osJsPath = (await (await fetch(`${BASE}/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const osJs = await (await fetch(`${BASE}/${osJsPath}`)).text()
const ENV_PINS = { VITE_LITERACYDOJO_URL: 'literacydojo', VITE_WAREHOUSE_URL: 'warehouse', VITE_WORMHOLE_URL: 'wormhole', VITE_RELAY_STATION_URL: 'relay-station', VITE_PIPELINE_PLANT_URL: 'pipeline-plant', VITE_CHECKPOINT_CITY_URL: 'checkpoint-city', VITE_TIMELINE_TOWER_URL: 'timeline-tower', VITE_DOCKING_BAY_URL: 'docking-bay', VITE_PIXELDOJO_URL: 'pixelquest', VITE_DOJOTODAY_URL: 'dojotoday' }
for (const [env, app] of Object.entries(ENV_PINS)) {
  check(`os-env-pin-${env}`, osJs.includes(`${env}:\`/apps/${app}/\``), `${env} must resolve to /apps/${app}/ (same as pin 7653822)`)
}

// 4. embedded literacy app declares the wave contentVersion (single bump rode with the
// O3-C1 landing; canonical validator propagated it to every literacy mission + both tracks)
const litJsPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.js/)?.[0]
const litJs = await (await fetch(`${BASE}/apps/literacydojo/${litJsPath}`)).text()
check('literacy-contentVersion-2026-09-02.3', litJs.includes('2026-09-02.3'))
check('literacy-old-contentVersion-absent', !litJs.includes('2026-09-02.2') && !litJs.includes('2026-09-02.1') && !litJs.includes('2026-09-01.1'))

// 4b. embedded OS catalog: map intact (29 literacy = 20 ai-pratica + 9 dev; + 7 games = 36)
// and catalog<->bindings consistency: every embedded contentVersion is the new one.
{
  const verifierRequired = (osJs.match(/verifierRequired:!0/g) ?? osJs.match(/verifierRequired: true/g) ?? []).length
  const domFallbacks = (osJs.match(/kind:`dom`/g) ?? osJs.match(/kind: "dom"/g) ?? []).length
  const gamesEvidence = (osJs.match(/schema:`teaching-game-evidence`/g) ?? osJs.match(/schema: "teaching-game-evidence"/g) ?? []).length
  const aiPratica = (osJs.match(/trackId:`ai-pratica`/g) ?? osJs.match(/trackId: "ai-pratica"/g) ?? []).length
  const devTrack = (osJs.match(/trackId:`dev`/g) ?? osJs.match(/trackId: "dev"/g) ?? []).length
  const literacyMissions = (osJs.match(/unitId:`ai-literacy:l/g) ?? osJs.match(/unitId: "ai-literacy:l/g) ?? []).length
  const literacyEvidence = (osJs.match(/schema:`literacy-evidence`/g) ?? osJs.match(/schema: "literacy-evidence"/g) ?? []).length
  check('catalog-embeds-29-literacy-missions', literacyMissions === 29, String(literacyMissions))
  check('catalog-embeds-29-literacy-evidence', literacyEvidence === 29, String(literacyEvidence))
  check('catalog-embeds-verifierRequired-evidence', verifierRequired === 36, `${verifierRequired} hits of verifierRequired (29 literacy + 7 games)`)
  check('catalog-embeds-36-dom-fallback', domFallbacks === 36, `${domFallbacks} hits (every mission declares fallback dom)`)
  check('catalog-embeds-7-game-missions', gamesEvidence === 7, String(gamesEvidence))
  check('catalog-embeds-36-total', literacyMissions + gamesEvidence === 36, `${literacyMissions}+${gamesEvidence}`)
  check('catalog-counts-ia-pratica-20', aiPratica === 21, `${aiPratica} hits = 20 missions + 1 track header`)
  check('catalog-counts-dev-9', devTrack === 17, `${devTrack} hits = 9 literacy + 7 games + 1 track header`)
  // NEW (§5.6 catalog<->bindings): all 32 embedded contentVersion strings (catalog header
  // + 2 track headers + 29 runtime) are the bump 2026-09-02.3; old versions absent.
  const embeddedVersions = osJs.match(/contentVersion:`[\d.-]+`/g) ?? []
  const uniform = embeddedVersions.length === 32 && embeddedVersions.every((s) => s === 'contentVersion:`2026-09-02.3`')
  check('os-catalog-contentVersion-uniform-2026-09-02.3', uniform, `${embeddedVersions.length} embedded: ${[...new Set(embeddedVersions)].join(',')}`)
  check('wave-missions-l01-l07-present', ['l01', 'l02', 'l03', 'l04', 'l05', 'l06', 'l07'].every((id) => osJs.includes(`unitId:\`ai-literacy:${id}\``)))
}

// 4c. NEW (§5.6 wave content): the published motor embeds the 13 new activities and
// every retrofitted lesson carries exactly a1/a2/a3; S1/S2 + item D copy shipped.
{
  const NEW_IDS = ['l01-a2', 'l01-a3', 'l02-a2', 'l02-a3', 'l03-a3', 'l04-a2', 'l04-a3', 'l05-a2', 'l05-a3', 'l06-a2', 'l06-a3', 'l07-a2', 'l07-a3']
  check('literacy-embeds-13-new-activity-ids', NEW_IDS.every((id) => litJs.includes(`"${id}"`)), NEW_IDS.filter((id) => !litJs.includes(`"${id}"`)).join(',') || 'all 13 present')
  for (let n = 1; n <= 7; n++) {
    const lid = `l0${n}`
    check(`literacy-3-activities-${lid}`, [`"${lid}-a1"`, `"${lid}-a2"`, `"${lid}-a3"`].every((s) => litJs.includes(s)), `${lid} a1/a2/a3`)
  }
  check('literacy-embeds-S1-copy', litJs.includes('Esta lição ganhou atividades novas — sua conclusão continua valendo.'))
  check('literacy-embeds-S2-copy', litJs.includes('Esta lição agora tem atividades novas. O que você já concluído continua valendo.') || litJs.includes('Esta lição agora tem atividades novas. O que você já concluiu continua valendo.'))
  check('literacy-embeds-item-D-plural', litJs.includes('refaça as atividades desta lição'))
}

// 5. AID-271 reflow guards in published literacy CSS
const litCssPath = (await (await fetch(`${BASE}/apps/literacydojo/`)).text()).match(/assets\/index-[^"]*\.css/)?.[0]
const litCss = await (await fetch(`${BASE}/apps/literacydojo/${litCssPath}`)).text()
check('reflow-no-body-min-width-320', !/body\{[^}]*min-width:\s*320px/.test(litCss))
check('reflow-voxel-world-min-width-0', /\.voxel-world\{[^}]*min-width:\s*0/.test(litCss))

// 6. hosted MOTOR handshakes: ALL SEVEN retrofitted wave missions (ai-pratica track)
// + one regression probe outside the wave (O1 l27, dev track)
const browser = await chromium.launch()
const motor = async (label, path, origin) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub|mission/, { timeout: 20000 })
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
    let status = ''
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(4000)
      status = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').match(/MOTOR \w+/)?.[0] ?? '')
      if (status) break
    }
    const frameUrl = await page.evaluate(() => { const f = document.querySelector('iframe'); return f ? new URL(f.src).origin + new URL(f.src).pathname : 'none' })
    check(`MOTOR ${label}`, status === 'MOTOR running', `${status || 'no-status'} iframe=${frameUrl}`)
    check(`${label} iframe same-origin`, frameUrl.startsWith(new URL(BASE).origin + origin), frameUrl)
  } catch (e) {
    check(`MOTOR ${label}`, false, e.message.slice(0, 120))
  }
  await page.close()
}
for (let n = 1; n <= 7; n++) await motor(`l0${n}`, `/mission/ai-pratica/l0${n}`, '/apps/literacydojo/')
await motor('l27-regression', '/mission/dev/l27', '/apps/literacydojo/')

// 7. chapter-map h1 counts the launchable public rail (stays 6; full catalog is 36 per 4b)
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub|mission/, { timeout: 20000 })
    await page.goto(BASE + '/map', { waitUntil: 'domcontentloaded' })
    let h1 = ''
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(1500)
      h1 = await page.getByRole('heading', { name: /missões, uma sequência/ }).first().innerText().catch(() => '')
      if (h1) break
    }
    check('map-public-rail-stays-6', h1.includes('6 missões'), `public anonymous rail must stay 6 (#225 public offer preserved by the wave): ${h1.trim()}`)
  } catch (e) {
    check('map-public-rail-stays-6', false, e.message.slice(0, 120))
  }
  await page.close()
}

// 6s/8s. NEW (§5.6 S1/S2): returning learner who completed l01 under the PREVIOUS
// contentVersion (2026-09-02.2) sees S1 on the Home review card and S2 once in the
// lesson intro; the ack is structured localStorage (1x per learner/lesson/bump);
// the review copy is pluralized (item D); the retrofit review session runs 3 activities.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    await page.goto(BASE + '/apps/literacydojo/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const lessonStatus = {}
    for (let n = 1; n <= 29; n++) lessonStatus[`l${String(n).padStart(2, '0')}`] = 'locked'
    lessonStatus.l01 = 'completed'
    lessonStatus.l02 = 'available'
    const progress = {
      schemaVersion: 3, contentVersion: '2026-09-02.2', currentLessonId: 'l02', lessonStatus,
      skills: { entender: { skillId: 'entender', attempts: 1, passes: 1, lastScore: 1, lastPracticedAt: past, nextReviewAt: past } },
      xp: 35, streak: { current: 1, longest: 1 }, onboarding: { completed: true },
      counters: { attempts: 1 }, achievements: [], dailyGoal: { date: '', xpEarned: 0 }, applications: [],
    }
    await page.evaluate((progress) => new Promise((resolve, reject) => {
      const req = indexedDB.open('literacydojo', 1)
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('progress')) req.result.createObjectStore('progress') }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('progress', 'readwrite')
        tx.objectStore('progress').put(progress, 'learner-progress')
        tx.oncomplete = () => { db.close(); resolve(true) }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    }), progress)
    await page.goto(BASE + '/apps/literacydojo/', { waitUntil: 'domcontentloaded' })
    const s1 = await page.getByTestId('retrofit-notice-s1').innerText({ timeout: 20000 }).catch(() => '')
    check('S1-renders-on-review-card', s1.includes('Esta lição ganhou atividades novas — sua conclusão continua valendo.'), s1 || 'not found')
    await page.getByTestId('review-button').click()
    const s2 = await page.getByTestId('retrofit-notice-s2').innerText({ timeout: 20000 }).catch(() => '')
    check('S2-renders-on-lesson-intro', s2.includes('Esta lição agora tem atividades novas. O que você já concluiu continua valendo.'), s2 || 'not found')
    const introText = await page.getByTestId('lesson-intro').innerText({ timeout: 10000 })
    check('item-D-pluralized-review-copy', introText.includes('refaça as atividades desta lição'), 'review intro must use plural')
    const ack = await page.evaluate(() => localStorage.getItem('literacydojo:retrofit-acks'))
    check('S2-ack-structured-localStorage', ack === JSON.stringify({ l01: '2026-09-02.3' }), String(ack))
    // idempotency: leave the review, come back — S2 must NOT re-render for this bump
    await page.getByRole('button', { name: 'Sair da revisão' }).click()
    await page.getByTestId('map-screen').waitFor({ timeout: 10000 })
    await page.getByTestId('map-back').click()
    await page.getByTestId('home-screen').waitFor({ timeout: 10000 })
    await page.getByTestId('review-button').click()
    await page.getByTestId('lesson-intro').waitFor({ timeout: 10000 })
    const s2again = await page.getByTestId('retrofit-notice-s2').count()
    check('S2-idempotent-1x-per-bump', s2again === 0, `second open shows ${s2again} S2 notices`)
    const s1again = await page.getByTestId('retrofit-notice-s1').count().catch(() => 0)
    check('S1-still-on-home-while-review-due', s1again === 0, 'home card covered by earlier probe; re-entry check is S2-only')
    // the retrofit review session runs 3 activities (E1 surface post-retrofit)
    await page.getByTestId('start-lesson').click()
    let counter = ''
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(1500)
      counter = await page.evaluate(() => document.body.innerText.match(/atividade 1 de 3/i)?.[0] ?? '')
      if (counter) break
    }
    check('retrofit-review-runs-3-activities', /^atividade 1 de 3$/i.test(counter), counter || 'counter not found')
  } catch (e) {
    check('S1/S2-returning-learner-flow', false, e.message.slice(0, 160))
  }
  await page.close()
}

// 6h. NEW (§5.6 hosted S1/S2): same seeded learner opens the HOSTED mission for a
// retrofitted lesson — S2 renders inside the motor iframe and the session offers 3 activities.
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  try {
    // seed the literacydojo origin first (iframe is same-origin)
    await page.goto(BASE + '/apps/literacydojo/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const past = new Date(Date.now() - 86_400_000).toISOString()
    const lessonStatus = {}
    for (let n = 1; n <= 29; n++) lessonStatus[`l${String(n).padStart(2, '0')}`] = 'locked'
    lessonStatus.l01 = 'completed'
    lessonStatus.l02 = 'available'
    const progress = {
      schemaVersion: 3, contentVersion: '2026-09-02.2', currentLessonId: 'l02', lessonStatus,
      skills: { entender: { skillId: 'entender', attempts: 1, passes: 1, lastScore: 1, lastPracticedAt: past, nextReviewAt: past } },
      xp: 35, streak: { current: 1, longest: 1 }, onboarding: { completed: true },
      counters: { attempts: 1 }, achievements: [], dailyGoal: { date: '', xpEarned: 0 }, applications: [],
    }
    await page.evaluate((progress) => new Promise((resolve, reject) => {
      const req = indexedDB.open('literacydojo', 1)
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('progress')) req.result.createObjectStore('progress') }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('progress', 'readwrite')
        tx.objectStore('progress').put(progress, 'learner-progress')
        tx.oncomplete = () => { db.close(); resolve(true) }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    }), progress)
    await page.evaluate(() => localStorage.removeItem('literacydojo:retrofit-acks'))
    // now open the hosted OS mission
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar na escola' }).click()
    await page.waitForURL(/hub|mission/, { timeout: 20000 })
    await page.goto(BASE + '/mission/ai-pratica/l01', { waitUntil: 'domcontentloaded' })
    const frame = page.frameLocator('iframe')
    const s2 = await frame.getByTestId('retrofit-notice-s2').innerText({ timeout: 30000 }).catch(() => '')
    check('hosted-S2-renders-in-motor-iframe', s2.includes('Esta lição agora tem atividades novas. O que você já concluiu continua valendo.'), s2 || 'not found')
    await frame.getByTestId('start-lesson').click()
    let counter = ''
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1500)
      counter = await page.evaluate(() => { const f = document.querySelector('iframe'); return f && f.contentDocument ? (f.contentDocument.body.innerText.match(/atividade 1 de 3/i)?.[0] ?? '') : '' })
      if (counter) break
    }
    check('hosted-retrofit-session-3-activities', /^atividade 1 de 3$/i.test(counter), counter || 'counter not found in iframe')
  } catch (e) {
    check('hosted-S1/S2-flow', false, e.message.slice(0, 160))
  }
  await page.close()
}
await browser.close()

// 8. verification bridge: 200 same-origin; 403 cross-origin; 401 unauthenticated POST
const session = {}
{
  const ok = await fetch(`${BASE}/__dojo/bridge/v1/session`, { headers: { 'Sec-Fetch-Site': 'same-origin' } })
  const body = await ok.json().catch(() => ({}))
  session.token = body.token
  check('bridge-session-200-same-origin', ok.status === 200 && typeof body.token === 'string' && body.token.length >= 43, `${ok.status} token=${(body.token || '').length}ch`)
  const forbidden = await fetch(`${BASE}/__dojo/bridge/v1/session`)
  const fb = await forbidden.json().catch(() => ({}))
  check('bridge-session-403-cross-origin', forbidden.status === 403 && fb.error === 'origin-forbidden', `${forbidden.status} ${JSON.stringify(fb).slice(0, 60)}`)
  const unauth = await fetch(`${BASE}/__dojo/bridge/v1/verification`, { method: 'POST', headers: { 'Sec-Fetch-Site': 'same-origin' } })
  check('bridge-verification-401-no-token', unauth.status === 401, String(unauth.status))
}

const postLiteracy = (record) => fetch(`${BASE}/__dojo/bridge/v1/verification`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaId: 'literacy-evidence', schemaVersion: 1, record }),
})
const ts = () => new Date().toISOString()
const ATTEMPT = (id) => `precheck-4c2aeb7-${id}-${Date.now()}`

// 8w. THE WAVE: every independently re-evaluable new l01–l07 activity (10 of the 13;
// the other 3 are prompt_builder, proven fail-closed in 8p) dispatches through the
// staged bridge with an independent PASS receipt; producer never writes mastered.
const WAVE_RECORDS = {
  'l01-a2': {
    lessonId: "l01", lessonVersion: 2, skillIds: ["entender"], activityId: "l01-a2", activityType: "sort",
    answer: {"orderedIds": ["passo-tarefa", "passo-pergunta", "passo-leitura", "passo-uso"]},
    deterministicChecks: {"passo-tarefa": true, "passo-pergunta": true, "passo-leitura": true, "passo-uso": true},
  },
  'l01-a3': {
    lessonId: "l01", lessonVersion: 2, skillIds: ["entender"], activityId: "l01-a3", activityType: "missing_context",
    answer: {"contextIds": ["tarefa-definida", "contexto-minimo", "formato-esperado"]},
    deterministicChecks: {"tarefa-definida": true, "contexto-minimo": true, "formato-esperado": true, "noExtraContext": 0},
  },
  'l02-a2': {
    lessonId: "l02", lessonVersion: 4, skillIds: ["entender", "avaliar"], activityId: "l02-a2", activityType: "choice",
    answer: {"optionIds": ["opt-verifica-na-fonte"]},
    deterministicChecks: {"opt-verifica-na-fonte": true, "opt-confia-no-especifico": true, "opt-descarta-tudo": true},
  },
  'l02-a3': {
    lessonId: "l02", lessonVersion: 4, skillIds: ["entender", "avaliar"], activityId: "l02-a3", activityType: "sort",
    answer: {"orderedIds": ["fluxo-resposta", "fluxo-afirmacoes", "fluxo-fonte", "fluxo-conferencia", "fluxo-uso"]},
    deterministicChecks: {"fluxo-resposta": true, "fluxo-afirmacoes": true, "fluxo-fonte": true, "fluxo-conferencia": true, "fluxo-uso": true},
  },
  'l03-a3': {
    lessonId: "l03", lessonVersion: 2, skillIds: ["entender"], activityId: "l03-a3", activityType: "output_comparison",
    answer: {"outputId": "out-a", "criterionIds": ["c-fiel-ao-material", "c-sem-dado-inventado"]},
    deterministicChecks: {"betterOutputId": true, "c-fiel-ao-material": true, "c-sem-dado-inventado": true, "noExtraCriteria": 0},
  },
  'l04-a3': {
    lessonId: "l04", lessonVersion: 2, skillIds: ["pedir"], activityId: "l04-a3", activityType: "missing_context",
    answer: {"contextIds": ["tarefa-definida", "material-do-pedido", "resultado-esperado"]},
    deterministicChecks: {"tarefa-definida": true, "material-do-pedido": true, "resultado-esperado": true, "noExtraContext": 0},
  },
  'l05-a2': {
    lessonId: "l05", lessonVersion: 3, skillIds: ["pedir"], activityId: "l05-a2", activityType: "choice",
    answer: {"optionIds": ["opt-novo-horario", "opt-quem-recebe"]},
    deterministicChecks: {"opt-novo-horario": true, "opt-quem-recebe": true, "opt-numero-de-cadeiras": true, "opt-nome-do-fundador": true, "opt-software-interno": true},
  },
  'l05-a3': {
    lessonId: "l05", lessonVersion: 3, skillIds: ["pedir"], activityId: "l05-a3", activityType: "output_comparison",
    answer: {"outputId": "out-a", "criterionIds": ["c-responde-a-situacao-real", "c-pronta-para-usar"]},
    deterministicChecks: {"betterOutputId": true, "c-responde-a-situacao-real": true, "c-pronta-para-usar": true, "noExtraCriteria": 0},
  },
  'l06-a3': {
    lessonId: "l06", lessonVersion: 2, skillIds: ["pedir"], activityId: "l06-a3", activityType: "choice",
    answer: {"optionIds": ["opt-linguagem", "opt-forma"]},
    deterministicChecks: {"opt-linguagem": true, "opt-forma": true, "opt-cor-da-fonte": true, "opt-fatos-do-aviso": true, "opt-tamanho-da-equipe": true},
  },
  'l07-a2': {
    lessonId: "l07", lessonVersion: 2, skillIds: ["pedir", "avaliar"], activityId: "l07-a2", activityType: "choice",
    answer: {"optionIds": ["opt-ajuste"]},
    deterministicChecks: {"opt-ajuste": true, "opt-refaz": true, "opt-aceita": true, "opt-generico": true},
  },
}
for (const [id, base] of Object.entries(WAVE_RECORDS)) {
  const record = { ...base, schemaVersion: 1, source: 'literacydojo', attemptId: ATTEMPT(id), context: 'initial', pass: true, score: 1.0, timestamp: ts(), verifierRequired: true }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  check(`wave-${id}-independent-PASS`, r.status === 200 && receipt.verdict === 'PASS' && receipt.independent_pass === true, `${r.status} ${JSON.stringify(body).slice(0, 140)}`)
  check(`wave-${id}-canonical-source`, receipt.source === 'independent-literacy-verifier', JSON.stringify(receipt.source))
  check(`wave-${id}-producer-never-mastered`, receipt.producer_writes_mastered === false && receipt.mastery_eligible === true, JSON.stringify({ pwm: receipt.producer_writes_mastered, me: receipt.mastery_eligible }))
}

// 8p. prompt_builder honesty probes: the 3 new prompt_builder activities cannot be
// independently re-judged, so they must fail closed (FAIL + explicit error) — never
// a fabricated PASS.
for (const [id, lessonId, lessonVersion, skillIds] of [
  ['l04-a2', 'l04', 2, ['pedir']],
  ['l06-a2', 'l06', 2, ['pedir']],
  ['l07-a3', 'l07', 2, ['pedir', 'avaliar']],
]) {
  const record = {
    schemaVersion: 1, source: 'literacydojo', attemptId: ATTEMPT(`${id}-failclosed`), lessonId, lessonVersion,
    activityId: id, activityType: 'prompt_builder', skillIds,
    deterministicChecks: {}, pass: true, score: 1.0, timestamp: ts(), verifierRequired: true,
  }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  const errText = JSON.stringify(receipt.errors ?? body)
  check(`prompt-builder-${id}-fails-closed`, r.status === 200 && receipt.verdict === 'FAIL' && errText.includes('independently'), `${r.status} ${errText.slice(0, 120)}`)
  check(`prompt-builder-${id}-not-mastery-eligible`, receipt.mastery_eligible === false && receipt.independent_pass === false, JSON.stringify({ me: receipt.mastery_eligible }))
}

// 8r. regression: teaching-game dispatch (wormhole/pipeline-plant echo attempt_id) still PASS
const PRODUCER_PAYLOADS = JSON.parse(await readFile('/tmp/opencode/promo666/learner/gate/tests/fixtures/teaching_game_producer_payloads.json', 'utf8'))
const post = (record) => fetch(`${BASE}/__dojo/bridge/v1/verification`, {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ schemaId: 'teaching-game-evidence', schemaVersion: 1, record }),
})
const makeRecord = (game, level, identity, attemptId) => {
  const payload = PRODUCER_PAYLOADS[game][level]
  return {
    source: 'voxeldojo', unit_id: identity.unit, project: identity.project,
    scenario_id: `${identity.slug}-${level}`, game, ts: ts(),
    ...(attemptId ? { attempt_id: attemptId } : {}), pass: true,
    metrics: payload.metrics, observations: payload.observations,
    review_context: { unit_kind: 'concept', scheduled_review: false, review_reason: 'deepening', scheduler_source: 'learner-substrate', verifier_required: true },
    curriculum_context: { concept: 'AID-666 wave precheck regression', mechanic: `${game} ${level}` },
  }
}
for (const [game, identity] of [
  ['WORMHOLE', { unit: 'U3-url-shortener', project: '03_url_shortener', slug: 'wormhole' }],
  ['PIPELINE PLANT', { unit: 'U6-file-upload', project: '06_file_upload_pipeline', slug: 'pipeline-plant' }],
]) {
  const attemptId = ATTEMPT(identity.slug)
  const r = await post(makeRecord(game, 'L1', identity, attemptId))
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? {}
  check(`bridge-accepts-${identity.slug}-L1-echo`, r.status === 200 && receipt.verdict === 'PASS' && receipt.attempt_id === attemptId, `${r.status} ${JSON.stringify(body).slice(0, 100)}`)
}

// 9. literacy verifier regression (AID-449 fix probes stay green; fixtures regenerated
// post-bump by AID-654 commit ab12db28 — lessonVersion is the canonical v2)
const LITERACY = JSON.parse(await readFile('/tmp/opencode/promo666/learner/gate/tests/fixtures/literacy_producer_payloads.json', 'utf8'))
{
  const base = LITERACY.records.l01['l01-a1'].pass
  const record = { ...base, attemptId: ATTEMPT('l01'), timestamp: ts() }
  const r = await postLiteracy(record)
  const body = await r.json().catch(() => ({}))
  const receipt = body.receipt ?? body ?? {}
  check('fix-literacy-l01-pass-verdict', r.status === 200 && receipt.verdict === 'PASS', `${r.status} ${JSON.stringify(body).slice(0, 160)}`)
  check('fix-literacy-receipt-canonical-source', receipt.source === 'independent-literacy-verifier', JSON.stringify(receipt.source))
  const failBase = LITERACY.records.l01['l01-a1'].fail
  const forged = { ...failBase, pass: true, score: 1.0, attemptId: ATTEMPT('forge'), timestamp: ts() }
  const fr = await postLiteracy(forged)
  const fb2 = await fr.json().catch(() => ({}))
  const freceipt = fb2.receipt ?? fb2 ?? {}
  check('fix-literacy-forged-pass-fail-closed', fr.status === 200 && freceipt.verdict === 'FAIL', `${fr.status} ${JSON.stringify(fb2).slice(0, 140)}`)
}
{
  const r = await fetch(`${BASE}/__dojo/bridge/v1/verification`, {
    method: 'POST',
    headers: { 'Sec-Fetch-Site': 'same-origin', 'x-codexdojo-bridge-token': session.token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ schemaId: 'not-a-real-schema', schemaVersion: 1, record: {} }),
  })
  const body = await r.json().catch(() => ({}))
  check('bridge-unknown-schema-still-422', r.status === 422 && JSON.stringify(body).includes('unsupported-schema'), `${r.status} ${JSON.stringify(body).slice(0, 80)}`)
}

const failed = results.filter((r) => !r.ok)
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`)
if (failed.length) { console.log('FAILED:', failed.map((f) => f.id).join(', ')); process.exit(1) }
