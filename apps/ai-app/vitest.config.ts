import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'lib/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'lib/**/*.test.ts',
        'src/generated/**',
        'src/server.ts',
        '**/*.d.ts',
      ],
      // Baseline ~83% lines; prevent silent regression.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 90,
        branches: 70,
      },
    },
  },
});
