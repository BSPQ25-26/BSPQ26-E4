/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite + Vitest configuration. Vitest reads the `test` block below;
// everything outside it is plain Vite (used by `npm run dev` and
// `npm run build`).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    // Run tests in a fake browser DOM so Testing Library can render
    // React components without a real browser.
    environment: 'jsdom',
    // Make Vitest globals (`describe`, `it`, `expect`, `vi`, ...)
    // available in test files without explicit imports — matches the
    // ergonomics of Jest.
    globals: true,
    // Module loaded once before any test file. Sets up the
    // `@testing-library/jest-dom` matchers and other globals.
    setupFiles: ['./src/test/setup.js'],
    // Don't try to scan the documentation build output or
    // node_modules for test files.
    exclude: ['node_modules', 'dist', 'docs'],
    coverage: {
      // V8 is faster than istanbul and ships with Node, so it's the
      // default we standardise on.
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Limit coverage to the actual source code; tests, config and
      // build outputs would otherwise dilute the percentage.
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/**/*.test.{js,jsx}',
      ],
    },
  },
})
