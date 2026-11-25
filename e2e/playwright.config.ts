import { defineConfig, devices } from '@playwright/test'
import { ADMIN, API_PORT, API_URL, DB_CONNECTION, WEB_PORT, WEB_URL } from './tests/support/env'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests',
  // The suite shares one database, so run files one after another. Each test uses unique data, but ordering
  // inside a file is still deterministic this way.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: isCI ? [['github'], ['html', { open: 'never' }], ['list']] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Locally use the installed Chrome (no browser download); CI installs Playwright's own Chromium.
    channel: isCI ? undefined : 'chrome',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], channel: isCI ? undefined : 'chrome', storageState: 'tests/.auth/admin.json' },
    },
  ],

  // Start the API (against the e2e database) and the web app. Locally an already running pair is reused.
  webServer: [
    {
      command: `dotnet run --project ../backend/src/EMS.Api --no-launch-profile --urls ${API_URL}`,
      url: `${API_URL}/api/v1/health`,
      timeout: 240_000,
      reuseExistingServer: !isCI,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ConnectionStrings__DefaultConnection: DB_CONNECTION,
        Jwt__AccessTokenSecret: 'e2e-access-secret-0123456789-abcdefghijklmnopqrstuv',
        Jwt__RefreshTokenSecret: 'e2e-refresh-secret-9876543210-vutsrqponmlkjihgfedcba',
        Seed__AdminEmail: ADMIN.email,
        Seed__AdminPassword: ADMIN.password,
        Seed__DemoData: 'true',
        RateLimiting__LoginPermitLimit: '30',
        Cors__AllowedOrigins__0: WEB_URL,
      },
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      url: WEB_URL,
      timeout: 120_000,
      reuseExistingServer: !isCI,
      stdout: 'ignore',
      env: { VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
})
