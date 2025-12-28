import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'analysis-bundle/**',
    ],
    alias: {
      '@/': path.resolve(__dirname, './src/'),
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src/'),
    },
  },
});
