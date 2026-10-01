// AID-3590: focused UI coverage for the daily practice pg-c01 in the player
// and for the AC1 binding negatives. Invariants:
// - The embedded app (no practiceId) NEVER shows a chooser, stays pinned to
//   pg-d01 and fires onConcluded only for pg-d01 — a pg-c01 conclusion is
//   never accepted by the callback that credits the pg-d01 mission.
// - The standalone app offers the explicit content choice, isolates session
//   state per practiceId@contentVersion (nothing transports across a switch)
//   and gates switching during an active attempt behind an explicit
//   confirmed restart.
// - The real pg-c01 flow runs exemplo → tentativa (A/B/C) → feedback
//   (binary) → retry (approved feedback + insistent AI + response) →
//   takeaway → conclusive deterministic receipt.
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { guidedPracticeDailyProjection as dailyProjection } from '../data/generated/guidedPractice'
import {
  GuidedPracticeApp,
  GuidedPracticeStandaloneApp,
} from './GuidedPracticeApp'

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

async function assessDaily(user: ReturnType<typeof userEvent.setup>, criterionId: string, label: string) {
  const scope = criterionScope(criterionId)
  await user.click(scope.getByText(criterionId))
  await user.click(scope.getByLabelText(label))
  fireEvent.change(scope.getByLabelText(`Evidência do critério ${criterionId}`), {
    target: { value: 'peça + citação fonte-2 G4' },
  })
}

describe('GuidedPracticeApp embedded default (pg-d01 / AC1 negatives)', () => {
  it('renders pg-d01 by default with no content chooser', () => {
    render(<GuidedPracticeApp onTeach={() => {}} />)
    expect(screen.getByText(/reproduza antes de perguntar/i)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /pg-c01/i })).toBeNull()
    expect(screen.queryByLabelText(/escolha da prática guiada/i)).toBeNull()
  })

  it('fires onConcluded for a concluded pg-d01 session', async () => {
    const user = userEvent.setup()
    const onConcluded = vi.fn()
    render(<GuidedPracticeApp onTeach={() => {}} onConcluded={onConcluded} />)
    await user.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
    for (let index = 1; index <= 6; index += 1) {
      fireEvent.change(screen.getByLabelText(`Evidência do passo ${index}`), {
        target: { value: `$ cmd ${index}` },
      })
    }
    await user.click(screen.getByRole('button', { name: /concluir a tentativa/i }))
    const { guidedPracticeProjection } = await import('../data/generated/guidedPractice')
    for (const criterion of guidedPracticeProjection.rubric) {
      const scope = criterionScope(criterion.id)
      await user.click(scope.getByText(criterion.id))
      await user.click(scope.getByLabelText('Atendido', { exact: true }))
      fireEvent.change(scope.getByLabelText(`Evidência do critério ${criterion.id}`), {
        target: { value: 'diff citado' },
      })
    }
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    fireEvent.change(screen.getByLabelText(/\(a\)/), { target: { value: 'a' } })
    fireEvent.change(screen.getByLabelText(/\(b\)/), { target: { value: 'b' } })
    await user.click(screen.getByRole('button', { name: /concluir a prática/i }))
    expect(screen.getByText(/Recibo da prática guiada pg-d01/)).toBeTruthy()
    expect(onConcluded).toHaveBeenCalledTimes(1)
  })
})

