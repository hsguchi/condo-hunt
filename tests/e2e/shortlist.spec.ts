import { expect, test } from "@playwright/test";
import { seedMockUiState } from "./utils/mock-state";

test("filters saved homes and links cards to property detail", async ({ page }) => {
  await seedMockUiState(page, {
    shortlistedIds: ["1", "2", "3"]
  });
  await page.goto("/shortlist");

  await expect(page.getByText("3 properties saved")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Meyer Crest" })).toHaveAttribute("href", "/property/1");

  await page.getByRole("button", { name: "Under $2.5M" }).click();

  await expect(page.getByText("1 matches under $2.5m")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Meyer Crest" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open The Continuum" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open Grand Dunman" })).toHaveCount(0);
});

test("removes a property from the shortlist and shows the empty state when nothing remains", async ({ page }) => {
  await seedMockUiState(page, {
    shortlistedIds: ["1"]
  });
  await page.goto("/shortlist");

  await expect(page.getByText("1 property saved")).toBeVisible();

  await page.getByRole("button", { name: "Remove Meyer Crest from shortlist" }).click();

  await expect(page.getByText("0 properties saved")).toBeVisible();
  await expect(page.getByText("Your shortlist is empty")).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse listings" })).toHaveAttribute("href", "/listings");
});
