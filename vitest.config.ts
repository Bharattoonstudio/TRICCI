import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // p0-* tests are database integration tests. They are skipped by default so a normal run never
    // touches a database. Set RUN_DB_TESTS=1 with a dedicated test DATABASE_URL to run them.
    exclude: process.env.RUN_DB_TESTS ? ['node_modules/**'] : ['node_modules/**', 'src/tests/p0-*.test.ts', 'src/tests/*.db.test.ts'],
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Use forks pool to isolate memory per test file (prevents OOM)
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 4, // Limit parallelism to prevent memory exhaustion
        isolate: true, // Each test file runs in fresh process
      },
    },
    // Limit concurrent tests within each file
    maxConcurrency: 5,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        '*.config.ts',
      ],
    },
  },
  resolve: {
    alias: [
      { find: 'virtual:format-overrides', replacement: path.resolve(__dirname, './src/test/format-overrides-module.ts') },
      { find: /^@\//, replacement: path.resolve(__dirname, './src') + '/' },
      { find: '@/components', replacement: path.resolve(__dirname, './src/components') },
      { find: '@/lib', replacement: path.resolve(__dirname, './src/lib') },
      { find: '@/api', replacement: path.resolve(__dirname, './src/server/api') },
      { find: '@/db', replacement: path.resolve(__dirname, './src/server/db') },
      { find: '@/layouts', replacement: path.resolve(__dirname, './src/layouts') },
      { find: '@/patterns', replacement: path.resolve(__dirname, './src/patterns') },
      { find: '@/pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '@/hooks', replacement: path.resolve(__dirname, './src/hooks') },
      { find: '@/styles', replacement: path.resolve(__dirname, './src/styles') },
    ],
  },
});
