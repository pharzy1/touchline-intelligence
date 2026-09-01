import { expect, test } from "@playwright/test";

test("valuation updates and produces a shareable URL", async ({ page }) => {
  await page.goto("/#valuation");
  await expect(page.getByText("Estimated market value")).toBeVisible();
  await page.getByLabel("Goals").fill("20");
  await expect(page).toHaveURL(/goals=20/);
  await expect(page.getByText("MODEL CONTRIBUTIONS")).toBeVisible();
});

test("scouting returns explained alternatives", async ({ page }) => {
  await page.goto("/scouting");
  await page.getByPlaceholder("e.g. Bukayo Saka").fill("Haaland");
  await page.getByRole("button", { name: /Erling Haaland/ }).click();
  await expect(page.locator(".match-card")).toHaveCount(5);
  await expect(page.getByText("profile match").first()).toBeVisible();
});

test("match lab renders calibrated probabilities and baselines", async ({ page }) => {
  await page.goto("/matches");
  await expect(page.getByText("CALIBRATED MODEL")).toBeVisible();
  await expect(page.getByText(/always-home/)).toBeVisible();
  await expect(page.getByText("HOME WIN")).toBeVisible();
});

test("live record explains immutable pre-match grading", async ({ page }) => {
  await page.goto("/matches/performance");
  await expect(page.getByText("Predict first.")).toBeVisible();
  await expect(page.getByText("Grade in public.")).toBeVisible();
  await expect(page.getByText("locked predictions", { exact: true })).toBeVisible();
  await expect(page.getByText(/before kickoff|scheduled fixture sync/i).first()).toBeVisible();
});
