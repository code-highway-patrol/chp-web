import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://localhost:5174/";
const OUT = "scripts/.shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 820 },
  reducedMotion: "no-preference",
});
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });

await page.evaluate(() => {
  const el = document.querySelector(".scene-section");
  if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
});
await page.waitForTimeout(300);

const sectionBox = await page.evaluate(() => {
  const el = document.querySelector(".scene-section");
  const r = el.getBoundingClientRect();
  return { top: window.scrollY + r.top, height: el.offsetHeight };
});

const phases = [
  { id: "draft", q: 0.10 },
  { id: "block", q: 0.42 },
  { id: "fix-mid", q: 0.66 },
  { id: "fix-end", q: 0.74 },
  { id: "clean", q: 0.95 },
];

const vh = 820;
const pinHeight = vh - 60;
const span = sectionBox.height - pinHeight;

for (const ph of phases) {
  const targetScroll = sectionBox.top + ph.q * span;
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), targetScroll);
  await page.waitForTimeout(1700);
  const measured = await page.evaluate(() => {
    const body = document.querySelector(".scene-body");
    const warn = document.querySelector(".scene-tok-warn");
    const good = document.querySelector(".scene-tok-good");
    const target = warn || good;
    const head = document.querySelector(".scene-hand-head");
    const labelEl = document.querySelector(".scene-hand-label");
    const bRect = body?.getBoundingClientRect();
    const tRect = target?.getBoundingClientRect();
    const hRect = head?.getBoundingClientRect();
    const lRect = labelEl?.getBoundingClientRect();
    return {
      hasWarn: !!warn,
      hasGood: !!good,
      hasHead: !!head,
      hasLabel: !!labelEl,
      labelText: labelEl?.textContent ?? null,
      bodyRect: bRect && { x: bRect.x, y: bRect.y, w: bRect.width, h: bRect.height },
      targetRect: tRect && { x: tRect.x, y: tRect.y, w: tRect.width, h: tRect.height },
      headRect: hRect && { x: hRect.x, y: hRect.y, w: hRect.width, h: hRect.height },
      labelRect: lRect && { x: lRect.x, y: lRect.y, w: lRect.width, h: lRect.height },
    };
  });
  const sceneEl = await page.$(".scene");
  const path = `${OUT}/${ph.id}.png`;
  await sceneEl.screenshot({ path });
  console.log(JSON.stringify({ phase: ph.id, q: ph.q, ...measured }, null, 2));
}

await browser.close();
