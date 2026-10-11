import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      exclude: [
        'dist/**',
        'scripts/**',
        'src/index.ts',
        'src/config/database.ts',
        'src/config/env.ts',
        'src/tests/**',
        '**/I*.ts',
        '**/*.d.ts',
        '**/*.test.ts',
      ],
    },
  },
});
