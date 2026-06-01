import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.integration.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
