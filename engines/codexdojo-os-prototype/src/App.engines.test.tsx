import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import App from './App'

afterEach(cleanup)

it('launches Engine Hub from the launcher and reuses its existing window', async () => {
  // Given
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Atividades' }))
  await user.type(screen.getByRole('textbox', { name: 'Buscar aplicativos ou fundamentos' }), 'Engine Hub')

  // When
  let launcher = screen.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await user.click(within(launcher).getByRole('button', { name: /Engine Hub/ }))
  const workspace = screen.getByRole('region', { name: 'Área de trabalho' })
  await user.click(screen.getByRole('button', { name: 'Atividades' }))
  launcher = screen.getByRole('dialog', { name: 'Lançador de aplicativos' })
  await user.click(within(launcher).getByRole('button', { name: /Engine Hub/ }))

  // Then
  expect(within(workspace).getAllByText('Engine Hub')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Usar codexDojo Dashboard' })).toBeTruthy()
})
