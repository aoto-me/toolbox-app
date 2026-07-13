import { defineConfig } from '@playwright/test';

const E2E_PORT = 3001;

export default defineConfig({
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx next build && npx next start --port ${E2E_PORT}`,
    env: {
      AUTH_SECRET: 'e2e-test-secret-key-do-not-use-in-production',
      AUTH_URL: `http://localhost:${E2E_PORT}`,
      DATABASE_SSL: 'false',
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        'postgresql://testuser:testpassword@db-test:5432/toolbox_test',
    },
    reuseExistingServer: false,
    timeout: 120000,
    url: `http://localhost:${E2E_PORT}`,
  },
  workers: 1,
});
