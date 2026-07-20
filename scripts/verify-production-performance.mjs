import { chromium } from "playwright";

const baseUrl = process.env.SPACEBLADE_URL ?? "https://spaceblade.vercel.app/";
const profileDurationMs = 8_000;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "title");

  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(320);
    await page.keyboard.up("Space");
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "playing");

  const initialResources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  const samplesPromise = page.evaluate((durationMs) => new Promise((resolve) => {
    const canvas = document.querySelector("canvas");
    const changes = [];
    let previous = canvas?.dataset.spacebladeBackgroundOffset ?? null;
    let previousAt = performance.now();
    const startedAt = previousAt;
    const timer = setInterval(() => {
      const now = performance.now();
      const current = canvas?.dataset.spacebladeBackgroundOffset ?? null;
      if (current !== null && current !== previous) {
        changes.push(now - previousAt);
        previous = current;
        previousAt = now;
      }
      if (now - startedAt >= durationMs) {
        clearInterval(timer);
        resolve({ changes, finalScreen: canvas?.dataset.spacebladeScreen ?? "missing" });
      }
    }, 5);
  }), profileDurationMs);

  // Keep the run active while the browser records the simulation cadence.
  for (let action = 0; action < 16; action += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(320);
    await page.keyboard.up("Space");
    await page.waitForTimeout(120);
  }
  const samples = await samplesPromise;

  const intervals = samples.changes.filter((interval) => interval >= 10 && interval <= 100);
  if (samples.finalScreen !== "playing") throw new Error(`Gameplay ended during profile: ${samples.finalScreen}`);
  if (intervals.length < 40) throw new Error(`Too few simulation samples: ${intervals.length}`);
  const sorted = [...intervals].sort((left, right) => left - right);
  const medianMs = sorted[Math.floor(sorted.length / 2)];
  const p95Ms = sorted[Math.floor(sorted.length * 0.95)];
  const medianFps = 1000 / medianMs;
  if (medianFps < 20 || medianFps > 40 || p95Ms > 80) {
    throw new Error(`Frame pacing outside contract: ${JSON.stringify({ medianMs, medianFps, p95Ms })}`);
  }
  if (initialResources.some((name) => /firebase|firestore|leaderboardClient/i.test(name))) {
    throw new Error("Firebase loaded before gameplay profiling");
  }
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  console.log(JSON.stringify({
    url: baseUrl,
    durationMs: profileDurationMs,
    samples: intervals.length,
    medianMs: Number(medianMs.toFixed(2)),
    medianFps: Number(medianFps.toFixed(2)),
    p95Ms: Number(p95Ms.toFixed(2)),
    firebaseLoadedBeforeGameplay: false,
    browserErrors: 0,
  }, null, 2));
} finally {
  await browser.close();
}
