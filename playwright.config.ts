import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1340, height: 800 },
    browserName: "chromium",
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "FOCUS_FIXTURE_PORT=18081 node tests/fixtures/decaid.mjs",
      url: "http://127.0.0.1:18081/api/v1/info",
      reuseExistingServer: false,
    },
    {
      command:
        "VITE_DECAID_URL=http://127.0.0.1:18081 npx vite build --outDir artifacts/test-build && npx vite preview --outDir artifacts/test-build --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
})
