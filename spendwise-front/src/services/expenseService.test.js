/**
 * @file Unit tests for the expense service.
 *
 * Mirrors the structure of the auth service tests: every exported
 * function is tested for at least one happy path; a couple of error
 * paths are added to make sure the `Error` wrapping behaves as expected.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getCategories,
  getHiddenCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  hideCategory,
  unhideCategory,
  getExpenses,
  getDashboardAnalytics,
  createExpense,
  updateExpense,
  deleteExpense,
  getDashboardSummary,
  getAlertStatuses,
  exportExpensesToCSV,
} from './expenseService'

/**
 * Stable reference object used by the hoisted xlsx vi.mock factory.
 * Because vi.mock() is hoisted before variable declarations, closures
 * inside the factory cannot safely reference `let`/`const` variables
 * declared in the test body. Instead we use a plain object whose
 * properties are mutated per-test.
 */
const xlsxCapture = { data: null }

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn((data) => { xlsxCapture.data = data; return {} }),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new Uint8Array([1, 2, 3])),
}))

function fakeResponse({ ok = true, status = 200, body = {} } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('expenseService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('getCategories()', () => {
    it('returns the parsed list of categories', async () => {
      const categories = [
        { id: 1, name: 'Food', icon: '🍔' },
        { id: 2, name: 'Transport', icon: '🚌' },
      ]
      fetch.mockResolvedValueOnce(fakeResponse({ body: categories }))

      const result = await getCategories('tok')

      expect(result).toEqual(categories)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/$/)
      expect(init.headers.Authorization).toBe('Bearer tok')
    })

    it('throws when the backend errors out', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 500, body: { detail: 'boom' } }),
      )

      await expect(getCategories('tok')).rejects.toThrow('boom')
    })
  })

  describe('getHiddenCategories()', () => {
    it('returns the parsed list of hidden shared categories', async () => {
      const categories = [{ id: 4, name: 'Travel', icon: '✈️' }]
      fetch.mockResolvedValueOnce(fakeResponse({ body: categories }))

      const result = await getHiddenCategories('tok')

      expect(result).toEqual(categories)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/hidden$/)
      expect(init.headers.Authorization).toBe('Bearer tok')
    })
  })

  describe('category CRUD helpers', () => {
    it('POSTs a new category and returns it', async () => {
      const inserted = { id: 10, name: 'Pets', icon: '🐶' }
      fetch.mockResolvedValueOnce(fakeResponse({ body: inserted }))

      const result = await createCategory('tok', { name: 'Pets', icon: '🐶' })

      expect(result).toEqual(inserted)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/$/)
      expect(init.method).toBe('POST')
    })

    it('PUTs category changes', async () => {
      const updated = { id: 1, name: 'Food & Drinks' }
      fetch.mockResolvedValueOnce(fakeResponse({ body: updated }))

      const result = await updateCategory('tok', 1, { name: 'Food & Drinks' })

      expect(result).toEqual(updated)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/1$/)
      expect(init.method).toBe('PUT')
    })

    it('DELETEs a category', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ ok: true, status: 204 }))

      await expect(deleteCategory('tok', 1)).resolves.toBeUndefined()
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/1$/)
      expect(init.method).toBe('DELETE')
    })

    it('POSTs hide for a shared category', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ ok: true, status: 204 }))

      await expect(hideCategory('tok', 8)).resolves.toBeUndefined()
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/8\/hide$/)
      expect(init.method).toBe('POST')
    })

    it('DELETEs hide to restore a shared category', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ ok: true, status: 204 }))

      await expect(unhideCategory('tok', 8)).resolves.toBeUndefined()
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/categories\/8\/hide$/)
      expect(init.method).toBe('DELETE')
    })
  })

  describe('getExpenses()', () => {
    it('appends every provided filter as a query-string param', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ body: [] }))

      await getExpenses('tok', {
        month: 4,
        year: 2026,
        category_id: 7,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
      })

      const [url] = fetch.mock.calls[0]
      expect(url).toMatch(/\/expenses\/\?/)
      expect(url).toContain('month=4')
      expect(url).toContain('year=2026')
      expect(url).toContain('category_id=7')
      expect(url).toContain('start_date=2026-04-01')
      expect(url).toContain('end_date=2026-04-30')
    })

    it('omits filters that are not provided', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ body: [] }))

      await getExpenses('tok')

      const [url] = fetch.mock.calls[0]
      // No filter params -> the query string after `?` is empty.
      expect(url.endsWith('/expenses/?')).toBe(true)
    })
  })

  describe('getDashboardAnalytics()', () => {
    it('returns the analytics payload', async () => {
      const analytics = {
        month_total: 123.45,
        category_breakdown: [],
        daily_breakdown: [],
      }
      fetch.mockResolvedValueOnce(fakeResponse({ body: analytics }))

      const result = await getDashboardAnalytics('tok', {
        month: 4,
        year: 2026,
        category_id: 7,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
      })

      expect(result).toEqual(analytics)
      const [url] = fetch.mock.calls[0]
      expect(url).toContain('/expenses/analytics?')
      expect(url).toContain('month=4')
      expect(url).toContain('year=2026')
      expect(url).toContain('category_id=7')
      expect(url).toContain('start_date=2026-04-01')
      expect(url).toContain('end_date=2026-04-30')
    })
  })

  describe('createExpense()', () => {
    it('POSTs the JSON body and returns the inserted row', async () => {
      const inserted = { id: 99, amount: 12.5 }
      fetch.mockResolvedValueOnce(fakeResponse({ body: inserted }))

      const data = { amount: 12.5, expense_date: '2026-04-01' }
      const result = await createExpense('tok', data)

      expect(result).toEqual(inserted)
      const [, init] = fetch.mock.calls[0]
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual(data)
    })

    it('throws when the backend rejects the payload', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 400, body: { detail: 'bad data' } }),
      )

      await expect(createExpense('tok', {})).rejects.toThrow('bad data')
    })
  })

  describe('updateExpense()', () => {
    it('PUTs to the expense URL and returns the updated row', async () => {
      const updated = { id: 1, amount: 99 }
      fetch.mockResolvedValueOnce(fakeResponse({ body: updated }))

      const result = await updateExpense('tok', 1, { amount: 99 })

      expect(result).toEqual(updated)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/expenses\/1$/)
      expect(init.method).toBe('PUT')
    })
  })

  describe('deleteExpense()', () => {
    it('resolves silently on a 204 response', async () => {
      fetch.mockResolvedValueOnce(fakeResponse({ ok: true, status: 204 }))

      await expect(deleteExpense('tok', 1)).resolves.toBeUndefined()
      const [url, init] = fetch.mock.calls[0]
      expect(url).toMatch(/\/expenses\/1$/)
      expect(init.method).toBe('DELETE')
    })

    it('throws when the backend returns a non-2xx, non-204 status', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 404, body: { detail: 'not found' } }),
      )

      await expect(deleteExpense('tok', 999)).rejects.toThrow('not found')
    })
  })

  describe('getDashboardSummary()', () => {
    it('returns the parsed summary', async () => {
      const summary = {
        total_monthly_spending: 200,
        average_daily_costs: 10,
        month: 4,
        year: 2026,
      }
      fetch.mockResolvedValueOnce(fakeResponse({ body: summary }))

      const result = await getDashboardSummary('tok', { month: 4, year: 2026 })

      expect(result).toEqual(summary)
      const [url] = fetch.mock.calls[0]
      expect(url).toContain('/dashboard/summary?')
    })
  })

  describe('getAlertStatuses()', () => {
    it('fetches budget comparison statuses for the requested period', async () => {
      const statuses = [
        {
          id: 1,
          category_id: 2,
          category_name: 'Food',
          month: 4,
          year: 2026,
          limit_amount: 200,
          spent_amount: 120,
          remaining_amount: 80,
          status: 'ok',
          is_over_limit: false,
        },
      ]
      fetch.mockResolvedValueOnce(fakeResponse({ body: statuses }))

      const result = await getAlertStatuses('tok', { month: 4, year: 2026 })

      expect(result).toEqual(statuses)
      const [url, init] = fetch.mock.calls[0]
      expect(url).toContain('/alerts/statuses?')
      expect(url).toContain('month=4')
      expect(url).toContain('year=2026')
      expect(init.headers.Authorization).toBe('Bearer tok')
    })

    it('throws when the backend rejects the request', async () => {
      fetch.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 500, body: { detail: 'comparison unavailable' } }),
      )

      await expect(getAlertStatuses('tok', { month: 4, year: 2026 })).rejects.toThrow('comparison unavailable')
    })
  })

  describe('exportExpensesToCSV()', () => {
    /** @type {{ href: string, setAttribute: ReturnType<typeof vi.fn>, click: ReturnType<typeof vi.fn> }} */
    let createdLink

    beforeEach(() => {
      // Reset the capture buffer before each test.
      xlsxCapture.data = null

      // Stub URL APIs that are unavailable in jsdom.
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: vi.fn(),
      })

      // Capture the <a> element created for the download.
      createdLink = null
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          const a = { href: '', setAttribute: vi.fn(), click: vi.fn() }
          createdLink = a
          return a
        }
        return Object.create(HTMLElement.prototype)
      })
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      vi.resetModules()
    })

    it('passes a header row with the expected column names to SheetJS', async () => {
      exportExpensesToCSV([])
      await new Promise((r) => setTimeout(r, 0))

      expect(xlsxCapture.data[0]).toEqual(['ID', 'Date', 'Amount', 'Description', 'Category', 'Payment Method'])
    })

    it('passes each expense as a data row to SheetJS', async () => {
      const expenses = [
        {
          id: 1,
          expense_date: '2026-05-01',
          amount: 42.5,
          description: 'Lunch',
          categories: { name: 'Food' },
          payment_method: 'card',
        },
      ]

      exportExpensesToCSV(expenses)
      await new Promise((r) => setTimeout(r, 0))

      expect(xlsxCapture.data).toHaveLength(2) // header + 1 data row
      expect(xlsxCapture.data[1]).toEqual([1, '2026-05-01', 42.5, 'Lunch', 'Food', 'card'])
    })

    it('stores the amount as a Number so Excel treats it as numeric', async () => {
      const expenses = [{
        id: 2, expense_date: '2026-05-02', amount: '19.99',
        description: null, categories: null, payment_method: 'cash',
      }]

      exportExpensesToCSV(expenses)
      await new Promise((r) => setTimeout(r, 0))

      expect(typeof xlsxCapture.data[1][2]).toBe('number')
      expect(xlsxCapture.data[1][2]).toBeCloseTo(19.99)
    })

    it('handles expenses with no category (categories is undefined)', async () => {
      const expenses = [{
        id: 3, expense_date: '2026-05-03', amount: 8,
        description: null, categories: undefined, payment_method: 'transfer',
      }]

      exportExpensesToCSV(expenses)
      await new Promise((r) => setTimeout(r, 0))

      expect(xlsxCapture.data[1][3]).toBe('') // description
      expect(xlsxCapture.data[1][4]).toBe('') // category
    })

    it('creates only the header row when the expenses array is empty', async () => {
      exportExpensesToCSV([])
      await new Promise((r) => setTimeout(r, 0))

      expect(xlsxCapture.data).toHaveLength(1)
    })

    it('uses the provided filename as the download attribute', async () => {
      exportExpensesToCSV([], 'my-export.xlsx')
      await new Promise((r) => setTimeout(r, 0))

      expect(createdLink.setAttribute).toHaveBeenCalledWith('download', 'my-export.xlsx')
    })

    it('defaults to "spendwise-expenses.xlsx" when no filename is given', async () => {
      exportExpensesToCSV([])
      await new Promise((r) => setTimeout(r, 0))

      expect(createdLink.setAttribute).toHaveBeenCalledWith('download', 'spendwise-expenses.xlsx')
    })
  })
})
