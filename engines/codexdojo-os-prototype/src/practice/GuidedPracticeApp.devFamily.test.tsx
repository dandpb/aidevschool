// AID-5006: focused UI coverage for the dev-family practices pg-d02..pg-d04
// in the standalone player. Invariants:
// - The chooser offers all five practices with aria-pressed state; the
//   embedded AC1 runtime keeps GuidedPracticeApp pinned to pg-d01 (covered by
//   the daily suite) and onConcluded NEVER fires for a non-pg-d01 conclusion.
// - Each dev practice is playable end to end on the standalone surface:
//   exemplo → tentativa (6 evidences) → feedback pela rúbrica (7 critérios)
//   → takeaway → receipt determinístico com contentVersion.
// - Phase transitions keep focus on the new phase heading (AID-3564 F1) and
//   a switch during an active attempt requires an explicit confirmed restart.
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { guidedPracticeDevProjections } from '../data/generated/guidedPractice'
import type { DevGuidedPracticeId } from './guidedPracticeTypes'
import { GuidedPracticeApp, GuidedPracticeStandaloneApp } from './GuidedPracticeApp'

const DEV_IDS: readonly DevGuidedPracticeId[] = ['pg-d02', 'pg-d03', 'pg-d04']

const CHOICE_LABELS: Readonly<Record<DevGuidedPracticeId, RegExp>> = {
  'pg-d02': /pg-d02 · dev: o pedido estruturado de 5 campos/i,
  'pg-d03': /pg-d03 · dev: refatoração com rede de segurança/i,
  'pg-d04': /pg-d04 · dev: pacote de contexto \+ prd\/spec/i,
}

function criterionScope(criterionId: string) {
  const marker = screen.getByText(criterionId)
  const item = marker.closest('li')
  if (item === null) throw new Error(`criterion ${criterionId} not rendered`)
  return within(item)
}

async function playDevPracticeToReceipt(
  user: ReturnType<typeof userEvent.setup>,
  practiceId: DevGuidedPracticeId,
) {
  const projection = guidedPracticeDevProjections[practiceId]
  await user.click(screen.getByRole('button', { name: CHOICE_LABELS[practiceId] }))
  // Titles contain regex metachars (parens, +): compare the rendered text
  // instead of building a name regex from the canonical title.
  const heading = screen.getByRole('heading', { level: 1 })
  expect(heading.textContent).toBe(projection.title)

  await user.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
  for (let index = 1; index <= projection.attemptSteps.length; index += 1) {
    fireEvent.change(screen.getByLabelText(`Evidência do passo ${index}`), {
      target: { value: `$ cmd ${index}\nsaída real registrada` },
    })
  }
  await user.click(screen.getByRole('button', { name: /concluir a tentativa/i }))

  for (const criterion of projection.rubric) {
    const scope = criterionScope(criterion.id)
    await user.click(scope.getByText(criterion.id))
    await user.click(scope.getByLabelText('Atendido', { exact: true }))
    fireEvent.change(scope.getByLabelText(`Evidência do critério ${criterion.id}`), {
      target: { value: 'comando + saída citados' },
    })
  }
  await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))

  fireEvent.change(screen.getByLabelText(/\(a\)/), { target: { value: 'resposta a' } })
  fireEvent.change(screen.getByLabelText(/\(b\)/), { target: { value: 'resposta b' } })
  await user.click(screen.getByRole('button', { name: /concluir a prática/i }))

  const receipt = screen.getByText(new RegExp(`Recibo da prática guiada ${practiceId}`))
  expect(receipt.textContent).toContain(projection.contentVersion)
  const lastCriterion = projection.rubric[projection.rubric.length - 1]
  expect(receipt.textContent).toContain(`${lastCriterion.id}: met`)
  expect(receipt.textContent).toContain(`âncora: ${projection.anchorLessonId} · trilha: Dev`)
  return projection
}

