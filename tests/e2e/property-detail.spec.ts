import { expect, test } from "@playwright/test";
import { seedMockUiState } from "./utils/mock-state";

test("reflects shared shortlist state and wires save, call, WhatsApp, copy, and back actions", async ({ page }) => {
  await seedMockUiState(page, {
    shortlistedIds: ["2"],
    lastVisitedRoute: "/contacts"
  });
  await page.goto("/property/2");

  await expect(page.getByRole("heading", { name: "The Continuum" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call Sarah Lim" })).toHaveAttribute(
    "href",
    "tel:+6587654321"
  );
  await expect(page.getByRole("link", { name: "Open WhatsApp chat with Sarah Lim" })).toHaveAttribute(
    "href",
    "https://wa.me/6587654321"
  );
  await expect(page.getByRole("button", { name: "Remove property from shortlist" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.getByRole("button", { name: "Remove property from shortlist" }).click();
  await expect(page.getByRole("button", { name: "Save property to shortlist" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );

  await page.getByRole("button", { name: "Save property to shortlist" }).click();
  await expect(page.getByRole("button", { name: "Remove property from shortlist" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByText("Shortlisted")).toBeVisible();

  await page.getByRole("button", { name: "Copy agent phone number" }).click();
  await expect(page.getByText("Phone number copied.")).toBeVisible();

  await page.getByRole("button", { name: "Back to previous screen" }).click();
  await expect(page).toHaveURL(/\/contacts$/);
});
