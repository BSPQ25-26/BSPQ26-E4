/**
 * @file Unit tests for the standalone `PrivateRoute` guard.
 *
 * The component is rendered inside a `MemoryRouter` so the redirect
 * behaviour can be observed by checking which route is active.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import PrivateRoute from './PrivateRoute'

// Mock the auth context module so each test can decide the value
// returned by `useAuth` without setting up a real provider.
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../context/AuthContext'

/**
 * Render the guard at `/secret` together with a stub login screen, so
 * tests can detect a redirect by looking for the login marker.
 *
 * @param {() => JSX.Element} secretContent - What `PrivateRoute` should render when the user is authenticated.
 */
function renderWithRouter(secretContent) {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route
          path="/secret"
          element={<PrivateRoute>{secretContent}</PrivateRoute>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrivateRoute', () => {
  it('shows the loading placeholder while the auth context is resolving', () => {
    useAuth.mockReturnValue({ user: null, loading: true })

    renderWithRouter(<p>Secret page</p>)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
  })

  it('renders its children when the user is authenticated', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1' }, loading: false })

    renderWithRouter(<p>Secret page</p>)

    expect(screen.getByText('Secret page')).toBeInTheDocument()
  })

  it('redirects to /login when the user is not authenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false })

    renderWithRouter(<p>Secret page</p>)

    expect(screen.getByText('Login screen')).toBeInTheDocument()
    expect(screen.queryByText('Secret page')).not.toBeInTheDocument()
  })
})
