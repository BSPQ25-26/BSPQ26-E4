/**
 * @file Smoke tests for the dashboard page.
 *
 * The dashboard pulls from many service functions, owns a lot of local
 * state and renders charts via Recharts. A full UI test would be
 * disproportionate, so we keep the coverage here to:
 *
 * - The page renders without crashing when every service is mocked
 *   with an empty result.
 * - The tab switcher toggles between Dashboard and Add Expense.
 * - The "Sign out" button calls the auth context and navigates away.
 *
 * Recharts is heavy on layout APIs that jsdom does not implement; a
 * small `ResponsiveContainer` shim keeps the test environment quiet.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Replace Recharts' ResponsiveContainer with a div that simply renders
// its children. The real component measures its parent and bails out
// when the size is 0 (which is always the case in jsdom), so charts
// would otherwise be invisible during the test.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  }
})

vi.mock('../services/expenseService', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
  getHiddenCategories: vi.fn().mockResolvedValue([]),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  hideCategory: vi.fn(),
  unhideCategory: vi.fn(),
  getExpenses: vi.fn().mockResolvedValue([]),
  getDashboardAnalytics: vi.fn().mockResolvedValue({
    month_total: 0,
    category_breakdown: [],
    daily_breakdown: [],
  }),
  getDashboardSummary: vi.fn().mockResolvedValue({
    total_monthly_spending: 0,
    average_daily_costs: 0,
    month: 1,
    year: 2026,
  }),
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockLogout = vi.fn().mockResolvedValue(undefined)
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u-1', email: 'a@b.com' },
    token: 'tok',
    logout: mockLogout,
  }),
}))

import DashboardPage from './DashboardPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the navigation header and the empty-state message', async () => {
    renderPage()

    // Navigation: app name + user email + sign out.
    expect(screen.getAllByText(/spendwise/i).length).toBeGreaterThan(0)
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()

    // The dashboard tab is selected by default; with no expenses we
    // expect the empty-state message to show up after the data loads.
    await waitFor(() => {
      expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument()
    })
  })

  it('switches to the Add Expense tab when its button is clicked', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /add expense/i }))

    // The "Add expense" form heading only exists in the second tab.
    expect(screen.getByRole('heading', { name: /^add expense$/i })).toBeInTheDocument()
  })

  it('signs the user out and navigates to /login', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /sign out/i }))

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled()
    })
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })
})
