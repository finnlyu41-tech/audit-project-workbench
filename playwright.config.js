import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:4173/audit-project-workbench/",
    locale: "en-HK",
    timezoneId: "Asia/Hong_Kong",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: { timeout: 8_000 },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/audit-project-workbench/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-stability", testMatch: ["**/edge-safety.spec.js", "**/operation-boundaries.spec.js", "**/outstanding-light.spec.js", "**/outstanding-center.spec.js", "**/workspace-session.spec.js", "**/stability-recovery.spec.js", "**/group-quick-update.spec.js",
        "**/action-workbench.spec.js", "**/holding-components.spec.js", "**/outstanding-continuous.spec.js",
        "**/client-follow-up.spec.js", "**/workflow-effort.spec.js"],
      use: { browserName: "webkit", viewport: { width: 1440, height: 900 } } },
  ],
  outputDir: "test-results",
});