describe('GuidedPracticeApp daily (pg-c01)', () => {
  it('renders the daily identity without Dev-only defaults (no track/anchor/duration)', () => {
    render(<GuidedPracticeApp practiceId="pg-c01" onTeach={() => {}} />)
    expect(screen.getByText(`${dailyProjection.practiceId} · ${dailyProjection.package.id}`)).toBeTruthy()
    expect(screen.getByText(new RegExp(dailyProjection.contentVersion))).toBeTruthy()
    expect(screen.getByText(new RegExp(dailyProjection.projectionPin.artifactSha256.slice(0, 12)))).toBeTruthy()
    expect(document.body.textContent).not.toContain('TRILHA')
    expect(document.body.textContent).not.toContain('Sessão de ')
    expect(screen.getByRole('heading', { name: /exemplo trabalhado/i })).toBeTruthy()
  })

  it('runs the full daily cycle with retry and emits the deterministic receipt without onConcluded', async () => {
    const user = userEvent.setup()
    const onConcluded = vi.fn()
    render(<GuidedPracticeApp practiceId="pg-c01" onTeach={() => {}} onConcluded={onConcluded} />)
    await completeDailyAttempt(user)

    for (const criterion of dailyProjection.criteria) {
      await assessDaily(user, criterion, 'Suficiente')
    }
    // Reopen one criterion as insufficient to exercise the retry path.
    const c3 = criterionScope('c3-citações')
    await user.click(c3.getByLabelText('Insuficiente'))
    expect(screen.getByText(/critérios ainda insuficientes \(alvos do retry\): c3-citações/i)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /retry: 1 critério insuficiente/i }))
    expect(screen.getByRole('heading', { name: /retry — refaça apenas os critérios insuficientes/i })).toBeTruthy()
    // Approved feedback for the failed criterion is shown; locked criteria stay locked.
    expect(screen.getAllByText(/fonte\+linha/i).length).toBeGreaterThan(0)
    const c1 = criterionScope('c1-mínimos')
    expect(c1.getByLabelText('Suficiente').closest('fieldset')).toHaveProperty('disabled', true)
    // The insistent AI statement from the ratified projection is shown.
    expect(screen.getByText(new RegExp(dailyProjection.retry.insistedStatement.text.slice(0, 40)))).toBeTruthy()
    // Retry cannot close without the response.
    const closeRetry = screen.getByRole('button', { name: /retry concluído/i })
    expect(closeRetry).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Resposta à IA que insiste'), {
      target: { value: 'mantenho: sem citação não entra — re-citei fonte-2 G3' },
    })
    await user.click(closeRetry)

    const c3again = criterionScope('c3-citações')
    await user.click(c3again.getByLabelText('Suficiente'))
    fireEvent.change(c3again.getByLabelText('Evidência do critério c3-citações'), {
      target: { value: 'todas as linhas com fonte+linha' },
    })
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    fireEvent.change(screen.getByLabelText(/\(a\)/), { target: { value: 'o telefone do portão' } })
    fireEvent.change(screen.getByLabelText(/\(b\)/), { target: { value: 'a frase do dia com L1' } })
    await user.click(screen.getByRole('button', { name: /concluir a prática/i }))

    const receipt = screen.getByText(/Recibo da prática guiada pg-c01/)
    expect(receipt.textContent).toContain(dailyProjection.contentVersion)
    expect(receipt.textContent).toContain(dailyProjection.projectionPin.artifactSha256)
    expect(receipt.textContent).toContain('- c3-citações: sufficient')
    expect(receipt.textContent).toContain('## Resposta ao retry (tentativa 2)')
    // AC1 negative: a pg-c01 conclusion never fires the mission-credit callback.
    expect(onConcluded).not.toHaveBeenCalled()
  })

  it('keeps the conclusion disabled while daily blockers remain', async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeApp practiceId="pg-c01" onTeach={() => {}} />)
    await completeDailyAttempt(user)
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    expect(screen.getByRole('button', { name: /concluir a prática/i })).toHaveProperty('disabled', true)
    expect(screen.getByText(/Pendências antes de concluir/)).toBeTruthy()
    expect(screen.getByText(/c1-mínimos-evidencia/)).toBeTruthy()
  })
})

describe('GuidedPracticeStandaloneApp (explicit content choice)', () => {
  it('defaults to pg-d01 with the chooser visible and no chooser inside the session', () => {
    render(<GuidedPracticeStandaloneApp onTeach={() => {}} />)
    const chooser = screen.getByLabelText(/escolha da prática guiada/i)
    expect(chooser).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /pg-d01 ·/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('heading', { level: 1, name: /reproduza antes de perguntar/i })).toBeTruthy()
    // The session itself renders exactly one h1 (no embedded second chooser).
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('switches freely outside an attempt and isolates state per practiceId', async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeStandaloneApp onTeach={() => {}} />)
    // Free switch before any attempt: pg-d01 → pg-c01.
    await user.click(screen.getByRole('button', { name: /pg-c01 ·/i }))
    expect(screen.getByRole('heading', { level: 1, name: new RegExp(dailyProjection.package.id) })).toBeTruthy()
    await completeDailyAttempt(user)
    expect(screen.getByRole('heading', { name: /feedback pelos critérios/i })).toBeTruthy()
    // Attempt active (feedback phase): switching asks for an explicit restart.
    await user.click(screen.getByRole('button', { name: /pg-d01 ·/i }))
    expect(screen.getByRole('alert').textContent).toContain('tentativa em curso')
    await user.click(screen.getByRole('button', { name: /cancelar e continuar pg-c01/i }))
    // Cancel kept the daily session exactly where it was.
    expect(screen.getByRole('heading', { name: /feedback pelos critérios/i })).toBeTruthy()

    // Confirmed restart: the pg-d01 session starts fresh from exemplo.
    await user.click(screen.getByRole('button', { name: /pg-d01 ·/i }))
    await user.click(screen.getByRole('button', { name: /confirmar reinício e trocar para pg-d01/i }))
    expect(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /feedback pelos critérios/i })).toBeNull()

    // Nothing transports backwards either: pg-c01 restarts fresh from exemplo.
    await user.click(screen.getByRole('button', { name: /pg-c01 ·/i }))
    expect(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i })).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /feedback pelos critérios/i })).toBeNull()
  })

  it('documents session volatility (close/minimize dismounts, no persistence claim)', () => {
    render(<GuidedPracticeStandaloneApp onTeach={() => {}} />)
    expect(screen.getByText(/fechar ou minimizar o app encerra a sessão sem persistir nada/i)).toBeTruthy()
  })
})
