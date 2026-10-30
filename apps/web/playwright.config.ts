import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout du site. Prérequis : Supabase local démarré et données de démo
 * chargées (pnpm db:reset). Par défaut, le serveur de production est lancé (pnpm build && pnpm start) ;
 * définir E2E_BASE_URL pour tester un serveur déjà démarré (ou une prévisualisation de test).
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3100';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'pnpm build && pnpm start --port 3100', url: `${baseURL}/api/health`, timeout: 300_000, reuseExistingServer: !process.env.CI },
});
