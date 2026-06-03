import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'; // hoisted import (no top-level await — robustness)

// Server source imports the shared package by name (production resolves to dist via package
// exports). In tests we alias it to the TS source so no prebuild step is needed.
const sharedSrc = resolve(import.meta.dirname, 'packages/shared/src/index.ts');

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        resolve: { alias: { '@red-tetris/shared': sharedSrc } },
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'packages/server/**/*.{test,spec}.ts',
            'packages/shared/**/*.{test,spec}.ts',
          ],
        },
      },
      {
        extends: true,
        plugins: [tsconfigPaths()],
        test: {
          name: 'client',
          environment: 'jsdom',
          globals: true,
          setupFiles: ['./packages/client/vitest.setup.ts'],
          include: ['packages/client/**/*.{test,spec}.{ts,tsx}'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      all: true,
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.*',
        '**/dist/**',
        '**/*.d.ts',
        '**/index.ts',
        // type-only modules (no runtime code to cover)
        'packages/shared/src/types.ts',
        'packages/shared/src/protocol.ts',
        'packages/client/src/main.tsx',
        'packages/client/src/socket/**',
        'packages/server/src/index.ts',
        'packages/server/src/config.ts',
        'packages/server/src/socket/index.ts',
        'packages/server/src/http/**',
      ],
      thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
    },
  },
});
