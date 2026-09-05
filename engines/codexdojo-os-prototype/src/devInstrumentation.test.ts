import { describe, expect, it } from 'vitest'
import { shouldEnableReactInstrumentation } from './devInstrumentation'

describe('shouldEnableReactInstrumentation', () => {
  it('keeps React instrumentation off during ordinary Vite development', () => {
    expect(shouldEnableReactInstrumentation({ DEV: true })).toBe(false)
  })

  it('enables React instrumentation only when a developer explicitly opts in', () => {
    expect(shouldEnableReactInstrumentation({
      DEV: true,
      VITE_ENABLE_REACT_INSTRUMENTATION: '1',
    })).toBe(true)
  })

  it('never enables development instrumentation in a production build', () => {
    expect(shouldEnableReactInstrumentation({
      DEV: false,
      VITE_ENABLE_REACT_INSTRUMENTATION: '1',
    })).toBe(false)
  })
})

