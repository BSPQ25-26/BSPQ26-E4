/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Vitest configuration used exclusively for integration tests.
 *
 * Integration tests make real HTTP calls to the running backend, so
 * they are kept out of the standard `npm test` / `npm run test:coverage`
 * cycle and must be triggered explicitly with:
 *
 *   npm run test:integration
 *
 * Prerequisites: the backend must be running on http://localhost:8080
 *   cd spendwise-backend
 *   uvicorn app.main:app --reload --port 8080
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Integration tests use the real fetch API — no jsdom needed.
    environment: 'node',
    // Only pick up files that end with .integration.test.{js,ts}
    include: ['src/**/*.integration.test.{js,ts,jsx,tsx}'],
    // No exclude overrides: we want ALL integration test files.
    exclude: ['node_modules'],
    // No coverage — integration tests hit the real network.
    reporters: ['verbose'],
  },
})
