/**
 * @file Unit tests for the auth context.
 *
 * Renders a tiny consumer component that surfaces the context state as
 * data attributes, then verifies the provider's behaviour around the
 * three main flows: empty token, valid token, rejected token, plus the
 * `login` and `logout` helpers.
 *
 * The auth service module is mocked at the import level so no real
 * `fetch` calls happen.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

import { AuthProvider, useAuth } from './AuthContext'

// Mock the auth service so the context never hits the network.
vi.mock('../services/authService', () => ({
  getMe: vi.fn(),
  logout: vi.fn(),
}))

// Imported AFTER `vi.mock` so we get the mocked symbols.
import { getMe, logout as apiLogout } from '../services/authService'

/**
 * Tiny consumer component that mirrors the auth context onto the DOM
 * so the tests can assert against it via Testing Library queries.
 */
function Consumer() {
  const { user, token, loading, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login('new-tok', { id: 'u-1', email: 'new@x.com' })}>
        do-login
      </button>
      <button onClick={logout}>do-logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts with no user and stops loading when there is no stored token', async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(screen.getByTestId('token')).toHaveTextContent('none')
    expect(getMe).not.toHaveBeenCalled()
  })

  it('rehydrates the user with `getMe` when a token is already stored', async () => {
    localStorage.setItem('sw_token', 'stored-tok')
    getMe.mockResolvedValueOnce({ id: 'u-1', email: 'a@b.com' })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('a@b.com')
    })
    expect(getMe).toHaveBeenCalledWith('stored-tok')
    expect(screen.getByTestId('token')).toHaveTextContent('stored-tok')
  })

  it('clears the stored token when `getMe` rejects (stale or invalid token)', async () => {
    localStorage.setItem('sw_token', 'bad-tok')
    getMe.mockRejectedValueOnce(new Error('Invalid token'))

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none')
    })
    expect(localStorage.getItem('sw_token')).toBeNull()
  })

  it('persists the new session when `login` is called', async () => {
    // `login` sets the token, which triggers the `useEffect` that calls
    // `getMe` and overwrites the user with the fresh profile. We mock
    // it to mirror what the real backend would return.
    getMe.mockResolvedValue({ id: 'u-1', email: 'new@x.com' })

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    // Wait for the initial empty-token effect to settle.
    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    )

    await act(async () => {
      screen.getByText('do-login').click()
    })

    expect(localStorage.getItem('sw_token')).toBe('new-tok')
    // The displayed user comes from `getMe`, which fires after the
    // effect re-runs with the new token.
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('new@x.com')
    })
  })

  it('tears the session down on `logout` (best-effort backend call)', async () => {
    localStorage.setItem('sw_token', 'tok')
    getMe.mockResolvedValueOnce({ id: 'u-1', email: 'a@b.com' })
    apiLogout.mockResolvedValueOnce(undefined)

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('user')).toHaveTextContent('a@b.com'),
    )

    await act(async () => {
      screen.getByText('do-logout').click()
    })

    expect(apiLogout).toHaveBeenCalledWith('tok')
    expect(localStorage.getItem('sw_token')).toBeNull()
    expect(screen.getByTestId('user')).toHaveTextContent('none')
  })
})
