import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Onboarding } from './Onboarding'

describe('OS onboarding track picker', () => {
  it('offers IA Prática and Dev, and keeps Dev clickable when confidence is low', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<Onboarding onComplete={onComplete} />)

    expect(screen.getByTestId('track-option-ai-pratica').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('track-option-dev').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('status').textContent).toMatch(/IA Prática/)
    expect(screen.queryByText(/sem menu de motores/i)).toBeNull()
    expect(screen.queryByText(/PIPELINE PLANT/)).toBeNull()

    await user.click(screen.getByTestId('track-option-dev'))
    expect(screen.getByTestId('track-option-dev').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('status').textContent).toMatch(/WAREHOUSE/)

    await user.click(screen.getByRole('button', { name: 'Entrar na escola' }))
    expect(onComplete).toHaveBeenCalledWith({
      goal: 'work-better',
      context: 'work',
      confidence: 'low',
      selectedTrackId: 'dev',
    })
  })

  it('preselects Dev when initialTrackId is dev (?track=dev)', () => {
    render(<Onboarding onComplete={vi.fn()} initialTrackId="dev" />)

    expect(screen.getByTestId('track-option-dev').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('track-option-ai-pratica').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('status').textContent).toMatch(/WAREHOUSE/)
  })

  it('preselects Dev from the URL search string', () => {
    window.history.replaceState(null, '', '/onboarding?track=dev')
    render(<Onboarding onComplete={vi.fn()} />)

    expect(screen.getByTestId('track-option-dev').getAttribute('aria-pressed')).toBe('true')
    window.history.replaceState(null, '', '/')
  })
})
