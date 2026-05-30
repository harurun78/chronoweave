import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['test/e2e/**'],
    setupFiles: ['./test/setup.ts']
  }
});
