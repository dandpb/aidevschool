import fs from 'node:fs/promises'
import path from 'node:path'
import { expect, answer, completeLesson, seedLesson, readProgress } from './learning-runtime-support.mjs'

export async function supplementaryLiteracy({ page, content, retryTypes, capture, add, directory, literacyUrl }) {
  const selection = await page.evaluate(async () => (await import('/src/domain/checkpoints.ts')).CHECKPOINT_SELECTION)
  for (const [index, checkpoint] of selection.entries()) {
    try {
      await page.goto(literacyUrl)
      await page.evaluate(async ({ checkpoint, index }) => {
        const { createInitialProgress } = await import('/src/domain/progress.ts')
        const { modules, contentVersion } = await import('/src/data/generated/lessons.ts')
        const selected = modules.filter((m) => m.journey === 'ia_pratica')
        const progress = createInitialProgress(selected, contentVersion)
        progress.onboarding = { ...progress.onboarding, completed: true, route: 'guided' }
        for (const m of selected.filter((m) => m.order <= index + 1)) {
          for (const l of m.lessons.filter((l) => l.status === 'ready' && l.hasContent)) progress.lessonStatus[l.id] = 'completed'
          if (m.id !== checkpoint.moduleId) progress.moduleCheckpoints[m.id] = { status: 'completed', bestScore: 1, attempts: 1, completedAt: new Date().toISOString() }
        }
        progress.currentLessonId = checkpoint.activityRefs.at(-1).lessonId
        await new Promise((resolve, reject) => {
          const request = indexedDB.open('literacydojo')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const db = request.result, tx = db.transaction('progress', 'readwrite')
            tx.objectStore('progress').put(progress, 'learner-progress')
            tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => reject(tx.error)
          }
        })
      }, { checkpoint, index })
      await page.reload()
      await expect(page.getByTestId('checkpoint-mission')).toBeVisible()
      await page.getByTestId('continue-button').click(); await page.getByTestId('start-checkpoint').click()
      const activities = checkpoint.activityRefs.map((r) => content.lessons.find((l) => l.id === r.lessonId).activities.find((a) => a.id === r.activityId))
      for (const [position, activity] of activities.entries()) {
        if (position > 0) await page.getByTestId('next-activity').click()
        if (index === 0 && position === 0) {
          await answer(page, activity, true); await page.getByTestId('submit-attempt').click()
          await expect(page.getByTestId('feedback-panel')).toHaveClass(/feedback-fail/)
          await page.getByTestId('hint-button').click()
          await expect(page.getByTestId('hints-list')).toBeVisible()
          await page.getByTestId('retry-activity').click()
        }
        await answer(page, activity); await page.getByTestId('submit-attempt').click()
        await expect(page.getByTestId('feedback-panel')).toHaveClass(/feedback-pass/)
      }
      await page.getByTestId('finish-checkpoint').click()
      await expect(page.getByTestId('checkpoint-result')).toBeVisible()
      const progress = await readProgress(page)
      await expect(progress.moduleCheckpoints[checkpoint.moduleId].status).toBe('completed')
      const evidence = await page.evaluate(() => JSON.parse(sessionStorage.getItem('literacydojo:evidence') ?? '[]'))
      await fs.writeFile(path.join(directory, `${checkpoint.id}.json`), JSON.stringify({ checkpoint, evidence, progress }, null, 2))
      await add({ id: checkpoint.id, status: 'pass', activities: activities.map((a) => a.id), artifact: await capture(checkpoint.id), fixture: 'Completed prior lessons/checkpoints seeded only to enable challenge access; challenge answers and outcome came from actual UI.' })
    } catch (error) { await add({ id: checkpoint.id, status: 'blocked', error: String(error), artifact: await capture(`failure-${checkpoint.id}`) }) }
  }
  try {
    await page.goto(literacyUrl); await seedLesson(page, 'l02')
    const lesson = content.lessons.find((l) => l.id === 'l02')
    await completeLesson(page, lesson, { retryTypes, capture })
    await page.getByTestId('go-home').click()
    const stages = []
    for (const expectedDays of [7, 21]) {
      await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
          const request = indexedDB.open('literacydojo')
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const db = request.result, tx = db.transaction('progress', 'readwrite'), store = tx.objectStore('progress')
            const read = store.get('learner-progress')
            read.onsuccess = () => {
              const progress = read.result
              for (const skill of Object.values(progress.skills)) skill.nextReviewAt = new Date(Date.now() - 86400000).toISOString()
              store.put(progress, 'learner-progress')
            }
            tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => reject(tx.error)
          }
        })
      })
      await page.reload()
      await expect(page.getByTestId('review-button')).toBeVisible()
      await page.getByTestId('review-button').click()
      await expect(page.getByTestId('lesson-intro')).toContainText('Revisão')
      await completeLesson(page, lesson, { retryTypes, capture })
      const progress = await readProgress(page)
      const days = (Date.parse(progress.skills.entender.nextReviewAt) - Date.now()) / 86400000
      await expect(days).toBeGreaterThan(expectedDays - 0.5)
      await expect(days).toBeLessThan(expectedDays + 0.5)
      stages.push({ expectedDays, observedDays: days, progress })
      await page.getByTestId('go-home').click()
    }
    await fs.writeFile(path.join(directory, 'reviews.json'), JSON.stringify(stages, null, 2))
    await add({ id: 'reviews-due-retry-return', status: 'pass', stages: stages.map(({ expectedDays, observedDays }) => ({ expectedDays, observedDays })), artifact: await capture('reviews-return'), fixture: 'Only nextReviewAt was backdated in private browser to exercise scheduling without waiting wall-clock days.' })
  } catch (error) { await add({ id: 'reviews-due-retry-return', status: 'blocked', error: String(error), artifact: await capture('failure-review') }) }
}
