import { chromium } from "playwright";
import { isLateWaveComplete, isUnexpectedLateWaveEnd, shouldDodgeTelegraph, shouldPrioritizeParry } from "./lateWaveAcceptance.mjs";

const baseUrl = process.env.SPACEBLADE_URL ?? "https://spaceblade.vercel.app/";
const targetWave = Number(process.env.SPACEBLADE_LATE_WAVE_TARGET ?? 8);
const budgetMs = Number(process.env.SPACEBLADE_LATE_WAVE_BUDGET_MS ?? 180_000);
const bossProfile = targetWave >= 15;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const canvas = page.locator("canvas");
const errors = [];
let maxWave = 0;
let maxThreatWeight = 0;
let actions = 0;
let attackIndex = 0;

page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const readState = async () => canvas.evaluate((node) => ({
  screen: node.dataset.spacebladeScreen ?? "missing",
  runStatus: node.dataset.spacebladeRunStatus ?? "missing",
  wave: Number(node.dataset.spacebladeWave ?? 0),
  score: Number(node.dataset.spacebladeScore ?? 0),
  hearts: Number(node.dataset.spacebladeHearts ?? 0),
  threatWeight: Number(node.dataset.spacebladeThreatWeight ?? Number.NaN),
  parryTiming: node.dataset.spacebladeParryTiming ?? "none",
}));

const tapSpace = async () => {
  await page.keyboard.down("Space");
  await page.waitForTimeout(20);
  await page.keyboard.up("Space");
};

const dodgeSpace = async () => {
  await tapSpace();
  await page.waitForTimeout(80);
  await tapSpace();
};

const reactToPerfectParry = async (windowMs = 460) => {
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    const state = await readState();
    if (isUnexpectedLateWaveEnd(state, targetWave)) {
      throw new Error(`Run ended during parry response: ${JSON.stringify(state)}`);
    }
    if (state.parryTiming === "perfect") {
      await tapSpace();
      return true;
    }
    if (shouldDodgeTelegraph(state)) {
      await dodgeSpace();
      return false;
    }
    await page.waitForTimeout(40);
  }
  return false;
};

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
    const preflight = await readState();
    if (isUnexpectedLateWaveEnd(preflight, targetWave)) {
      throw new Error(`Run ended before late-wave action: ${JSON.stringify(preflight)}`);
    }
    if (!bossProfile) {
      await page.keyboard.down("Space");
      await page.waitForTimeout(520);
      await page.keyboard.up("Space");
      await page.waitForTimeout(280);
    } else if (shouldPrioritizeParry(preflight)) {
      if (shouldDodgeTelegraph(preflight)) {
        await dodgeSpace();
        await page.waitForTimeout(360);
        continue;
      }
      const parried = await reactToPerfectParry(520);
      if (parried) {
        await page.waitForTimeout(320);
      } else {
        await page.waitForTimeout(180);
      }
      continue;
    } else {
      const holdMs = attackIndex % 4 === 0 ? 360 : 20;
      await page.keyboard.down("Space");
      await page.waitForTimeout(holdMs);
      await page.keyboard.up("Space");
      attackIndex += 1;
      await reactToPerfectParry(220);
      await page.waitForTimeout(260);
    }
    actions += 1;
    const state = await readState();
    maxWave = Math.max(maxWave, state.wave);
    if (Number.isFinite(state.threatWeight)) maxThreatWeight = Math.max(maxThreatWeight, state.threatWeight);
    if (isUnexpectedLateWaveEnd(state, targetWave)) {
      throw new Error(`Run ended during late-wave profile: ${JSON.stringify(state)}`);
    }
    if (isLateWaveComplete(state, targetWave)) break;
  }

  const finalState = await readState();
  if (!isLateWaveComplete(finalState, targetWave)) {
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
