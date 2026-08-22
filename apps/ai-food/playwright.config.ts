import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 5173);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    // Chromium 142+ LNA: allow localhost Vite + gateway mocks in e2e.
    permissions: ['local-network-access'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      // Ensure gateway URL is set so analyze client paths are exercised;
      // network is intercepted in tests — no real OpenRouter calls.
      VITE_AI_GATEWAY_URL:
        process.env.VITE_AI_GATEWAY_URL ?? 'http://127.0.0.1:3000',
      VITE_AI_GATEWAY_API_KEY:
        process.env.VITE_AI_GATEWAY_API_KEY ?? 'e2e-test-key',
      VITE_AUTH_MOCK: process.env.VITE_AUTH_MOCK ?? 'true',
    },
  },
});
