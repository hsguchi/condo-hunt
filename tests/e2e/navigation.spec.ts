import { expect, test } from "@playwright/test";
import { resetMockUiState } from "./utils/mock-state";

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
  await resetMockUiState(page);
});

test("keeps the bottom nav fixed while navigating protected screens", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Primary" });
  const viewport = page.viewportSize();

  await expect(nav).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const initialNavBox = await nav.boundingBox();
  expect(initialNavBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(initialNavBox!.y + initialNavBox!.height).toBeGreaterThan((viewport?.height ?? 0) - 8);

  await page.getByRole("link", { name: /Shortlist/i }).click();
  await expect(page).toHaveURL(/\/shortlist$/);
  await expect(page.getByRole("heading", { name: /Shortlist/i })).toBeVisible();

  await page.getByRole("link", { name: /Agents/i }).click();
  await expect(page).toHaveURL(/\/contacts$/);
  await expect(page.getByRole("heading", { name: /Contact Hub/i })).toBeVisible();

  const contactsNavBox = await nav.boundingBox();
  expect(contactsNavBox).not.toBeNull();
  expect(contactsNavBox!.y + contactsNavBox!.height).toBeGreaterThan((viewport?.height ?? 0) - 8);
});
