import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const authFile = path.resolve("./tests/e2e/.auth/session.json");

async function globalSetup() {
  mkdirSync(path.dirname(authFile), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await page.goto("/");
  await page.getByLabel(/Username or email/i).fill("squarehero");
  await page.getByLabel(/Password/i).fill("hooga888");
  await page.getByRole("button", { name: /Sign In/i }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.context().storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
