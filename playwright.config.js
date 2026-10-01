// Pruebas de navegador para el sitio generado (_site).
// BASE_URL: servidor local en CI (python -m http.server) o https://pablotosar.com
// para comprobar producción sin compilar.
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4000',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-sm', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium' } },
  ],
});
