import { expect, test } from "@playwright/test";

const appOrigin = "http://127.0.0.1:3000";

test("redirects unauthenticated users from protected routes", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
});

test("rejects invalid credentials without creating a session", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Username or email/i).fill("squarehero");
  await page.getByLabel(/Password/i).fill("wrong-password");
  await page.getByRole("button", { name: /Sign In/i }).click();

  await expect(page.getByText(/Use the default login/i)).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  const cookies = await page.context().cookies(appOrigin);
  expect(
    cookies.some(
      (cookie) => cookie.name === "condo_hunt_session" && cookie.value === "authenticated"
    )
  ).toBeFalsy();
});

test("accepts the default credentials and lands inside the app", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/Username or email/i).fill("squarehero");
  await page.getByLabel(/Password/i).fill("hooga888");
  await page.getByRole("button", { name: /Sign In/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

  const cookies = await page.context().cookies(appOrigin);
  expect(
    cookies.some(
      (cookie) => cookie.name === "condo_hunt_session" && cookie.value === "authenticated"
    )
  ).toBeTruthy();
});
