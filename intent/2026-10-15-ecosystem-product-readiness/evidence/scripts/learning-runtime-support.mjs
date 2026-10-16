import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { pathToFileURL } from 'node:url'

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..')
const require = createRequire(path.join(root, 'engines/literacyDojo/package.json'))
export const { chromium, expect } = require('@playwright/test')
const ts = require('typescript')
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
export async function dataModule(relative) {
  const code = ts.transpileModule(await fs.readFile(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
}
export async function port() {
  const server = net.createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const selected = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return selected
}
export async function startVite(engine, directory, env = {}, selectedPort) {
  const selected = selectedPort ?? await port()
  const cwd = path.join(root, 'engines', engine)
  const vite = path.join(path.dirname(createRequire(path.join(cwd, 'package.json')).resolve('vite/package.json')), 'bin/vite.js')
  const argv = [vite, '--host', '127.0.0.1', '--port', `${selected}`, '--strictPort']
  const log = await fs.open(path.join(directory, `${engine.replaceAll('/', '-')}-${selected}.log`), 'w')
  const child = spawn(process.execPath, argv, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', log.fd, log.fd], detached: true })
  let spawnError
  const exited = new Promise((resolve) => {
    child.once('exit', resolve)
    child.once('error', (error) => { spawnError = error; resolve() })
  })
  let closing
  const stop = () => {
    closing ??= (async () => {
      try {
        if (child.pid && child.exitCode === null && child.signalCode === null) {
          try { process.kill(-child.pid, 'SIGTERM') } catch (error) { if (error.code !== 'ESRCH') throw error }
          await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))])
          if (child.exitCode === null && child.signalCode === null) {
            try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if (error.code !== 'ESRCH') throw error }
            await exited
          }
        }
      } finally { await log.close() }
    })()
    return closing
  }
  const url = `http://127.0.0.1:${selected}`
  try {
    await fs.writeFile(path.join(directory, `${engine.replaceAll('/', '-')}-${selected}.process.json`), JSON.stringify({ pid: child.pid, cwd, argv: [process.execPath, ...argv], startedAt: new Date().toISOString(), port: selected }, null, 2))
    let ready = false
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (spawnError) throw spawnError
      if (child.exitCode !== null) throw new Error(`Vite ${engine} exited ${child.exitCode}`)
      try { ready = (await fetch(url)).ok } catch {}
      if (ready) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    if (!ready) throw new Error(`Vite ${engine} did not become ready`)
    return { child, url, cwd, argv: [process.execPath, ...argv], log, stop }
  } catch (error) {
    await stop()
    throw error
  }
}
export async function readProgress(page, kind = 'literacy') {
  return page.evaluate(({ dbName, store, key }) => new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const read = database.transaction(store).objectStore(store).get(key)
      read.onerror = () => reject(read.error)
      read.onsuccess = () => { database.close(); resolve(read.result) }
    }
  }), kind === 'os' ? { dbName: 'codexdojo-os', store: 'progress', key: 'os-progress' } : { dbName: 'literacydojo', store: 'progress', key: 'learner-progress' })
}
export async function seedLesson(page, lessonId) {
  await page.evaluate(async (id) => {
    const { createInitialProgress } = await import('/src/domain/progress.ts')
    const { modules, contentVersion } = await import('/src/data/generated/lessons.ts')
    const progress = createInitialProgress(modules.filter((m) => m.journey === 'ia_pratica'), contentVersion)
    progress.onboarding = { ...progress.onboarding, completed: true, route: 'guided' }
    progress.lessonStatus[id] = 'in_progress'
    progress.currentLessonId = id
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('literacydojo')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const transaction = db.transaction('progress', 'readwrite')
        transaction.objectStore('progress').put(progress, 'learner-progress')
        transaction.oncomplete = () => { db.close(); resolve() }
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, lessonId)
  await page.reload()
}
async function select(target, id) {
  const input = target.getByTestId(id)
  const label = input.locator('xpath=ancestor::label[1]')
  await expect(async () => {
    if (!(await input.isChecked())) await label.click()
    await expect(input).toBeChecked({ timeout: 1000 })
  }).toPass({ timeout: 10000 })
}
export async function answer(target, activity, wrong = false) {
  const e = activity.evaluation
  if (activity.type === 'choice') {
    const chosen = wrong ? [activity.data.options.find((o) => !e.correctOptionIds.includes(o.id))?.id] : e.correctOptionIds
    if (!chosen[0]) return false
    for (const id of chosen) await select(target, `option-${id}`)
  } else if (activity.type === 'output_comparison') {
    const chosen = wrong ? activity.data.outputs.find((o) => o.id !== e.betterOutputId)?.id : e.betterOutputId
    await select(target, `output-${chosen}`)
    for (const id of e.requiredCriterionIds) await select(target, `criterion-${id}`)
  } else if (activity.type === 'prompt_builder') {
    for (const f of activity.data.fields) {
      const rule = e.fields[f.id] ?? {}
      let value = wrong ? 'x' : `${rule.mustIncludeAny?.[0] ?? f.hint} com contexto do público e do formato desejado para o trabalho`
      while (!wrong && value.length < (rule.minLength ?? 0)) value += ' detalhado'
      await target.getByTestId(`field-${f.id}`).fill(value.slice(0, rule.maxLength))
    }
  } else if (activity.type === 'missing_context') {
    const ids = wrong ? [activity.data.contextOptions.find((o) => !e.requiredContextIds.includes(o.id))?.id] : e.requiredContextIds
    if (!ids[0]) return false
    for (const id of ids) await select(target, `context-${id}`)
  } else if (activity.type === 'rubric_review') {
    for (const criterion of activity.data.criteria) {
      const value = e.expectedVerdicts[criterion.id]
      await select(target, `rubric-${criterion.id}-${wrong ? (value === 'met' ? 'not_met' : 'met') : value}`)
    }
  } else if (activity.type === 'safety_classification') {
    for (const item of activity.data.items) {
      const value = e.classification[item.id]
      const different = Object.keys(activity.data.labels).find((label) => label !== value)
      await select(target, `item-${item.id}-${wrong ? different : value}`)
    }
  } else if (activity.type === 'sort') {
    const order = activity.data.items.map((item) => item.id)
    if (wrong) {
      if (JSON.stringify(order) === JSON.stringify(e.expectedOrder)) await target.getByTestId(`sort-up-${order.at(-1)}`).click()
    } else for (const [i, id] of e.expectedOrder.entries()) {
      let current = order.indexOf(id)
      while (current > i) { await target.getByTestId(`sort-up-${id}`).click(); order.splice(current - 1, 0, order.splice(current, 1)[0]); current -= 1 }
    }
  } else throw new Error(`Unsupported activity type ${activity.type}`)
  return true
}
export async function completeLesson(target, lesson, { retryTypes = new Set(), capture = async () => {} } = {}) {
  await expect(target.getByTestId('start-lesson')).toBeVisible({ timeout: 25000 })
  await target.getByTestId('start-lesson').click()
  const outcomes = []
  for (const [index, activity] of lesson.activities.entries()) {
    if (index > 0) await target.getByTestId('next-activity').click()
    if (!retryTypes.has(activity.type)) {
      const canAnswerWrong = await answer(target, activity, true)
      if (canAnswerWrong) {
        await target.getByTestId('submit-attempt').click()
        await expect(target.getByTestId('feedback-panel')).toHaveClass(/feedback-fail/)
        await capture(`${lesson.id}-${activity.type}-retry`)
        await target.getByTestId('retry-activity').click()
        retryTypes.add(activity.type)
      }
    }
    await answer(target, activity)
    await target.getByTestId('submit-attempt').click()
    await expect(target.getByTestId('feedback-panel')).toHaveClass(/feedback-pass/)
    outcomes.push({ activityId: activity.id, type: activity.type, status: 'pass' })
  }
  await target.getByTestId('finish-lesson').click()
  return outcomes
}
export async function refsIn(directory) {
  const rows = []
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name)
    if (item.isDirectory()) rows.push(...await refsIn(file))
    else { const bytes = await fs.readFile(file); rows.push({ path: path.relative(root, file), sha256: digest(bytes), bytes: bytes.length }) }
  }
  return rows
}
export const moduleUrl = (relative) => pathToFileURL(path.join(root, relative)).href
