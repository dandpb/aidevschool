import { describe, expect, it } from 'vitest'
import { isOperatorSurface } from './operatorSurface'

describe('operatorSurface', () => {
  it('defaults to student in production-like builds', () => {
    window.history.replaceState(null, '', '/desktop')
    expect(isOperatorSurface()).toBe(import.meta.env.DEV)
  })

  it('honors explicit operator query overrides', () => {
    window.history.replaceState(null, '', '/desktop?operator=1')
    expect(isOperatorSurface()).toBe(true)

    window.history.replaceState(null, '', '/desktop?operator=0')
    expect(isOperatorSurface()).toBe(false)
  })
})
