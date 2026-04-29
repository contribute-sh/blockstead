import { defineConfig } from "@playwright/test";

const configuredBaseURL =
  process.env.CONTRIBUTE_VERIFY_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BASE_URL;
const port = Number(process.env.BLOCKSTEAD_E2E_PORT ?? 5177);
const baseURL = configuredBaseURL ?? `http://127.0.0.1:${port}`;
const webServer = configuredBaseURL
  ? undefined
  : {
      command: `pnpm exec vite --host 127.0.0.1 --port ${port} --strictPort`,
      url: baseURL,
      reuseExistingServer: false
    };

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL
  },
  ...(webServer === undefined ? {} : { webServer }),
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium"
      }
    }
  ]
});
