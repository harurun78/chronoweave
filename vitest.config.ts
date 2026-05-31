import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['test/e2e/**'],
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/analysis/**', 'src/trace/**', 'src/schema/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 60
      }
    }
  }
});
