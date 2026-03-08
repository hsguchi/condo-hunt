import { expect, test } from "@playwright/test";
import { resetMockUiState, seedMockUiState } from "./utils/mock-state";

test.beforeEach(async ({ page }) => {
  await page.goto("/dashboard");
  await resetMockUiState(page);
});

test("derives dashboard metrics from the shared mock UI state", async ({ page }) => {
  await seedMockUiState(page, {
    shortlistedIds: ["1", "2"],
    contactStatusByAgentId: {
      "1": "scheduled",
      "2": "pending"
    }
  });

  await expect(page.getByRole("group", { name: "Viewed properties" })).toContainText("1");
  await expect(page.getByRole("group", { name: "Saved properties" })).toContainText("2");
  await expect(page.getByRole("group", { name: "Average shortlist price" })).toContainText("$2.84M");
  await expect(page.getByText(/Sarah Lim still needs attention/i)).toBeVisible();
});

test("routes dashboard CTAs to shortlist and contacts", async ({ page }) => {
  await page.getByRole("link", { name: "View All" }).click();
  await expect(page).toHaveURL(/\/shortlist$/);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Open Hub" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
});
