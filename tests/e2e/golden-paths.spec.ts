import { expect, test } from "@playwright/test";

test("valuation updates and produces a shareable URL", async ({ page }) => {
  await page.goto("/valuation");
  await expect(page.getByText("Estimated market value")).toBeVisible();
  await page.getByLabel("Goals").fill("20");
  await expect(page).toHaveURL(/goals=20/);
  await expect(page.getByText("MODEL CONTRIBUTIONS")).toBeVisible();
});

test("transfer builder composes scouting and valuation", async ({ page }) => {
  await page.goto("/transfers");
  await expect(page.getByText("REPLACEMENT SHORTLIST")).toBeVisible();
  await page.getByRole("button", { name: /COMPARE/ }).first().click();
  await expect(page.getByText("PROFILE TRADE-OFFS")).toBeVisible();
  await expect(page).toHaveURL(/alternatives=/);
});

test("comparison workspace loads shareable player evidence", async ({ page }) => {
  await page.goto("/compare?players=433177,583255");
  await expect(page.getByText("PROFILE SHAPE")).toBeVisible();
  await expect(page.getByText("Side-by-side production")).toBeVisible();
  await expect(page.getByText("DECISION NOTES")).toBeVisible();
  await expect(page).toHaveURL(/players=433177%2C583255|players=433177,583255/);
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

test("production status exposes freshness and artifact versions", async ({ page }) => {
  await page.goto("/status");
  await expect(page.getByText("Trust the system.")).toBeVisible();
  await expect(page.getByText("LAST SUCCESSFUL SYNC")).toBeVisible();
  await expect(page.getByText("7-DAY REQUESTS")).toBeVisible();
  await expect(page.getByText("Seven-day request volume")).toBeVisible();
  await expect(page.getByText("Database footprint")).toBeVisible();
  await expect(page.getByText("Model versions")).toBeVisible();
});

test("model registry exposes challenger evidence and promotion gates", async ({ page }) => {
  await page.goto("/models");
  await expect(page.getByText("Production model governed")).toBeVisible();
  await expect(page.getByText("Ridge regression")).toBeVisible();
  await expect(page.getByText("Every gate must pass.")).toBeVisible();
  await expect(page.getByText("Prediction drift", { exact: true }).first()).toBeVisible();
});

test("player profile connects history to transfer decisions", async ({ page }) => {
  await page.goto("/players/433177");
  await expect(page.getByText("Bukayo Saka", { exact: true })).toBeVisible();
  await expect(page.getByText("LATEST RECORDED VALUE")).toBeVisible();
  await expect(page.getByText("Performance-priced")).toBeVisible();
  await expect(page.getByRole("link", { name: /Build transfer scenario/ })).toHaveAttribute("href", "/transfers?player=433177");
  await expect(page.getByRole("link", { name: /Compare this player/ })).toHaveAttribute("href", "/compare?players=433177");
  await page.getByRole("link", { name: "Find similar profiles" }).click();
  await expect(page).toHaveURL(/scouting\?player_id=433177/);
  await expect(page.getByRole("heading", { name: "Bukayo Saka" })).toBeVisible();
});
