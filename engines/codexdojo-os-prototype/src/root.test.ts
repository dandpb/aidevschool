import { describe, expect, it } from 'vitest'
import { RootElementMissingError, requireRootElement } from './root'

describe('requireRootElement', () => {
  it('returns the configured application root', () => {
    document.body.innerHTML = '<main id="root"></main>'

    expect(requireRootElement(document)).toBe(document.querySelector('#root'))
  })

  it('fails explicitly when the application root is absent', () => {
    document.body.innerHTML = ''

    expect(() => requireRootElement(document)).toThrow(RootElementMissingError)
  })
})
