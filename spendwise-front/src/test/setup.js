/**
 * @file Vitest setup file.
 *
 * Loaded once before any test runs (configured via `setupFiles` in
 * `vite.config.js`). Extends Vitest's built-in `expect` with the
 * matchers from `@testing-library/jest-dom` (e.g. `toBeInTheDocument`,
 * `toHaveTextContent`, `toBeDisabled`) and resets any module-level
 * mocks between tests so each spec starts from a clean slate.
 */

import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Library mounts components into a shared `document.body`.
// `cleanup()` removes them after every test so DOM state never leaks
// from one spec to the next.
afterEach(() => {
  cleanup()
})
