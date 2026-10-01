import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DesktopApp } from './DesktopApp'

afterEach(() => {
  document.body.replaceChildren()
})

function click(element: Element | null): void {
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
}

describe('learning rail focus handling (AID-3564 F3)', () => {
  it('returns focus to the learn-mode toggle after closing the rail via its close button', async () => {
    render(<DesktopApp />)
    const toggle = document.querySelector('button.learn-toggle')
    if (!(toggle instanceof HTMLButtonElement)) throw new Error('learn toggle not rendered')
    const rail = () => document.querySelector('aside.learning-rail')
    // The initial learn-mode state depends on matchMedia (wide viewports
    // start with the rail open); normalize to open before closing.
    await act(async () => {
      if (rail() === null) click(toggle)
    })
    expect(rail()).not.toBeNull()

    await act(async () => {
      click(document.querySelector('button[aria-label="Fechar Modo Aprender"]'))
      await new Promise((resolve) => {
        setTimeout(resolve, 20)
      })
    })
    expect(rail()).toBeNull()
    expect(document.activeElement).toBe(toggle)
  })
})
