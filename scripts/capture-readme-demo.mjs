import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const output = process.argv[2] ?? "/private/tmp/touchline-demo-frames";
const base = process.env.DEMO_BASE_URL ?? "https://touchlineintelligence.com";
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });

async function frame(name) {
  await page.screenshot({ path: `${output}/${name}.png` });
}

await page.goto(`${base}/valuation?age=23&position=Attack&appearances=31&goals=14&assists=8&minutes=2360`, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo({ top: 500 }));
await frame("01-valuation-baseline");

await page.goto(`${base}/valuation?age=23&position=Attack&appearances=31&goals=22&assists=15&minutes=2360`, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo({ top: 500 }));
await frame("02-valuation-updated");

await page.goto(`${base}/scouting`, { waitUntil: "networkidle" });
await page.getByPlaceholder("e.g. Bukayo Saka").fill("Haaland");
await page.getByRole("button", { name: /Erling Haaland/ }).waitFor();
await page.evaluate(() => window.scrollTo({ top: 430 }));
await frame("03-scouting-search");
await page.getByRole("button", { name: /Erling Haaland/ }).click();
await page.locator(".match-card").first().waitFor();
await frame("04-scouting-results");

await page.goto(`${base}/transfers?player=418560&alternatives=583255`, { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo({ top: 410 }));
await page.locator(".replacement-grid article").first().waitFor();
await frame("05-transfer-builder");
await page.goto(`${base}/transfers?player=418560&alternatives=583255,378710`, { waitUntil: "networkidle" });
await page.getByText("PROFILE TRADE-OFFS").waitFor();
await page.evaluate(() => window.scrollTo({ top: 930 }));
await frame("06-transfer-comparison");

await browser.close();
console.log(`Captured six frames in ${output}`);
