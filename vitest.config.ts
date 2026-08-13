import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only run unit tests — Playwright E2E tests in tests/e2e/ are run separately
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
  },
})
