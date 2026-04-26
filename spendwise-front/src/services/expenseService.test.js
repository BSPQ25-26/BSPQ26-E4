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
} from './expenseService'

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
})
