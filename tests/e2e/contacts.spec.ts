import { expect, test } from "@playwright/test";
import { seedMockUiState } from "./utils/mock-state";

test("filters derived contacts and applies per-contact quick actions", async ({ page }) => {
  await seedMockUiState(page, {
    shortlistedIds: ["1", "2", "3"]
  });
  await page.goto("/contacts");

  await expect(page.getByText("2 agents across 3 shortlisted homes")).toBeVisible();

  const statusFilters = page.getByLabel("Contact status filters");
  await expect(statusFilters.getByRole("button", { name: /Pending/i })).toContainText("1");
  await expect(statusFilters.getByRole("button", { name: /Contacted/i })).toContainText("1");

  await statusFilters.getByRole("button", { name: /Pending/i }).click();

  await expect(page.getByText("Sarah Lim")).toBeVisible();
  await expect(page.getByText("John Tan")).toHaveCount(0);

  const sarahCard = page.locator("article").filter({ has: page.getByText("Sarah Lim") }).first();
  await expect(sarahCard.getByRole("link", { name: "WhatsApp Sarah Lim" })).toHaveAttribute(
    "href",
    "https://wa.me/6587654321"
  );
  await expect(sarahCard.getByRole("link", { name: "Call Sarah Lim" })).toHaveAttribute(
    "href",
    "tel:+6587654321"
  );

  await sarahCard.getByRole("button", { name: "Copy Sarah Lim phone number" }).click();
  await expect(sarahCard.getByRole("status")).toContainText("Number copied");

  await sarahCard.getByRole("button", { name: "Scheduled" }).click();

  await expect(page.getByText("No pending contacts right now")).toBeVisible();
  await expect(statusFilters.getByRole("button", { name: /Pending/i })).toContainText("0");
  await expect(statusFilters.getByRole("button", { name: /Scheduled/i })).toContainText("1");
});

test("opens the bulk surface from the shortlist CTA route and updates visible contacts in bulk", async ({ page }) => {
  await seedMockUiState(page, {
    shortlistedIds: ["1", "2"]
  });
  await page.goto("/contacts?bulk=1");

  const bulkActions = page.getByLabel("Bulk contact actions");
  await expect(bulkActions).toBeVisible();
  await expect(bulkActions.getByText("2 contacts in view")).toBeVisible();

  await bulkActions.getByRole("button", { name: "Copy visible numbers" }).click();
  await expect(bulkActions.getByRole("status")).toContainText("Visible numbers copied");

  await bulkActions.getByRole("button", { name: "Mark visible scheduled" }).click();

  const statusFilters = page.getByLabel("Contact status filters");
  await expect(statusFilters.getByRole("button", { name: /Pending/i })).toContainText("0");
  await expect(statusFilters.getByRole("button", { name: /Contacted/i })).toContainText("0");
  await expect(statusFilters.getByRole("button", { name: /Scheduled/i })).toContainText("2");
});
