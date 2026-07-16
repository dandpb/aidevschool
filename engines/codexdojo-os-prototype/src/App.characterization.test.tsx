import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

describe('codexDojo OS current behavior', () => {
  it('mounts the default desktop with Dojo and Learn Mode visible', () => {
    // Given
    render(<App />)

    // When
    const workspace = screen.getByRole('region', { name: 'Área de trabalho' })

    // Then
    expect(screen.getByRole('main')).toBeTruthy()
    expect(within(workspace).getByText('Trilhas Dojo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Modo Aprender' })).toBeTruthy()
  })

  it('opens Terminal and completes the learn-process interaction', async () => {
    // Given
    const user = userEvent.setup()
    render(<App />)

    // When
    const terminalButtons = screen.getAllByRole('button', { name: 'Terminal' })
    const terminalButton = terminalButtons[0]
    if (terminalButton === undefined) {
      throw new Error('Expected a Terminal launcher button')
    }
    await user.click(terminalButton)
    await user.type(screen.getByLabelText('daniel@dojo:~$'), 'learn process{Enter}')

    // Then
    expect(screen.getByText('MICROLIÇÃO: o shell interpretou seu texto.')).toBeTruthy()
    expect(screen.getByText('1. Procurou um comando compatível.')).toBeTruthy()
  })

  it('filters launcher apps by a user query and launches the result', async () => {
    // Given
    const user = userEvent.setup()
    render(<App />)

    // When
    await user.click(screen.getByRole('button', { name: 'Atividades' }))
    const search = screen.getByPlaceholderText('Busque apps ou fundamentos…')
    await user.type(search, 'terminal')

    // Then
    expect(screen.getByText('1 resultados')).toBeTruthy()
    const launcher = screen.getByRole('button', { name: /Terminalshell/i })
    await user.click(launcher)
    expect(screen.getByLabelText('daniel@dojo:~$')).toBeTruthy()
  })

  it('closes the launcher when the backdrop is pressed', async () => {
    // Given
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Atividades' }))

    // When
    fireEvent.mouseDown(screen.getByRole('dialog', { name: 'Lançador de aplicativos' }))

    // Then
    expect(screen.queryByLabelText('Buscar aplicativos ou fundamentos')).toBeNull()
  })
})
