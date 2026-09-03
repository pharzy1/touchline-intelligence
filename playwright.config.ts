import { defineConfig, devices } from "@playwright/test";
const port = process.env.E2E_PORT ?? "3100";

export default defineConfig({
  testDir: "tests/e2e", fullyParallel: true, retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: "on-first-retry", ...devices["Desktop Chrome"] },
  webServer: { command: `PORT=${port} pnpm start`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120_000 },
});
