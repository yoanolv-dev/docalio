// Génère les captures produit (PNG retina) à partir des pages /shots/*.
// Usage : node scripts/shoot.cjs  (un serveur Next doit tourner sur SHOT_BASE)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.SHOT_BASE || "http://localhost:3210";
const OUT = path.join(process.cwd(), "public", "product");

const SHOTS = [
  { name: "dashboard", path: "/shots/dashboard", w: 1440, h: 1000 },
  { name: "drive", path: "/shots/drive", w: 1440, h: 1040 },
  { name: "portal", path: "/shots/portal", w: 1040, h: 1180 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const s of SHOTS) {
    const page = await browser.newPage({
      viewport: { width: s.w, height: s.h },
      deviceScaleFactor: 2,
    });
    await page.goto(BASE + s.path, { waitUntil: "networkidle", timeout: 60000 });
    try {
      await page.evaluate(() => document.fonts && document.fonts.ready);
    } catch {}
    await page.waitForTimeout(500);
    const el = page.locator("#shot");
    await el.screenshot({ path: path.join(OUT, s.name + ".png") });
    await page.close();
    console.log("✓", s.name);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
