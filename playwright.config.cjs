/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: "./tests/browser",
  timeout: 30_000,
  use: {
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 720 },
    baseURL: "http://127.0.0.1:5173",
    screenshot: "off",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  },
};
