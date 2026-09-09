import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MissionDefinition } from '../domain'
import { createInitialRendererState } from '../rendering/domain'
import { ResultScreen } from '../journey/ResultScreen'
import { MissionStatusControls } from './MissionStatusControls'
import type { MissionSessionSnapshot } from './MissionSessionController'

/**
 * AID-1089/W2 — state contract (proposta AID-914 §2.3, doc proposal rev 1) nos
 * controles do loop de missão do OS:
 * - painel de status: role=status + aria-live polite + aria-atomic;
 * - loading do retry assíncrono: disable + aria-busy durante o voo;
 * - preservação de foco no retry (painel/região tabIndex=-1 recebe foco).
 */

const staticMission = {
  id: 'l02',
  trackId: 'ia_pratica',
  unitId: 'u-l02',
  chapterOrder: 2,
  title: 'Missão de teste',
  objective: 'Verificar o state contract',
  estimatedMinutes: 5,
  prerequisites: [],
  runtime: { engineId: 'static', engineVersion: '1' },
  evidence: { schema: 'literacy-v1', version: 1 },
  fallback: { summary: 'Fallback de teste.' },
} as unknown as MissionDefinition

const session: MissionSessionSnapshot = {
  phase: 'running',
  stage: 'respond',
  progress: 0.5,
  renderer: createInitialRendererState(),
}

function renderStatusControls(
  verification: Parameters<typeof MissionStatusControls>[0]['verification'],
  overrides?: Partial<Parameters<typeof MissionStatusControls>[0]>,
) {
  const props = {
    mission: staticMission,
    session,
    verification,
    completionStatus: 'idle' as const,
    onRetryRenderer: vi.fn(),
    onRetryVerification: vi.fn(),
    onRetrySave: vi.fn(),
    ...overrides,
  }
  render(<MissionStatusControls {...props} />)
  return props
}

describe('AID-1089/W2: state contract — MissionStatusControls', () => {
  it('painel de status é região role=status com aria-live polite e aria-atomic', () => {
    renderStatusControls({ kind: 'not-submitted' })
    // O painel mission-status carrega role=status; regiões de nota também usam
    // role=status — restringe pelo conteúdo de Etapa/Motor/Evidência.
    const panels = screen.getAllByText(/Etapa|Motor|Evidência/)
    expect(panels.length).toBeGreaterThan(0)
    const section = panels[0]?.closest('section.mission-status')
    expect(section).not.toBeNull()
    expect(section?.getAttribute('role')).toBe('status')
    expect(section?.getAttribute('aria-live')).toBe('polite')
    expect(section?.getAttribute('aria-atomic')).toBe('true')
    expect(section?.getAttribute('tabindex')).toBe('-1')
  })

  it('retry de verificação: aria-busy + disabled durante o voo e foco preservado no painel', async () => {
    let release: (() => void) | undefined
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const onRetryVerification = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          markStarted?.()
          release = resolve
        }),
    )
    const props = renderStatusControls(
      { kind: 'gateway-unavailable', storageId: 'run-1', retryable: true },
      { onRetryVerification },
    )

    const button = screen.getByRole('button', { name: 'Tentar verificação novamente' })
    await userEvent.click(button)
    await started

    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    const section = screen.getByText('Etapa').closest('section.mission-status')
    expect(section).not.toBeNull()
    expect(document.activeElement).toBe(section)
    expect(props.onRetryVerification).toHaveBeenCalledOnce()

    release?.()
    await vi.waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false))
    expect(['false', null]).toContain(button.getAttribute('aria-busy'))
  })

  it('retry de salvamento: foco preservado no painel de status', async () => {
    const onRetrySave = vi.fn()
    renderStatusControls(
      { kind: 'gateway-unavailable', storageId: 'run-1', retryable: true },
      { completionStatus: 'failed', onRetrySave },
    )
    await userEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
    expect(onRetrySave).toHaveBeenCalledOnce()
    const section = screen.getByText('Etapa').closest('section.mission-status')
    expect(section).not.toBeNull()
    expect(document.activeElement).toBe(section)
  })
})

describe('AID-1089/W2: state contract — ResultScreen', () => {
  it('região de verificação é aria-live polite + aria-atomic; retry de salvamento preserva foco', async () => {
    const onRetrySave = vi.fn()
    render(
      <ResultScreen
        completionStatus="failed"
        verification={{ kind: 'gateway-unavailable', storageId: 'run-1', retryable: true }}
        canonicalMasteryCount={0}
        onRetryVerification={vi.fn()}
        onRetrySave={onRetrySave}
        onReturn={vi.fn()}
      />,
    )
    const region = screen.getByText('Resultado da verificação').closest('div.result-verification')
    expect(region).not.toBeNull()
    expect(region?.getAttribute('aria-live')).toBe('polite')
    expect(region?.getAttribute('aria-atomic')).toBe('true')

    await userEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
    expect(onRetrySave).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(region)
  })

  it('retry de verificação: aria-busy + disabled durante o voo', async () => {
    let release: (() => void) | undefined
    let markStarted: (() => void) | undefined
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    const onRetryVerification = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          markStarted?.()
          release = resolve
        }),
    )
    render(
      <ResultScreen
        completionStatus="failed"
        verification={{ kind: 'gateway-unavailable', storageId: 'run-1', retryable: true }}
        canonicalMasteryCount={0}
        onRetryVerification={onRetryVerification}
        onRetrySave={vi.fn()}
        onReturn={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', { name: 'Tentar verificação novamente' })
    await userEvent.click(button)
    await started
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(onRetryVerification).toHaveBeenCalledOnce()
    release?.()
    await vi.waitFor(() =>
      expect(['false', null]).toContain(button.getAttribute('aria-busy')),
    )
  })
})
