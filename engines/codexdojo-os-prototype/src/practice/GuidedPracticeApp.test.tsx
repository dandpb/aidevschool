import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { guidedPracticeProjection } from '../data/generated/guidedPractice'
import { GuidedPracticeApp } from './GuidedPracticeApp'

const projection = guidedPracticeProjection

async function completeAttempt(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /li o exemplo e vou para a tentativa/i }))
  for (let index = 1; index <= projection.attemptSteps.length; index += 1) {
    await user.type(screen.getByLabelText(`Evidência do passo ${index}`), `$ cmd ${index}{Enter}exit=0`)
  }
  await user.click(screen.getByRole('button', { name: /concluir a tentativa/i }))
}

function criterionScope(criterionId: string) {
  const marker = screen.getByText(criterionId)
  const item = marker.closest('li')
  if (item === null) throw new Error(`criterion ${criterionId} not rendered`)
  return within(item)
}

async function assess(user: ReturnType<typeof userEvent.setup>, criterionId: string, label: string) {
  const scope = criterionScope(criterionId)
  await user.click(scope.getByText(criterionId))
  await user.click(scope.getByLabelText(label))
  await user.type(scope.getByLabelText(`Evidência do critério ${criterionId}`), 'comando + saída citados')
}

describe('GuidedPracticeApp (pg-d01)', () => {
  it('renders the canonical projection: title, anchor, contentVersion and objective', () => {
    render(<GuidedPracticeApp onTeach={() => {}} />)
    expect(screen.getByText(projection.title)).toBeTruthy()
    expect(screen.getByText(new RegExp(projection.contentVersion))).toBeTruthy()
    expect(screen.getByText(new RegExp(projection.objective.slice(0, 40), 'i'))).toBeTruthy()
    expect(screen.getByRole('heading', { name: /exemplo trabalhado/i })).toBeTruthy()
  })

  it('runs the full guided cycle and emits the deterministic receipt', async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeApp onTeach={() => {}} />)
    await completeAttempt(user)
    for (const criterion of projection.rubric) {
      await assess(user, criterion.id, 'Atendido')
    }
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    await user.type(screen.getByLabelText(/\(a\)/), 'a fronteira 6.0 não era testada')
    await user.type(screen.getByLabelText(/\(b\)/), 'o caso mínimo com saída real')
    await user.click(screen.getByRole('button', { name: /concluir a prática/i }))

    const receipt = screen.getByText(/Recibo da prática guiada pg-d01/)
    expect(receipt.textContent).toContain(projection.contentVersion)
    expect(receipt.textContent).toContain('c-suicao-revisao: met')
  })

  it('keeps the conclusion disabled until rubric, takeaway and evidence close', async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeApp onTeach={() => {}} />)
    await completeAttempt(user)
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    expect(screen.getByRole('button', { name: /concluir a prática/i })).toHaveProperty('disabled', true)
    expect(screen.getByText(/Pendências antes de concluir/)).toBeTruthy()
  })

  it('exposes retry only for criteria that did not pass and returns to the rubric', async () => {
    const user = userEvent.setup()
    render(<GuidedPracticeApp onTeach={() => {}} />)
    await completeAttempt(user)
    for (const criterion of projection.rubric.filter((entry) => entry.id !== 'c-vermelho')) {
      await assess(user, criterion.id, 'Atendido')
    }
    await user.click(screen.getByRole('button', { name: /retry.*c-vermelho/i }))
    expect(screen.getByRole('heading', { name: /retry/i })).toBeTruthy()
    expect(screen.getByText(/Alvos deste retry: c-vermelho/)).toBeTruthy()
    const locked = criterionScope('c-reproducao')
    expect(locked.getByLabelText('Atendido').closest('fieldset')).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: /retry concluído/i }))
    expect(screen.getByRole('heading', { name: /feedback pela rúbrica/i })).toBeTruthy()
  })

  it('teaches the learning rail context when the receipt is copied', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const user = userEvent.setup()
    const onTeach = vi.fn()
    render(<GuidedPracticeApp onTeach={onTeach} />)
    await completeAttempt(user)
    for (const criterion of projection.rubric) {
      await assess(user, criterion.id, 'Atendido')
    }
    await user.click(screen.getByRole('button', { name: /ir para o takeaway/i }))
    await user.type(screen.getByLabelText(/\(a\)/), 'a')
    await user.type(screen.getByLabelText(/\(b\)/), 'b')
    await user.click(screen.getByRole('button', { name: /concluir a prática/i }))
    await user.click(screen.getByRole('button', { name: /copiar recibo/i }))
    expect(onTeach).toHaveBeenCalledWith(expect.objectContaining({ title: 'Recibo copiado' }))
    vi.unstubAllGlobals()
  })
})
