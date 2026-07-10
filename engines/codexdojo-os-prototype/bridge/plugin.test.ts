import { describe, expect, it } from 'vitest'
import {
  BridgeConcurrencyGate,
  getBridgeAuthorizationError,
  getSessionAuthorizationError,
  isLoopbackAddress,
} from './plugin'

describe('engine bridge loopback boundary', () => {
  it.each(['127.0.0.1', '127.0.0.2', '::1', '::ffff:127.0.0.1'])(
    'accepts loopback address %s',
    (address) => {
      expect(isLoopbackAddress(address)).toBe(true)
    },
  )

  it.each([undefined, '0.0.0.0', '192.168.1.10', '::ffff:192.168.1.10'])(
    'rejects non-loopback address %s',
    (address) => {
      expect(isLoopbackAddress(address)).toBe(false)
    },
  )
})

describe('engine bridge browser authorization', () => {
  const validRequest = {
    remoteAddress: '127.0.0.1',
    origin: 'http://127.0.0.1:4174',
    host: '127.0.0.1:4174',
    contentType: 'application/json',
    token: 'session-token',
  }

  it('accepts only an authenticated same-origin JSON request', () => {
    expect(getBridgeAuthorizationError(validRequest, 'session-token')).toBeNull()
  })

  it.each([
    [{ ...validRequest, origin: 'https://attacker.example' }, 'origin-forbidden'],
    [{ ...validRequest, contentType: 'text/plain' }, 'json-required'],
    [{ ...validRequest, token: 'wrong-token' }, 'invalid-token'],
    [{ ...validRequest, remoteAddress: '192.168.1.10' }, 'loopback-only'],
  ])('rejects an unauthorized request', (request, expectedError) => {
    expect(getBridgeAuthorizationError(request, 'session-token')).toBe(expectedError)
  })

  it('allows only one subprocess-backed action at a time', () => {
    const gate = new BridgeConcurrencyGate(1)

    expect(gate.tryAcquire()).toBe(true)
    expect(gate.tryAcquire()).toBe(false)
    gate.release()
    expect(gate.tryAcquire()).toBe(true)
  })
})

describe('engine bridge session bootstrap', () => {
  const validRequest = {
    remoteAddress: '127.0.0.1',
    method: 'GET',
    fetchSite: 'same-origin',
  }

  it('allows only a same-origin browser fetch from loopback', () => {
    expect(getSessionAuthorizationError(validRequest)).toBeNull()
  })

  it.each([
    [{ ...validRequest, remoteAddress: '192.168.1.10' }, 'loopback-only'],
    [{ ...validRequest, method: 'POST' }, 'method-not-allowed'],
    [{ ...validRequest, fetchSite: 'cross-site' }, 'origin-forbidden'],
    [{ ...validRequest, fetchSite: undefined }, 'origin-forbidden'],
  ])('rejects an unsafe session request', (request, expectedError) => {
    expect(getSessionAuthorizationError(request)).toBe(expectedError)
  })
})
