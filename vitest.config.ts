import path from 'path';
import { defineConfig } from 'vitest/config';

// Mirrors the `@` -> `./src` alias from vite.config.ts so test imports can use
// either relative paths or the alias. Pure game/combat logic is environment-free,
// so the test environment is `node` (no jsdom needed).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
