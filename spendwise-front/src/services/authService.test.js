/**
 * @file Unit tests for the auth service.
 *
 * Each function is exercised on both the success path (the backend
 * returns 2xx and a JSON body) and the error path (the backend returns
 * a non-2xx response with a `detail` field). The global `fetch` is
 * stubbed per test via `vi.stubGlobal` so we never hit the real
 * network.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { register, login, getMe, logout } from './authService'

/**
 * Build a minimal `Response`-shaped stub that the service treats like a
 * real fetch response.
 *
 * @param {Object} options
 * @param {boolean} [options.ok=true] - Mirrors `Response.ok`.
 * @param {number} [options.status=200] - HTTP status code.
 * @param {*} [options.body={}] - Object returned by `.json()`.
 */
function fakeResponse({ ok = true, status = 200, body = {} } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('authService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('register()', () => {
    it('POSTs the credentials and returns the parsed body on success', async () => {
      const payload = { message: 'User registered', user_id: 'u-1' }
      fetch.mockResolvedValueOnce(fakeResponse({ body: payload }))

      const result = await register('a@b.com', 'pw', 'Jane')

      expect(result).toEqual(payload)
      expect(fetch).toHaveBeenCalledTimes(1)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/auth\/register$/)
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({
        email: 'a@b.com',
        password: 'pw',
        full_name: 'Jane',
      })
    })

    it('throws an Error carrying the backend `detail` when the response is not ok', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 400, body: { detail: 'Email already in use' } }),
      )

      await expect(register('a@b.com', 'pw')).rejects.toThrow('Email already in use')
    })

    it('falls back to a generic error message when no `detail` is provided', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ ok: false, status: 500, body: {} }))

      await expect(register('a@b.com', 'pw')).rejects.toThrow('Registration failed')
    })
  })

  describe('login()', () => {
    it('returns the session payload on success', async () => {
      const session = {
        access_token: 'tok',
        token_type: 'bearer',
        user_id: 'u-1',
        email: 'a@b.com',
      }
      fetch.mockResolvedValueOnce(fakeResponse({ body: session }))

      const result = await login('a@b.com', 'pw')

      expect(result).toEqual(session)
      const [, init] = fetch.mock.calls[0]
      expect(JSON.parse(init.body)).toEqual({ email: 'a@b.com', password: 'pw' })
    })

    it('throws when the credentials are rejected', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 401, body: { detail: 'Invalid credentials' } }),
      )

      await expect(login('a@b.com', 'pw')).rejects.toThrow('Invalid credentials')
    })
  })

  describe('getMe()', () => {
    it('attaches the bearer token and returns the profile', async () => {
      const profile = { id: 'u-1', email: 'a@b.com', full_name: 'Jane' }
      fetch.mockResolvedValueOnce(fakeResponse({ body: profile }))

      const result = await getMe('tok')

      expect(result).toEqual(profile)
      const [, init] = fetch.mock.calls[0]
      expect(init.headers.Authorization).toBe('Bearer tok')
    })

    it('throws when the token is rejected', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 401, body: { detail: 'Invalid or expired token' } }),
      )

      await expect(getMe('bad-tok')).rejects.toThrow('Invalid or expired token')
    })
  })

  describe('logout()', () => {
    it('POSTs to the logout endpoint with the bearer token', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ status: 204, body: null }))

      await logout('tok')

      expect(fetch).toHaveBeenCalledTimes(1)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/auth\/logout$/)
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe('Bearer tok')
    })

    it('does not throw even if the backend errors out', async () => {
      // The auth service intentionally swallows logout failures so the
      // UI can still tear the local session down.
      fetch.mockResolvedValueOnce(fakeResponse({ ok: false, status: 500 }))

      await expect(logout('tok')).resolves.toBeUndefined()
    })
  })
})
