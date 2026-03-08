import { expect, test } from "@playwright/test";
import { resetMockUiState } from "./utils/mock-state";

test("filters listings, saves the active match, and dismisses it from the queue", async ({ page }) => {
  await resetMockUiState(page);
  await page.goto("/listings");

  await expect(page.getByRole("heading", { name: "Meyer Crest" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View details" })).toHaveAttribute("href", "/property/1");

  await page.getByRole("button", { name: "All areas" }).click();
  await expect(page.getByRole("heading", { name: "Refine your queue" })).toBeVisible();

  await page.getByRole("button", { name: "Dunman", exact: true }).click();

  await expect(page.getByRole("button", { name: "Area: Dunman" })).toBeVisible();
  await expect(page.getByText(/1 live matches/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grand Dunman" })).toBeVisible();
  await expect(page.getByRole("link", { name: "View details" })).toHaveAttribute("href", "/property/3");

  await page.getByRole("button", { name: "Save Grand Dunman to shortlist" }).click();
  await expect(page.getByText("Grand Dunman is saved to your shortlist.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove Grand Dunman from shortlist" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.getByRole("button", { name: "Reject Grand Dunman" }).click();
  await expect(page.getByText("No listings match your current view")).toBeVisible();
});

