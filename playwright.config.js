const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 1024 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'python -m http.server 4173 -d .',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
