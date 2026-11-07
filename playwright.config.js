import {defineConfig} from '@playwright/test';

const target = process.env.TEST_URL;
export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: target || 'http://127.0.0.1:4173',
    channel: process.env.TEST_BROWSER || 'chromium',
  },
  webServer: target ? undefined : {
    command: 'npm start',
    url: 'http://127.0.0.1:4173',
    env: {TEST_DB: ':memory:'},
  },
});
