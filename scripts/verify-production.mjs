import { chromium } from "playwright";

const baseUrl = process.env.SPACEBLADE_URL ?? "https://spaceblade.vercel.app/";
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

  const initialResources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  if (initialResources.some((name) => /firebase|firestore|leaderboardClient/i.test(name))) {
    throw new Error("Firebase loaded during initial boot");
  }

  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(320);
    await page.keyboard.up("Space");
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "playing");

  const first = await canvas.evaluate((node) => ({
    player: node.dataset.spacebladePlayerFrame,
    enemy: node.dataset.spacebladeEnemyFrame,
    background: node.dataset.spacebladeBackgroundOffset,
    playerX: node.dataset.spacebladePlayerX,
    hud: node.dataset.spacebladeHudLayout,
  }));
  const motionSamples = [first];
  for (let sample = 0; sample < 3; sample += 1) {
    await page.waitForTimeout(90);
    motionSamples.push(await canvas.evaluate((node) => ({
      player: node.dataset.spacebladePlayerFrame,
      enemy: node.dataset.spacebladeEnemyFrame,
      background: node.dataset.spacebladeBackgroundOffset,
    })));
  }

  if (!first.player || !first.enemy || first.playerX !== "640" || first.hud !== "split") {
    throw new Error(`Gameplay layout contract failed: ${JSON.stringify(first)}`);
  }
  if (
    new Set(motionSamples.map((sample) => sample.player)).size < 2 ||
    new Set(motionSamples.map((sample) => sample.enemy)).size < 2 ||
    new Set(motionSamples.map((sample) => sample.background)).size < 2
  ) {
    throw new Error(`Animation contract failed: ${JSON.stringify({ first, motionSamples })}`);
  }

  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  await page.keyboard.up("Space");
  await page.waitForTimeout(80);
  const slash = await canvas.getAttribute("data-spaceblade-player-animation");

  await page.keyboard.down("Space");
  await page.waitForTimeout(320);
  const charging = await canvas.getAttribute("data-spaceblade-player-animation");
  await page.keyboard.up("Space");
  await page.waitForTimeout(80);
  const heavy = await canvas.getAttribute("data-spaceblade-player-animation");

  const resourcesAfterGameplay = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  if (resourcesAfterGameplay.some((name) => /firebase|firestore|leaderboardClient/i.test(name))) {
    throw new Error("Firebase loaded during normal gameplay");
  }
  if (slash !== "slash" || charging !== "charging" || heavy !== "heavy") {
    throw new Error(`One-button action contract failed: ${JSON.stringify({ slash, charging, heavy })}`);
  }
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  console.log(JSON.stringify({
    url: baseUrl,
    screen: "playing",
    playerX: first.playerX,
    actions: { slash, charging, heavy },
    framesAdvanced: true,
    skylineAdvanced: true,
    firebaseLoadedDuringGameplay: false,
    browserErrors: 0,
  }, null, 2));
} finally {
  await browser.close();
}
