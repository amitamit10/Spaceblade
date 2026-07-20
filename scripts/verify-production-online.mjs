import { chromium } from "playwright";

const baseUrl = process.env.SPACEBLADE_URL ?? "https://spaceblade.vercel.app/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const canvas = page.locator("canvas");
const errors = [];
const firestoreResponses = [];

page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (/firestore\.googleapis\.com/i.test(response.url())) {
    firestoreResponses.push({ status: response.status(), url: response.url() });
  }
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "title");

  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(320);
    await page.keyboard.up("Space");
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "playing");

  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(520);
    await page.keyboard.up("Space");
    await page.waitForTimeout(280);
    if (Number(await canvas.getAttribute("data-spaceblade-score")) >= 100) break;
  }

  const score = Number(await canvas.getAttribute("data-spaceblade-score"));
  if (score < 100) throw new Error(`Eligible score was not reached: ${score}`);
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "nameEntry", null, { timeout: 25_000 });
  await page.locator('input[data-spaceblade-player-name]').fill("Launch Probe");
  await page.locator("button.spaceblade-name-submit").click();
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "gameOver", null, { timeout: 5_000 });
  await page.waitForTimeout(1_500);

  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeScreen === "highscores");
  await page.waitForFunction(() => document.querySelector("canvas")?.dataset.spacebladeHighscoresState === "online", null, { timeout: 12_000 });

  const state = await canvas.evaluate((node) => ({
    screen: node.dataset.spacebladeScreen,
    tab: node.dataset.spacebladeHighscoresTab,
    fetchState: node.dataset.spacebladeHighscoresState,
    entries: Number(node.dataset.spacebladeHighscoresCount ?? 0),
  }));
  if (state.tab !== "global" || state.entries < 1) throw new Error(`Global leaderboard row missing: ${JSON.stringify(state)}`);
  if (firestoreResponses.length === 0 || firestoreResponses.some((response) => response.status >= 400)) {
    throw new Error(`Firestore request failed: ${JSON.stringify(firestoreResponses)}`);
  }
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  console.log(JSON.stringify({ url: baseUrl, score, ...state, firestoreRequests: firestoreResponses.length, browserErrors: 0 }, null, 2));
} finally {
  await browser.close();
}
