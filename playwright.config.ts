import {
  fixtureOrigin,
  fixturePort,
  previewPort,
} from "./tests/fixture-origin.js"
import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 30000 },
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    viewport: { width: 1340, height: 800 },
    browserName: "chromium",
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `FOCUS_FIXTURE_PORT=${fixturePort} node tests/fixtures/decaid.mjs`,
      url: `${fixtureOrigin}/api/v1/info`,
      reuseExistingServer: false,
    },
    {
      command: `VITE_DECAID_URL=${fixtureOrigin} npx vite build --outDir artifacts/test-build && npx vite preview --outDir artifacts/test-build --host 127.0.0.1 --port ${previewPort} --strictPort`,
      url: `http://127.0.0.1:${previewPort}`,
      reuseExistingServer: false,
    },
  ],
})
