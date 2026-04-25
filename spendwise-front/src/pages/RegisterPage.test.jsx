/**
 * @file Unit tests for the registration page.
 *
 * Same approach as LoginPage.test.jsx: mock the service and the
 * router's `useNavigate`, drive the form with user-event.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

import RegisterPage from './RegisterPage'

vi.mock('../services/authService', () => ({
  register: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { register } from '../services/authService'

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Use fake timers so we can fast-forward the 3-second redirect
    // delay without actually waiting for it.
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the registration form fields', () => {
    renderPage()

    expect(screen.getByPlaceholderText(/jane doe/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/min\. 6 characters/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows the success notice and schedules the redirect on success', async () => {
    register.mockResolvedValueOnce({ message: 'User registered', user_id: 'u-1' })

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await user.type(screen.getByPlaceholderText(/jane doe/i), 'Jane')
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'a@b.com')
    await user.type(screen.getByPlaceholderText(/min\. 6 characters/i), 'secret1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/account created/i)).toBeInTheDocument()
    expect(register).toHaveBeenCalledWith('a@b.com', 'secret1', 'Jane')

    // Fast-forward past the 3s setTimeout to trigger the redirect.
    vi.advanceTimersByTime(3000)
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('shows the backend error inline when registration fails', async () => {
    register.mockRejectedValueOnce(new Error('Email already in use'))

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderPage()

    await user.type(screen.getByPlaceholderText(/you@example\.com/i), 'a@b.com')
    await user.type(screen.getByPlaceholderText(/min\. 6 characters/i), 'secret1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/email already in use/i)).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