describe('GuidedPracticeStandaloneApp dev family (AID-5006)', () => {
  it('offers all five practices in the chooser with aria-pressed state', { timeout: 30_000 }, () => {
    render(<GuidedPracticeStandaloneApp />)
    const nav = screen.getByRole('navigation', { name: 'Escolha da prática guiada' })
    const chooser = within(nav)
    for (const practiceId of DEV_IDS) {
      expect(chooser.getByRole('button', { name: CHOICE_LABELS[practiceId] })).toBeTruthy()
    }
    const selected = chooser.getByRole('button', { name: /pg-d01 ·/i })
    expect(selected.getAttribute('aria-pressed')).toBe('true')
    const unselected = chooser.getByRole('button', { name: CHOICE_LABELS['pg-d03'] })
    expect(unselected.getAttribute('aria-pressed')).toBe('false')
  })

  for (const practiceId of DEV_IDS) {
    it(`plays ${practiceId} end to end to the deterministic receipt`, { timeout: 120_000 }, async () => {
      const user = userEvent.setup()
      render(<GuidedPracticeStandaloneApp />)
      await playDevPracticeToReceipt(user, practiceId)
    })
  }

  it('moves focus to the new phase heading on every transition (pg-d02)', { timeout: 120_000 }, async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeStandaloneApp />)
    const projection = guidedPracticeDevProjections['pg-d02']
    await user.click(screen.getByRole('button', { name: CHOICE_LABELS['pg-d02'] }))

    const activeId = () => document.activeElement?.id ?? '<none>'
    const cta = screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i })
    cta.focus()
    await user.click(cta)
    expect(activeId()).toBe('practice-tentativa-title')

    for (let index = 1; index <= projection.attemptSteps.length; index += 1) {
      fireEvent.change(screen.getByLabelText(`Evidência do passo ${index}`), {
        target: { value: `$ cmd ${index}` },
      })
    }
    await user.click(screen.getByRole('button', { name: /concluir a tentativa/i }))
    expect(activeId()).toBe('practice-feedback-title')

    for (const criterion of projection.rubric) {
      const scope = criterionScope(criterion.id)
      fireEvent.click(scope.getByText(criterion.id))
      fireEvent.click(scope.getByLabelText('Atendido', { exact: true }))
    }
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    expect(activeId()).toBe('practice-takeaway-title')
  })

  it('gates a switch during an active attempt behind a confirmed restart (pg-d02 → pg-d03)', { timeout: 60_000 }, async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeStandaloneApp />)
    await user.click(screen.getByRole('button', { name: CHOICE_LABELS['pg-d02'] }))
    await user.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
    fireEvent.change(screen.getByLabelText('Evidência do passo 1'), {
      target: { value: '$ python3 release_notes.py' },
    })

    await user.click(screen.getByRole('button', { name: CHOICE_LABELS['pg-d03'] }))
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('tentativa em curso em pg-d02')
    await user.click(screen.getByRole('button', { name: /cancelar e continuar pg-d02/i }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Evidência do passo 1')).toHaveProperty(
      'value',
      '$ python3 release_notes.py',
    )
  })
})

describe('GuidedPracticeApp embedded (dev family negatives)', () => {
  it('never fires onConcluded for a concluded pg-d03 session (AC1 stays pinned to pg-d01)', { timeout: 120_000 }, async () => {
    const user = userEvent.setup()
    const onConcluded = vi.fn()
    render(<GuidedPracticeApp practiceId="pg-d03" onTeach={() => {}} onConcluded={onConcluded} />)
    const projection = guidedPracticeDevProjections['pg-d03']

    await user.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
    for (let index = 1; index <= projection.attemptSteps.length; index += 1) {
      fireEvent.change(screen.getByLabelText(`Evidência do passo ${index}`), {
        target: { value: `$ cmd ${index}` },
      })
    }
    await user.click(screen.getByRole('button', { name: /concluir a tentativa/i }))
    for (const criterion of projection.rubric) {
      const scope = criterionScope(criterion.id)
      fireEvent.click(scope.getByText(criterion.id))
      fireEvent.click(scope.getByLabelText('Atendido', { exact: true }))
    }
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    fireEvent.change(screen.getByLabelText(/\(a\)/), { target: { value: 'a' } })
    fireEvent.change(screen.getByLabelText(/\(b\)/), { target: { value: 'b' } })
    await user.click(screen.getByRole('button', { name: /concluir a prática/i }))
    expect(screen.getByText(/Recibo da prática guiada pg-d03/)).toBeTruthy()
    expect(onConcluded).not.toHaveBeenCalled()
  })
})
