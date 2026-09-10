import { expect, type FrameLocator, type Page } from '@playwright/test'
import { lessons } from '../../../literacyDojo/src/data/generated/lessons'

const chapterLessons = new Map(
  lessons.filter((lesson) => ['l01', 'l02', 'l03', 'l15', 'l16', 'l18', 'l19', 'l20', 'l21', 'l22', 'l23', 'l24', 'l25', 'l26', 'l27', 'l28', 'l29'].includes(lesson.id)).map((lesson) => [lesson.id, lesson]),
)

export type ChapterLessonId = 'l01' | 'l02' | 'l03' | 'l15' | 'l16' | 'l18' | 'l19' | 'l20' | 'l21' | 'l22' | 'l23' | 'l24' | 'l25' | 'l26' | 'l27' | 'l28' | 'l29'

// AID-571 (#227): the literacy option cards render
// `<label class="option-card"><input/><span>…</span></label>` with a hover
// transform transition, so `check()` on the 20px input under the text span can
// have its click swallowed by a re-render ("Clicking the checkbox did not
// change its state"). A learner clicks the card, so we click the label and
// assert the end state retryably; the isChecked() guard keeps re-clicks
// idempotent for checkboxes (radios cannot toggle off via their label).
async function checkControl(mission: FrameLocator, testId: string) {
  const input = mission.getByTestId(testId)
  const card = input.locator('xpath=ancestor::label[1]')
  await expect(async () => {
    if (!(await input.isChecked())) {
      await card.click()
    }
    await expect(input).toBeChecked({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
}

export async function completeLiteracyMission(
  page: Page,
  lessonId: ChapterLessonId,
  options: { readonly returnToHub?: boolean } = {},
) {
  const lesson = chapterLessons.get(lessonId)
  if (lesson === undefined) throw new Error(`Missing generated lesson ${lessonId}`)
  const mission = page.frameLocator('.mission-runtime iframe')
  await mission.getByTestId('start-lesson').click()
  for (const [index, activity] of lesson.activities.entries()) {
    if (activity.type === 'choice') {
      for (const optionId of activity.evaluation.correctOptionIds) {
        await checkControl(mission, `option-${optionId}`)
      }
    } else if (activity.type === 'output_comparison') {
      await checkControl(mission, `output-${activity.evaluation.betterOutputId}`)
      for (const criterionId of activity.evaluation.requiredCriterionIds) {
        await checkControl(mission, `criterion-${criterionId}`)
      }
    } else if (activity.type === 'prompt_builder') {
      for (const field of activity.data.fields) {
        const rule = activity.evaluation.fields[field.id]
        if (rule === undefined) throw new Error(`Missing evaluation rule for field ${field.id}`)
        const word = rule.mustIncludeAny?.[0]
        if (word === undefined) throw new Error(`Missing mustIncludeAny for field ${field.id}`)
        const filler = rule.minLength === undefined ? word : word.repeat(Math.ceil(rule.minLength / word.length) + 1)
        await mission.getByTestId(`field-${field.id}`).fill(filler)
      }
    } else if (activity.type === 'missing_context') {
      for (const contextId of activity.evaluation.requiredContextIds) {
        await checkControl(mission, `context-${contextId}`)
      }
    } else if (activity.type === 'sort') {
      const order = activity.data.items.map((item) => item.id)
      for (const [target, expectedId] of activity.evaluation.expectedOrder.entries()) {
        const presses = order.indexOf(expectedId) - target
        const direction = presses >= 0 ? 'up' : 'down'
        for (let press = 0; press < Math.abs(presses); press += 1) {
          await mission.getByTestId(`sort-${direction}-${expectedId}`).click()
        }
        order.splice(order.indexOf(expectedId), 1)
        order.splice(target, 0, expectedId)
      }
    } else if (activity.type === 'rubric_review') {
      for (const criterion of activity.data.criteria) {
        const verdict = activity.evaluation.expectedVerdicts[criterion.id]
        if (verdict === undefined) throw new Error(`Missing expected verdict for criterion ${criterion.id}`)
        await checkControl(mission, `rubric-${criterion.id}-${verdict}`)
      }
    } else if (activity.type === 'safety_classification') {
      for (const item of activity.data.items) {
        const label = activity.evaluation.classification[item.id]
        if (label === undefined) throw new Error(`Missing classification for item ${item.id}`)
        await checkControl(mission, `item-${item.id}-${label}`)
      }
    } else {
      throw new Error(`Unexpected literacy mission activity ${activity.type}`)
    }
    await mission.getByTestId('submit-attempt').click()
    if (index === lesson.activities.length - 1) {
      await mission.getByTestId('finish-lesson').click()
    } else {
      await mission.getByTestId('next-activity').click()
    }
  }
  if (options.returnToHub ?? true) {
    await expect(page.getByRole('button', { name: 'Voltar ao hub', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Voltar ao hub', exact: true }).click()
  }
}
