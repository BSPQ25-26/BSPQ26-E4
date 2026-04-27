/**
 * @file Integration test — client-to-server communication (remoteness test).
 *
 * Unlike the unit tests in this directory, this file does NOT mock `fetch`.
 * It issues a real HTTP request to the SpendWise backend and verifies that
 * the server is reachable and responds correctly.
 *
 * Prerequisites
 * -------------
 * The backend must be running locally before executing this test:
 *
 *   cd spendwise-backend
 *   uvicorn app.main:app --port 8080
 *
 * Run only this file:
 *
 *   npm run test -- src/services/integration.test.js
 *
 * Why this test exists
 * --------------------
 * Unit tests stub `fetch` so they never touch the network. This test
 * exists specifically to prove that the client can reach the server —
 * i.e. to test *remoteness* as required by the Sprint 2 guidelines.
 */

import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost:8080/api/v1'

describe('Integration — client-server communication', () => {
  /**
   * Calls the health-check endpoint with a real HTTP request.
   *
   * The endpoint (`GET /api/v1/expenses/health`) requires no
   * authentication, so this test works without credentials.
   * A 200 response confirms:
   *   1. The backend is reachable from the client.
   *   2. The FastAPI app started correctly.
   *   3. The database connection is alive (the endpoint probes it).
   */
  it('GET /expenses/health returns 200 and a status field from the real server', async () => {
    const response = await fetch(`${API_BASE}/expenses/health`)

    expect(response.status).toBe(200)

    const body = await response.json()
    // The health endpoint returns { "status": "ok" } (or similar).
    expect(body).toHaveProperty('status')
  })

  /**
   * Verifies that the server correctly rejects an unauthenticated
   * request to a protected endpoint with 401 or 403.
   *
   * This confirms that the JWT guard is active and that the client
   * receives a proper error response (not a network failure).
   */
  it('GET /expenses/ without a token returns 401 or 403 from the real server', async () => {
    const response = await fetch(`${API_BASE}/expenses/`)

    expect([401, 403]).toContain(response.status)
  })
})
