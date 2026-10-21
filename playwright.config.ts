import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
// E2E_BASE_URL=https://sun-store-zadanie.vercel.app pnpm test:e2e runs the same tests against the deployment.
const externalBaseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: externalBaseURL ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    // channel: 'chrome' uses the locally installed Chrome, no browser download needed.
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
  ],
  // Tests run against a production build: SSR, payload and hydration behave as on Vercel.
  // Rebuilding is the slow part; a server already running on the port is reused.
  webServer: externalBaseURL
    ? undefined
    : {
        command: `pnpm build && PORT=${PORT} node .output/server/index.mjs`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
})
