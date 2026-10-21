import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests cover pure functions only (no Nuxt runtime needed),
// so a plain node environment keeps them fast and simple.
export default defineConfig({
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
