import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const authFile = path.resolve("./tests/e2e/.auth/session.json");
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
  "npm run dev -- --hostname 127.0.0.1 --port 3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  globalSetup: path.resolve("./tests/e2e/global.setup.ts"),
  reporter: "list",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER !== "0",
    timeout: 120_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_DATA_MODE: process.env.NEXT_PUBLIC_DATA_MODE ?? "mock",
      NEXT_PUBLIC_E2E: process.env.NEXT_PUBLIC_E2E ?? "true"
    }
  },
  projects: [
    {
      name: "auth",
      testMatch: /auth\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined
      }
    },
    {
      name: "desktop-chromium",
      testIgnore: /auth\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile
      }
    },
    {
      name: "mobile-chrome",
      testIgnore: /auth\.spec\.ts$/,
      use: {
        ...devices["iPhone 13"],
        storageState: authFile
      }
    }
  ]
});
