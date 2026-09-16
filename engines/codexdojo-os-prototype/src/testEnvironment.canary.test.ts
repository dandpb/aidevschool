import { expect, test } from 'vitest'
import * as React from 'react'
import * as ReactDOMTestUtils from 'react-dom/test-utils'

test('vitest worker resolves a development-capable react build (React.act available)', () => {
  expect(typeof (React as { act?: unknown }).act).toBe('function')
  expect(typeof (ReactDOMTestUtils as { act?: unknown }).act).toBe('function')
})
