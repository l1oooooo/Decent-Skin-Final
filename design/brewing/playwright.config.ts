import { defineConfig } from "@playwright/test"
export default defineConfig({
  testDir: "./browser-tests",
  workers: 1,
  timeout: 240000,
  outputDir: "../../artifacts/brewing-test-results",
  use: {
    baseURL: "http://127.0.0.1:5174",
    viewport: { width: 1340, height: 800 },
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite --config design/brewing/vite.config.ts",
    cwd: "../..",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: true,
  },
})
