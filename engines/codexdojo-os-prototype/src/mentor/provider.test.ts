import { describe, expect, it } from 'vitest'
import {
  createMentorProvider,
  SameOriginMentorProvider,
  UnavailableMentorProvider,
} from './provider'

describe('mentor provider', () => {
  it('rejects protocol-relative cross-origin endpoints', () => {
    expect(() => new SameOriginMentorProvider('//attacker.example/mentor')).toThrow(
      'Mentor endpoint must be same-origin',
    )
    expect(createMentorProvider('//attacker.example/mentor')).toBeInstanceOf(
      UnavailableMentorProvider,
    )
  })
})
