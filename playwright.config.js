import { defineConfig, devices } from "@playwright/test";
import { webkitLaunchOptions } from "./scripts/playwright-webkit.mjs";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  // Three isolated workers fit the public 4-vCPU runner and leave time for the
  // complete production gate inside the unchanged 40-minute job budget.
  workers: process.env.CI ? 3 : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report/dev" }], ["json", { outputFile: "playwright-results/dev.json" }]]
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
    command: "pnpm dev --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/audit-project-workbench/",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "webkit-stability", testMatch: ["**/simple-workstream.spec.js", "**/simple-workstream-form.spec.js", "**/efficiency-entry.spec.js", "**/efficiency-batch.spec.js", "**/efficiency-output.spec.js", "**/efficiency-recovery.spec.js", "**/working-days.spec.js", "**/schedule-doi.spec.js", "**/schedule-usability.spec.js", "**/project-priority.spec.js", "**/workspace-space.spec.js", "**/group-usability.spec.js", "**/linked-file-safety.spec.js", "**/edge-safety.spec.js", "**/operation-boundaries.spec.js", "**/outstanding-light.spec.js", "**/outstanding-center.spec.js", "**/workspace-session.spec.js", "**/stability-recovery.spec.js", "**/group-quick-update.spec.js",
        "**/action-workbench.spec.js", "**/project-focus-summary.spec.js", "**/workstream-stage-summary.spec.js", "**/home-empty-state.spec.js", "**/holding-components.spec.js", "**/outstanding-continuous.spec.js",
        "**/client-follow-up.spec.js", "**/workflow-effort.spec.js"],
      use: { browserName: "webkit", viewport: { width: 1440, height: 900 }, launchOptions: webkitLaunchOptions() } },
  ],
  outputDir: "test-results",
});
