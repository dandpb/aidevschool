import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { App } from './App'
import {
  canonicalLearnerFixture,
  emptyGeneratedLearnerFixture,
} from './test/learnerFixtures'

afterEach(cleanup)

describe('codexDojo OS canonical learner integration', () => {
  it('renders canonical learner progress from the injected read-only snapshot', () => {
    // Given
    render(<App learner={canonicalLearnerFixture} />)

    // When
    const desktop = screen.getByRole('main')

    // Then
    expect(desktop.textContent).toContain('Canonical bridge unit')
    expect(desktop.textContent).toContain('3 dias')
    expect(desktop.textContent).toContain('2 dominadas')
    expect(desktop.textContent).toContain('16 preparadas')
    expect(desktop.textContent).toContain('AVALIANDO')
    expect(desktop.textContent).not.toContain('1.240 XP')
  })

  it('renders a stable zero state when generated collections are empty', () => {
    // Given
    render(<App learner={emptyGeneratedLearnerFixture} />)

    // When
    const desktop = screen.getByRole('main')

    // Then
    expect(screen.getByRole('region', { name: 'Área de trabalho' })).toBeTruthy()
    expect(desktop.textContent).toContain('Nenhuma unidade ativa')
    expect(desktop.textContent).toContain('0 dias')
    expect(desktop.textContent).toContain('0 dominadas')
    expect(desktop.textContent).toContain('0 preparadas')
  })

  it('keeps canonical learner data read-only during local prototype interactions', async () => {
    // Given
    const user = userEvent.setup()
    const before = JSON.stringify(canonicalLearnerFixture)
    render(<App learner={canonicalLearnerFixture} />)

    // When
    const terminalButtons = screen.getAllByRole('button', { name: 'Terminal' })
    const terminalButton = terminalButtons[0]
    if (terminalButton === undefined) {
      throw new Error('Expected a Terminal launcher button')
    }
    await user.click(terminalButton)
    await user.type(screen.getByLabelText('daniel@dojo:~$'), 'learn process{Enter}')

    // Then
    expect(JSON.stringify(canonicalLearnerFixture)).toBe(before)
    expect(screen.getByText('Canonical bridge unit')).toBeTruthy()
    expect(screen.getByText('MICROLIÇÃO: o shell interpretou seu texto.')).toBeTruthy()
  })
})
