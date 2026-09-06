import base from './playwright.config.js';

// Run existing functional checks against emitted files, not Vite's development server.
export default {
  ...base,
  use: { ...base.use, baseURL: 'http://127.0.0.1:4185/audit-project-workbench/' },
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4185 --strictPort',
    url: 'http://127.0.0.1:4185/audit-project-workbench/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  testMatch: ['**/core-flows.spec.js', '**/stability-recovery.spec.js'],
  projects: [
    base.projects[0],
    { name: 'webkit-production', use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } } },
  ],
  outputDir: 'test-results-production',
};
