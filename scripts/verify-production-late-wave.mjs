import { chromium } from "playwright";

const baseUrl = process.env.SPACEBLADE_URL ?? "https://spaceblade.vercel.app/";
const targetWave = Number(process.env.SPACEBLADE_LATE_WAVE_TARGET ?? 8);
const budgetMs = Number(process.env.SPACEBLADE_LATE_WAVE_BUDGET_MS ?? 180_000);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const canvas = page.locator("canvas");
const errors = [];
let maxWave = 0;
let maxThreatWeight = 0;
let actions = 0;

page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const readState = async () => canvas.evaluate((node) => ({
  screen: node.dataset.spacebladeScreen ?? "missing",
  wave: Number(node.dataset.spacebladeWave ?? 0),
  score: Number(node.dataset.spacebladeScore ?? 0),
  hearts: Number(node.dataset.spacebladeHearts ?? 0),
  threatWeight: Number(node.dataset.spacebladeThreatWeight ?? Number.NaN),
}));

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

  const startedAt = Date.now();
  while (Date.now() - startedAt < budgetMs) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(520);
    await page.keyboard.up("Space");
    await page.waitForTimeout(280);
    actions += 1;
    const state = await readState();
    maxWave = Math.max(maxWave, state.wave);
    if (Number.isFinite(state.threatWeight)) maxThreatWeight = Math.max(maxThreatWeight, state.threatWeight);
    if (state.screen !== "playing") throw new Error(`Run ended during late-wave profile: ${JSON.stringify(state)}`);
    if (state.wave >= targetWave) break;
  }

  const finalState = await readState();
  if (maxWave < targetWave) {
    throw new Error(`Late-wave target not reached: ${JSON.stringify({ targetWave, maxWave, finalState, actions, budgetMs })}`);
  }
  if (maxThreatWeight > 6) throw new Error(`Threat weight exceeded cap: ${maxThreatWeight}`);
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join(" | ")}`);

  console.log(JSON.stringify({
    url: baseUrl,
    targetWave,
    maxWave,
    maxThreatWeight,
    actions,
    budgetMs,
    finalState,
    browserErrors: 0,
  }, null, 2));
} finally {
  await browser.close();
}
