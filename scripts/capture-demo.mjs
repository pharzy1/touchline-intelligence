import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 });
await fs.mkdir("work/demo-frames", { recursive: true });
await page.goto("http://127.0.0.1:3000/#valuation");
await page.locator(".workbench").scrollIntoViewIfNeeded();
const slider = page.getByLabel("Goals");
for (let frame = 0; frame < 16; frame += 1) {
  const value = frame < 8 ? 7 + frame * 2 : 21 - (frame - 8) * 2;
  await slider.fill(String(value));
  await page.waitForTimeout(230);
  await page.screenshot({ path: `work/demo-frames/${String(frame).padStart(2, "0")}.png`, clip: { x: 36, y: 180, width: 1208, height: 560 } });
}
await browser.close();
