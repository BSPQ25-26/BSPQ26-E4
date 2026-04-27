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
import { beforeEach, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// ---------------------------------------------------------------------------
// localStorage — stateful in-memory stub
//
// Vitest 4.x passes `--localstorage-file` to the jsdom worker, which
// replaces the native localStorage with a file-backed implementation that
// has no `.clear()` method AND can re-initialise between test files.
//
// Using vi.stubGlobal inside beforeEach (instead of a one-time
// Object.defineProperty) guarantees the stub is always in place before
// every single test, regardless of what jsdom does between test files.
// ---------------------------------------------------------------------------
let _store = {}
const localStorageMock = {
  getItem:    (key)        => Object.prototype.hasOwnProperty.call(_store, key) ? _store[key] : null,
  setItem:    (key, value) => { _store[key] = String(value) },
  removeItem: (key)        => { delete _store[key] },
  clear:      ()           => { _store = {} },
  get length()             { return Object.keys(_store).length },
  key:        (i)          => Object.keys(_store)[i] ?? null,
}

beforeEach(() => {
  // Reset store and re-apply stub so jsdom can never sneak its broken
  // implementation in between tests.
  _store = {}
  vi.stubGlobal('localStorage', localStorageMock)
})

// React Testing Library mounts components into a shared `document.body`.
// `cleanup()` removes them after every test so DOM state never leaks
// from one spec to the next.
afterEach(() => {
  cleanup()
})
