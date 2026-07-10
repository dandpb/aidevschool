import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EngineHubApp } from './EngineHubApp'

afterEach(cleanup)

describe('Engine Hub', () => {
  it('presents the OS host and every external engine exactly once', () => {
    // Given
    render(<EngineHubApp development={false} />)

    // When
    const engineActions = screen.getAllByRole('button', { name: /^Usar / })

    // Then
    expect(screen.getByText('codexDojo OS')).toBeTruthy()
    expect(screen.getByText('Host da experiência')).toBeTruthy()
    expect(engineActions.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Usar codexDojo Dashboard',
      'Usar minimaxDojo Tutor Core',
      'Usar MiniMax Evolution Engine',
      'Usar OpenClaw',
      'Usar PixelDojo Quest',
      'Usar voxelDojo',
    ])
  })

  it('embeds a configured web engine inside the Hub', async () => {
    // Given
    const user = userEvent.setup()
    render(
      <EngineHubApp
        development={false}
        configuredUrls={{ codexDojo: 'https://dashboard.example.test/' }}
      />,
    )

    // When
    await user.click(screen.getByRole('button', { name: 'Usar codexDojo Dashboard' }))

    // Then
    const frame = screen.getByTitle('codexDojo Dashboard integrado')
    expect(frame.getAttribute('src')).toBe('https://dashboard.example.test/')
    expect(screen.getByText('Estado canônico · somente leitura')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Expandir motor' }))
    expect(document.querySelector('.engine-hub-app.focused-engine')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Voltar ao Hub' }))
    expect(document.querySelector('.engine-hub-app.focused-engine')).toBeNull()
  })

  it('shows an honest unavailable state when a production web URL is missing', async () => {
    // Given
    const user = userEvent.setup()
    render(<EngineHubApp development={false} />)

    // When
    await user.click(screen.getByRole('button', { name: 'Usar PixelDojo Quest' }))

    // Then
    expect(screen.getByRole('status').textContent).toContain('não está configurado')
    expect(screen.queryByTitle('PixelDojo Quest integrado')).toBeNull()
  })

  it('routes every voxelDojo game through the in-OS catalog selector', async () => {
    const user = userEvent.setup()
    render(
      <EngineHubApp
        development={false}
        configuredVoxelUrls={{
          'game-02-warehouse': 'https://warehouse.voxel.example/',
          'game-10-hash-ring': 'https://hash-ring.voxel.example/',
        }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Usar voxelDojo' }))
    const picker = screen.getByRole('combobox', { name: 'Experiência voxelDojo' })

    expect(picker.querySelectorAll('option')).toHaveLength(16)
    expect(screen.getByTitle('voxelDojo · HASH RING integrado').getAttribute('src')).toBe(
      'https://hash-ring.voxel.example/',
    )

    await user.selectOptions(picker, 'game-02-warehouse')

    expect(screen.getByTitle('voxelDojo · WAREHOUSE integrado').getAttribute('src')).toBe(
      'https://warehouse.voxel.example/',
    )
  })

  it('runs the fixed local bridge action and renders its real receipt', async () => {
    // Given
    const user = userEvent.setup()
    const runAction = vi.fn().mockResolvedValue({
      ok: true,
      summary: 'Contrato determinístico executado',
      output: '1 passed in 0.08s',
    })
    render(<EngineHubApp development={false} localBridgeAvailable runAction={runAction} />)
    await user.click(screen.getByRole('button', { name: 'Usar minimaxDojo Tutor Core' }))

    // When
    await user.click(screen.getByRole('button', { name: 'Preparar sessão de tutoria' }))

    // Then
    expect(runAction).toHaveBeenCalledWith('minimaxDojo', 'prepare-tutor-session')
    expect(await screen.findByText('Contrato determinístico executado')).toBeTruthy()
    expect(screen.getByText('1 passed in 0.08s')).toBeTruthy()
    expect(screen.getByText(/não concede domínio/i)).toBeTruthy()
  })

  it('source-labels the divergent Evolution and OpenClaw pipeline views', async () => {
    // Given
    const user = userEvent.setup()
    render(<EngineHubApp development={false} />)

    // When
    await user.click(screen.getByRole('button', { name: 'Usar OpenClaw' }))

    // Then
    expect(screen.getByText('Fontes de pipeline distintas')).toBeTruthy()
    expect(screen.getByText(/Evolution: learner\/pipeline_status\.md/i)).toBeTruthy()
    expect(screen.getByText(/OpenClaw: learner\/pipeline_status\.yaml/i)).toBeTruthy()
  })

  it('drops a stale local receipt after the user switches engines', async () => {
    const user = userEvent.setup()
    let resolveAction: ((result: {
      readonly ok: boolean
      readonly summary: string
      readonly output: string
    }) => void) | undefined
    const runAction = vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolveAction = resolve
    }))
    render(<EngineHubApp development={false} localBridgeAvailable runAction={runAction} />)
    await user.click(screen.getByRole('button', { name: 'Usar minimaxDojo Tutor Core' }))
    await user.click(screen.getByRole('button', { name: 'Preparar sessão de tutoria' }))

    await user.click(screen.getByRole('button', { name: 'Usar MiniMax Evolution Engine' }))
    resolveAction?.({ ok: true, summary: 'Stale minimax receipt', output: 'must not render' })

    expect(await screen.findByRole('button', { name: 'Preparar workflow' })).toBeTruthy()
    expect(screen.queryByText('Stale minimax receipt')).toBeNull()
  })

  it('disables local actions when the development-only bridge is absent', async () => {
    const user = userEvent.setup()
    render(<EngineHubApp development={false} />)

    await user.click(screen.getByRole('button', { name: 'Usar minimaxDojo Tutor Core' }))

    expect(screen.getByRole('status').textContent).toContain('ponte local não está disponível')
    expect(screen.queryByRole('button', { name: 'Preparar sessão de tutoria' })).toBeNull()
  })

  it('renders only source-bound raw evidence as requiring independent verification', async () => {
    const user = userEvent.setup()
    render(
      <EngineHubApp
        development={false}
        configuredUrls={{ pixelDojo: 'https://pixel.example.test/' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Usar PixelDojo Quest' }))
    const frame = screen.getByTitle('PixelDojo Quest integrado') as HTMLIFrameElement
    const evidence = {
      source: 'pixelquest',
      project: '01_rate_limiter',
      encounter_id: 'encounter-agent-quest-01',
      game: 'PixelDojo Quest',
      ts: '2026-07-10T18:00:00.000Z',
      pass: true,
      review_context: { verifier_required: true },
    }

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'aidevschool:teaching-evidence', version: 1, evidence },
        origin: 'https://pixel.example.test',
        source: frame.contentWindow,
      }))
    })

    expect(await screen.findByText('Evidência bruta recebida')).toBeTruthy()
    expect(screen.getByText('01_rate_limiter · encounter-agent-quest-01')).toBeTruthy()
    expect(screen.getByText('Verificação independente obrigatória')).toBeTruthy()

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'aidevschool:teaching-evidence',
          version: 1,
          evidence: { ...evidence, project: 'attacker_project' },
        },
        origin: 'https://attacker.example.test',
        source: frame.contentWindow,
      }))
    })

    expect(screen.getAllByText('Evidência bruta recebida')).toHaveLength(1)
    expect(screen.queryByText(/attacker_project/)).toBeNull()

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'aidevschool:teaching-evidence',
          version: 1,
          evidence: { ...evidence, source: 'voxeldojo', project: 'wrong_engine' },
        },
        origin: 'https://pixel.example.test',
        source: frame.contentWindow,
      }))
    })

    expect(screen.queryByText(/wrong_engine/)).toBeNull()
  })
})
