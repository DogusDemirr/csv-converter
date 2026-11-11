import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir: './e2e', fullyParallel: true, workers: 2, retries: 0,
 reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
 use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
 projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile-chromium', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } }],
 webServer: { command: process.env.STATIC_TEST === '1' ? 'node scripts/serve-static.mjs' : 'npm run start -- --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100/en', reuseExistingServer: false, timeout: 60000 },
});
