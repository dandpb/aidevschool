import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ServicesProvider } from '../app/ServicesProvider'
import { createServices } from '../app/createServices'
import { learnerSnapshot } from '../data/learner'
import { missionCatalog } from '../data/missions'
import { MentorPanel } from './MentorPanel'

describe('MentorPanel', () => {
  it('is keyboard-operable, requires an attempt for hints, and keeps fallback quota unchanged', async () => {
    const user = userEvent.setup()
    const mission = missionCatalog.missions.find((item) => item.id === 'l02')
    if (mission === undefined) throw new Error('Expected l02')

    render(
      <ServicesProvider services={createServices()}>
        <MentorPanel mission={mission} stage="respond" learner={learnerSnapshot} />
      </ServicesProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Pista' }))
    await user.click(screen.getByRole('button', { name: 'Pedir ajuda' }))
    expect(await screen.findByText(/Antes da pista, mostre o que voce tentou/)).toBeTruthy()

    await user.type(
      screen.getByLabelText('O que voce tentou'),
      'Comparei as duas respostas e escolhi a primeira.',
    )
    await user.type(
      screen.getByLabelText('Ponto exato de confusao'),
      'Nao sei como avaliar a fonte.',
    )
    await user.click(screen.getByRole('button', { name: 'Pedir ajuda' }))

    expect(
      await screen.findByText('Orientacao local deterministica · sem ferramentas'),
    ).toBeTruthy()
    expect(screen.getByText('Pistas do provedor: 0/5')).toBeTruthy()
    expect(screen.getByText('Nao cria evidencia nem avalia dominio.')).toBeTruthy()

    const explain = screen.getByRole('button', { name: 'Explicar' })
    explain.focus()
    await user.keyboard('{Enter}')
    expect(explain.getAttribute('aria-pressed')).toBe('true')
  })
})
