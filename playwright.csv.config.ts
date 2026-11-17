import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "calendar.spec.ts",
  grep: /browser validates contacts and past dates/,
  workers: 1,
  timeout: 90000,
  outputDir: "test-results/csv-matrix",
  use: { baseURL: "http://localhost:3200" },
  projects: [
    { name: "Chromium" },
    { name: "Google Chrome", use: { channel: "chrome" } },
    { name: "Microsoft Edge", use: { channel: "msedge" } },
  ],
});
