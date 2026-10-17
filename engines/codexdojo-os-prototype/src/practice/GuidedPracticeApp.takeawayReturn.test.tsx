// AID-3772 (F1, AID-3677/L03): focused UI coverage for the takeaway dead-end
// exit in the daily practice pg-c01 player. Invariants (PO contract eb44c0a6):
// - Inside takeaway with unresolved conclusion blockers, the action bar
//   offers an EXPLICIT review action (takeaway → feedback) that preserves the
//   session (A/B/C pieces, criteria verdicts, takeaway text) — the learner is
//   never forced into the practice-switch restart that discards everything.
// - The conclusion button stays disabled with a stated reason while blockers
//   exist; navigating back does not consume an attempt.
// - Entry into takeaway remains permissive; at the retry cap the review
//   return still works and nothing promises an extra attempt or conclusion.
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { guidedPracticeDailyProjection as dailyProjection } from '../data/generated/guidedPractice'
import { GuidedPracticeApp } from './GuidedPracticeApp'

async function completeDailyAttempt(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
  for (const stepId of ['A', 'B', 'C']) {
    fireEvent.change(screen.getByLabelText(`Peça da etapa ${stepId}`), {
      target: { value: `peça ${stepId} com citação fonte-1 L2 / fonte-2 G4` },
    })
  }
  await user.click(screen.getByRole('button', { name: /concluir a tentativa/i }))
}

function criterionScope(criterionId: string) {
  const marker = screen.getByText(criterionId)
  const item = marker.closest('li')
  if (item === null) throw new Error(`criterion ${criterionId} not rendered`)
  return within(item)
}

async function assessDaily(
  user: ReturnType<typeof userEvent.setup>,
  criterionId: string,
  label: string,
) {
  const scope = criterionScope(criterionId)
  await user.click(scope.getByText(criterionId))
  await user.click(scope.getByLabelText(label))
  fireEvent.change(scope.getByLabelText(`Evidência do critério ${criterionId}`), {
    target: { value: 'peça + citação fonte-2 G4' },
  })
}

async function runToTakeawayWithPendingCriterion(user: ReturnType<typeof userEvent.setup>) {
  render(<GuidedPracticeApp onTeach={() => {}} practiceId="pg-c01" />)
  await completeDailyAttempt(user)
  for (const criterionId of dailyProjection.criteria.slice(0, -1)) {
    await assessDaily(user, criterionId, 'Suficiente')
  }
  await assessDaily(user, dailyProjection.criteria[dailyProjection.criteria.length - 1], 'Insuficiente')
  await user.click(screen.getByRole('button', { name: /critérios registrados — ir para o takeaway/i }))
  fireEvent.change(screen.getByLabelText(/\(a\)/), { target: { value: 'takeaway A escrito' } })
  fireEvent.change(screen.getByLabelText(/\(b\)/), { target: { value: 'takeaway B escrito' } })
}

describe('AID-3772 F1: takeaway dead-end exit (daily pg-c01 player)', () => {
  it('offers the review return in takeaway with blockers, keeps conclusion disabled with a reason', async () => {
    const user = userEvent.setup()
    await runToTakeawayWithPendingCriterion(user)

    const review = screen.getByRole('button', { name: /revisar critérios — voltar ao feedback/i })
    expect(review).toBeTruthy()

    const conclude = screen.getByRole('button', { name: /concluir a prática e emitir o recibo/i })
    expect(conclude).toHaveProperty('disabled', true)
    expect(screen.getByText(/pendências antes de concluir/i)).toBeTruthy()
    expect(screen.getByText(/revisar não consome tentativa/i)).toBeTruthy()
  })

  it('returning to feedback preserves the session and the written takeaway text', async () => {
    const user = userEvent.setup()
    await runToTakeawayWithPendingCriterion(user)

    await user.click(screen.getByRole('button', { name: /revisar critérios — voltar ao feedback/i }))
    expect(screen.getByRole('button', { name: /critérios registrados — ir para o takeaway/i })).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /critérios registrados — ir para o takeaway/i }))
    expect((screen.getByLabelText(/\(a\)/) as HTMLTextAreaElement).value).toBe('takeaway A escrito')
    expect((screen.getByLabelText(/\(b\)/) as HTMLTextAreaElement).value).toBe('takeaway B escrito')
  })
})
