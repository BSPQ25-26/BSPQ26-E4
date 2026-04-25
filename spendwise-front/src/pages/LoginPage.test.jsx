/**
 * @file Unit tests for the login page.
 *
 * Mocks the auth service and the auth context (only the `login`
 * setter we actually need) and exercises the form via the user-event
 * library so the assertions read like real interactions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import LoginPage from './LoginPage'

vi.mock('../services/authService', () => ({
  login: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockSetAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockSetAuth }),
}))

import { login } from '../services/authService'

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the email, password and submit controls', () => {
    renderPage()

    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/•/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('logs the user in and navigates to /dashboard on success', async () => {
    login.mockResolvedValueOnce({
      access_token: 'tok',
      user_id: 'u-1',
      email: 'a@b.com',
    })

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'a@b.com')
    await user.type(screen.getByPlaceholderText(/•/), 'pw')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('a@b.com', 'pw')
    })
    expect(mockSetAuth).toHaveBeenCalledWith('tok', { email: 'a@b.com', id: 'u-1' })
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('shows the backend error inline when the login fails', async () => {
    login.mockRejectedValueOnce(new Error('Invalid credentials'))

    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'a@b.com')
    await user.type(screen.getByPlaceholderText(/•/), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument()
    expect(mockSetAuth).not.toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
