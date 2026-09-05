import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { anonymousPublicLearner } from '../data/anonymousLearner'
import { learnerSnapshot } from '../data/learner'
import { DesktopApp } from './DesktopApp'

afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})

describe('DesktopApp public learner default', () => {
  it('does not project the author yaml onto a public /desktop visitor', () => {
    window.history.replaceState(null, '', '/desktop?operator=0')
    render(<DesktopApp />)

    const desktop = screen.getByRole('main')
    expect(desktop.textContent).toContain('0 dominadas')
    expect(desktop.textContent).not.toContain('2 dominadas')
    expect(desktop.textContent).not.toContain('U2-key-value-store')
    expect(desktop.textContent).not.toContain('KV WAREHOUSE')
    expect(anonymousPublicLearner.masteredCount).toBe(0)
    expect(learnerSnapshot.masteredCount).toBe(2)
    expect(learnerSnapshot.activeUnit.id).toBe('U2-key-value-store')
  })

  it('may still use the author yaml on the operator surface', () => {
    window.history.replaceState(null, '', '/desktop?operator=1')
    render(<DesktopApp />)

    const desktop = screen.getByRole('main')
    expect(desktop.textContent).toContain('2 dominadas')
    expect(desktop.textContent).toContain('KV WAREHOUSE')
    expect(desktop.textContent).toContain('DOMINADA')
  })
})
