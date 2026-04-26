import { defineConfig } from "@playwright/test";

const port = 5173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL
  },
  webServer: {
    command: "pnpm dev -- --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: !process.env.CI
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
