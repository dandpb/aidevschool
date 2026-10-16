import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { root, chromium, expect, digest, dataModule, startVite, port, seedLesson, readProgress, completeLesson, answer, refsIn } from './learning-runtime-support.mjs'
import { supplementaryLiteracy } from './learning-runtime-literacy.mjs'

const task = 'intent/2026-10-15-ecosystem-product-readiness'
const hooks = { 2: '__warehouse', 3: '__wormhole', 5: '__relayStation', 6: '__pipelinePlant', 7: '__checkpointCity', 8: '__timelineTower', 9: '__dockingBay' }
async function canonicalHashes() {
  const files = ['learner/learning_state.yaml', 'learner/pipeline_status.yaml', 'learner/profile.yaml', 'learner/journal.md']
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, await fs.readFile(path.join(root, file)).then(digest).catch(() => null)])))
}
async function gameMission(frame, number) {
  await expect.poll(() => frame.evaluate((hook) => window[hook]?.game.snapshot.phase, hooks[number])).not.toBeUndefined({ timeout: 20000 })
  if (await frame.getByTestId('start').isVisible()) await frame.getByTestId('start').click()
  for (let step = 0; step < 50; step += 1) {
    const actions = await frame.evaluate(({ number, hook, step }) => {
      const g = window[hook].game, s = g.snapshot
      if (s.phase === 'cleared') return []
      if (s.phase === 'failed') throw new Error('game failed')
      if (number === 2) return [{ id: `shelf-${g.shelfOfKey(s.keys[s.pendingIndex])}` }]
      if (number === 3) return [{ id: 'code-input', value: g.predictedCodeForPending() }, { id: 'submit-code' }]
      if (number === 5) return step === 0 ? [...g.truthConnected().map((id) => ({ id: `station-${id}` })), { id: 'submit' }] : []
      if (number === 6) return [{ id: `predict-overflow-${g.bufferedOverflows() ? 'yes' : 'no'}` }]
      if (number === 7) return [{ id: `predict-${g.pendingAnswer()}` }]
      if (number === 8) return [{ id: `append-${g.nextCorrectEventType()}` }]
      if (number === 9) return step === 0 ? s.pods.map((p) => ({ id: `dock-${g.podWouldDock(p) ? 'yes' : 'no'}-${p.id}` })) : []
      return []
    }, { number, hook: hooks[number], step })
    if (actions.length === 0) break
    for (const action of actions) {
      if (action.value !== undefined) await frame.getByTestId(action.id).fill(action.value)
      else await frame.getByTestId(action.id).click()
    }
  }
  return frame.evaluate((hook) => ({ phase: window[hook].game.snapshot.phase, evidence: window.__voxelDojoEvidence ?? [] }), hooks[number])
}
export async function run(engineId, caseName = 'declared-use', options = {}) {
  if (!['literacyDojo', 'codexdojo-os-prototype'].includes(engineId) || caseName !== 'declared-use') throw new Error(`Unsupported observation ${engineId}/${caseName}`)
  const id = new Date().toISOString().replaceAll(':', '-')
  const directory = path.join(root, '.scratch/readiness-implementation-20261015/qa-learning', `${engineId}-${id}`)
  const media = path.join(root, 'engines', engineId, 'test-results/readiness-learning-runtime', id)
  await fs.mkdir(directory, { recursive: true }); await fs.mkdir(media, { recursive: true })
  const sourceCommit = execFileSync('rtk', ['proxy', 'git', 'rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const catalog = await dataModule('engines/codexdojo-os-prototype/src/data/missions.ts')
  const content = await dataModule('engines/literacyDojo/src/data/generated/lessons.ts')
  const sourcePaths = ['engines/codexdojo-os-prototype/src/data/missions.ts', 'engines/literacyDojo/src/data/generated/lessons.ts', `${task}/evidence/scripts/learning-runtime.mjs`, `${task}/evidence/scripts/learning-runtime-support.mjs`, `${task}/evidence/scripts/learning-runtime-literacy.mjs`]
  const sourceFiles = await Promise.all(sourcePaths.map(async (p) => ({ path: p, sha256: digest(await fs.readFile(path.join(root, p))) })))
  const report = { engineId, caseName, sourceCommit, sourceFingerprint: digest(JSON.stringify(sourceFiles)), sourceFiles, observedAt: new Date().toISOString(), producerContext: 'readiness-qa-learning-runtime-agent', verifierContext: null, originEngineProducer: 'repository-source', cwd: root, argv: [process.execPath, ...process.argv.slice(1)], status: 'unverified', cases: [], inventory: {}, evidenceRefs: [], limitations: ['Real DOM interactions driven by read-only canonical answer data are functional observations, not a pedagogical or semantic judgment.', 'TypeSafe/Jev semantic verification and fresh whole-feature verifier remain pending.', 'Local Vite origins only; no deployed claim.'], canonicalBefore: await canonicalHashes(), cleanup: { complete: false }, runtime: [] }
  const save = async () => fs.writeFile(path.join(directory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  const add = async (entry) => { report.cases.push(entry); await save(); process.stdout.write(`${engineId} ${entry.id}: ${entry.status}\n`) }
  const servers = []; let browser; let context; let page; let interrupted = false
  const stop = () => { interrupted = true; void context?.close().catch(() => {}) }
  process.once('SIGTERM', stop); process.once('SIGINT', stop)
  const capture = async (name) => { const p = path.join(media, `${name}.png`); await page.screenshot({ path: p, fullPage: false }); return path.relative(root, p) }
  const retryTypes = new Set()
  try {
    browser = await chromium.launch({ headless: true })
    context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', recordVideo: { dir: media, size: { width: 1280, height: 800 } } })
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
    page = await context.newPage(); page.setDefaultTimeout(15000)
    const literacy = await startVite('literacyDojo', directory); servers.push(literacy)
    if (engineId === 'literacyDojo') {
      const offered = content.modules.filter((m) => m.journey === 'ia_pratica').flatMap((m) => m.lessons).filter((l) => l.status === 'ready' && l.hasContent).map((l) => l.id)
      await expect(offered).toHaveLength(23)
      // Catalog ready entries are enumerated before any runtime outcomes are added.
      report.inventory = { standalone: offered, devCtaLessons: content.modules.filter((m) => m.journey === 'dev').flatMap((m) => m.lessons).map((l) => l.id), source: 'src/data/generated/lessons.ts modules.journey/availability' }
      await page.goto(literacy.url)
      await expect(page.getByTestId('assistant-welcome')).toBeVisible()
      const devHref = await page.getByTestId('dev-track-teaser').getAttribute('href')
      await expect(page.getByTestId('dev-track-teaser')).toContainText('Abrir no OS')
      await add({ id: 'fresh-storage-dev-cta', status: 'pass', devHref, artifact: await capture('fresh-storage') })
      await page.getByTestId('onboarding-next').click()
      for (const id of ['save_time', 'work', 'medium', 'scheduling']) {
        await page.getByTestId(`onboarding-option-${id}`).check()
        await page.getByTestId('onboarding-next').click()
      }
      await expect(page.getByTestId('map-screen')).toBeVisible()
      await page.getByTestId('map-start-l02').click()
      const initialActivities = await completeLesson(page, content.lessons.find((l) => l.id === 'l02'), { retryTypes, capture })
      await expect(page.getByTestId('result-screen')).toBeVisible()
      await add({ id: 'continuous-onboarding-map-initial-result', status: 'pass', activities: initialActivities, artifact: await capture('continuous-onboarding') })
      for (const id of offered) {
        const lesson = content.lessons.find((l) => l.id === id)
        try {
          await page.goto(literacy.url); await seedLesson(page, id)
          const before = await readProgress(page)
          const activities = await completeLesson(page, lesson, { retryTypes, capture })
          await expect(page.getByTestId('result-screen')).toBeVisible()
          const evidence = await page.evaluate(() => JSON.parse(sessionStorage.getItem('literacydojo:evidence') ?? '[]'))
          const progress = await readProgress(page)
          await expect(progress.lessonStatus[id]).toBe('completed')
          await fs.writeFile(path.join(directory, `${id}.json`), JSON.stringify({ precondition: 'Explicit browser-only fixture: fresh initial progress, onboarding completed, target in_progress. No completion seeded for target.', before, activities, evidence, progress }, null, 2))
          await add({ id: `lesson-${id}`, status: 'pass', activities, evidenceRecords: evidence.length, artifact: await capture(`result-${id}`), fixture: 'Access prerequisite only; target completion came from UI interactions.' })
        } catch (error) { await add({ id: `lesson-${id}`, status: 'blocked', error: String(error), artifact: await capture(`failure-${id}`) }) }
      }
      // Reload uses the same local profile but deliberately discards a transient answer.
      await page.goto(literacy.url); await seedLesson(page, 'l02')
      await page.getByTestId('start-lesson').click()
      await answer(page, content.lessons.find((l) => l.id === 'l02').activities[0])
      await page.reload()
      await expect(page.getByTestId('lesson-intro')).toBeVisible()
      await page.getByTestId('start-lesson').click()
      await expect(page.getByTestId('output-out-a')).not.toBeChecked()
      await expect(page.getByTestId('output-out-b')).not.toBeChecked()
      await add({ id: 'reload-discards-transient-answers', status: 'pass', artifact: await capture('reload-restarts') })
      await supplementaryLiteracy({ page, content, retryTypes, capture, add, directory, literacyUrl: literacy.url })
    } else {
      const env = { VITE_LITERACYDOJO_URL: literacy.url, VITE_LOCAL_ENGINE_BRIDGE: 'true' }
      for (const mission of catalog.missionCatalog.missions.filter((m) => m.runtime.engineId === 'voxelDojo')) env[mission.runtime.environmentKey] = `http://127.0.0.1:${await port()}`
      const os = await startVite(engineId, directory, env); servers.push(os)
      report.inventory = { missions: catalog.missionCatalog.missions.map((m) => ({ id: m.id, trackId: m.trackId, runtime: m.runtime.engineId })), note: '39 mission catalog entries; each outcome below is a separately observed mission. Engine Hub registry and 16-game bundle are different sets.' }
      await page.goto(os.url)
      await expect(page.getByRole('button', { name: 'Entrar na escola' })).toBeVisible()
      await page.getByRole('button', { name: 'Entrar na escola' }).click()
      await expect(page).toHaveURL(/\/hub$/)
      await add({ id: 'fresh-storage-onboarding', status: 'pass', artifact: await capture('onboarding-hub') })
      const missions = [...catalog.missionCatalog.missions].sort((a, b) => a.runtime.engineId.localeCompare(b.runtime.engineId) || a.chapterOrder - b.chapterOrder)
      for (const mission of missions) {
        let gameServer
        try {
          if (interrupted) throw new Error('Observation interrupted by owner')
          if (mission.runtime.engineId === 'voxelDojo') {
            gameServer = await startVite(`voxelDojo/${mission.id}`, directory, {}, Number(new URL(env[mission.runtime.environmentKey]).port))
            servers.push(gameServer)
          }
          await page.goto(`${os.url}/mission/${mission.trackId}/${mission.id}`)
          await expect(page.locator('.mission-runtime iframe')).toBeVisible()
          const frame = page.frameLocator('.mission-runtime iframe')
          let outcome
          if (mission.runtime.engineId === 'literacyDojo') {
            const lesson = content.lessons.find((l) => l.id === mission.id)
            outcome = { activities: await completeLesson(frame, lesson, { retryTypes, capture }) }
          } else {
            await expect.poll(() => page.frames().some((f) => f.url().startsWith(env[mission.runtime.environmentKey]))).toBe(true)
            const actual = page.frames().find((f) => f.url().startsWith(env[mission.runtime.environmentKey]))
            outcome = await gameMission(actual, Number(mission.id.slice(5, 7)))
            await expect(outcome.phase).toBe('cleared')
          }
          await expect(page.getByRole('button', { name: 'Voltar ao hub', exact: true })).toBeEnabled({ timeout: 25000 })
          const artifact = await capture(`result-${mission.id}`)
          await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click()
          const progress = await readProgress(page, 'os')
          await expect(progress.missionStatusByKey[`${mission.trackId}:${mission.id}`]).toBe('completed')
          await fs.writeFile(path.join(directory, `${mission.trackId}-${mission.id}.json`), JSON.stringify({ outcome, progress }, null, 2))
          await add({ id: `mission-${mission.trackId}-${mission.id}`, status: 'pass', outcome, artifact, entry: `/mission/${mission.trackId}/${mission.id}`, prerequisite: 'Public direct mission route; no completion or OS status seeded.' })
        } catch (error) {
          await add({ id: `mission-${mission.trackId}-${mission.id}`, status: interrupted ? 'unverified' : 'blocked', error: String(error), artifact: await capture(`failure-${mission.id}`).catch(() => null) })
          if (interrupted) break
        } finally { if (gameServer) await gameServer.stop() }
      }
      const beforeReload = await readProgress(page, 'os')
      await page.reload()
      const afterReload = await readProgress(page, 'os')
      await expect(afterReload.missionStatusByKey).toEqual(beforeReload.missionStatusByKey)
      await add({ id: 'same-profile-return', status: 'pass', artifact: await capture('return-preserved') })
      report.limitations.push('Engine Hub adapter interactions and host/verifier interruption recovery remain explicit gaps until separately observed; mission list alone does not close these.')
    }
    report.retryTypesObserved = [...retryTypes]
  } catch (error) {
    await add({ id: 'runtime-supervision', status: interrupted ? 'unverified' : 'blocked', error: String(error), artifact: page ? await capture('failure-supervision').catch(() => null) : null })
  } finally {
    if (context) {
      await context.tracing.stop({ path: path.join(media, 'trace.zip') }).catch(() => {})
      await context.close().catch(() => {})
    }
    if (browser) await browser.close().catch(() => {})
    for (const server of servers.reverse()) { await server.stop(); report.runtime.push({ url: server.url, cwd: server.cwd, argv: server.argv, pid: server.child.pid, exitCode: server.child.exitCode }) }
    report.canonicalAfter = await canonicalHashes()
    report.canonicalUnchanged = JSON.stringify(report.canonicalBefore) === JSON.stringify(report.canonicalAfter)
    if (!report.canonicalUnchanged) report.cases.push({ id: 'canonical-state-unchanged', status: 'blocked' })
    report.status = report.cases.some((c) => c.status === 'blocked') ? 'blocked' : 'unverified'
    report.cleanup = { complete: true, ownedServersStopped: true, browserClosed: true }
    report.interrupted = interrupted
    report.evidenceRefs = await refsIn(media)
    for (const item of await refsIn(directory)) if (!item.path.endsWith('report.json')) report.evidenceRefs.push(item)
    await save()
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop)
  }
  return { status: report.status, reportPath: path.relative(root, path.join(directory, 'report.json')), sha256: digest(await fs.readFile(path.join(directory, 'report.json'))) }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await run(process.argv[2], process.argv[3] ?? 'declared-use')
  process.stdout.write(`${JSON.stringify(result)}\n`)
  process.exitCode = result.status === 'pass' ? 0 : result.status === 'blocked' ? 1 : 2
}
