const { test, expect } = require("@playwright/test");

async function waitForPhaserTitle(page) {
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "title", { timeout: 15_000 });
  await expect(canvas).toHaveAttribute("data-spaceblade-title-tagline", "ONE KEY. ENDLESS FIGHT.");
}

async function startPhaserGameplay(page) {
  await waitForPhaserTitle(page);
  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(320);
    await page.keyboard.up("Space");
    await page.waitForTimeout(120);
  }
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "playing");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-hud-layout", "split");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-player-x", "640");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-threat-weight", /^(?:[0-5]|6)$/);
}

test("Phaser gameplay slice renders the locked game canvas without browser errors", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await waitForPhaserTitle(page);
  await page.screenshot({ path: testInfo.outputPath("phaser-gameplay-slice.png") });

  const canvas = await page.locator("canvas").evaluate((node) => ({
    width: node.width,
    height: node.height,
    className: node.className,
  }));

  expect(canvas.width).toBe(1280);
  expect(canvas.height).toBe(720);

  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(320);
    await page.keyboard.up("Space");
    await page.waitForTimeout(120);
  }
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "playing");
  await page.keyboard.down("Space");
  await page.waitForTimeout(80);
  await page.keyboard.up("Space");
  await page.waitForTimeout(180);
  await page.screenshot({ path: testInfo.outputPath("phaser-space-action.png") });

  expect(consoleErrors).toEqual([]);
});

test("web game exposes an installable app shell", async ({ page }) => {
  await page.goto("/");
  const manifestLink = page.locator('link[rel="manifest"]');
  await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Spaceblade");
  expect(manifest.display).toBe("fullscreen");
  expect(manifest.start_url).toBe("/");
});

test("shows and dismisses the keyboard warning on coarse-pointer devices", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(pointer: coarse)"
      ? {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; },
        }
      : nativeMatchMedia(query);
  });
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "mobileWarning");
  await page.mouse.click(640, 360);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "title");
});

test("honors the reduced-motion preference without changing one-button play", async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => query === "(prefers-reduced-motion: reduce)"
      ? {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; },
        }
      : nativeMatchMedia(query);
  });
  await page.goto("/");
  await startPhaserGameplay(page);
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-reduced-effects", "true");
});

test("uses a pointer hold as the same one-button energy-shot action", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "title");
  await page.mouse.click(640, 360);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "tutorial");
  await page.mouse.click(640, 360);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "playing");
  expect(await canvas.evaluate((node) => getComputedStyle(node).touchAction)).toBe("none");

  await page.mouse.down();
  await page.waitForTimeout(520);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute("data-spaceblade-projectile-count", "1", { timeout: 2_000 });
});

test("shows recharge feedback when a second energy hold arrives during cooldown", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await startPhaserGameplay(page);

  await page.keyboard.down("Space");
  await page.waitForTimeout(520);
  await page.keyboard.up("Space");
  const readyAt = Number(await canvas.getAttribute("data-spaceblade-energy-ready-at"));
  expect(readyAt).toBeGreaterThan(0);

  await page.keyboard.down("Space");
  await page.waitForTimeout(520);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-combat-callout", "ENERGY RECHARGING  ·  USE SWORD", { timeout: 2_000 });
});

test("releases a pointer hold when the pointer exits the canvas", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "title");
  await page.mouse.click(640, 360);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "tutorial");
  await page.mouse.click(640, 360);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "playing");

  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.waitForTimeout(520);
  await page.mouse.move(-10, -10);
  await page.mouse.up();

  await expect(canvas).toHaveAttribute("data-spaceblade-projectile-count", "1", { timeout: 2_000 });
});

test("Phaser gameplay slice opens the pause menu with a long Space hold", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await startPhaserGameplay(page);
  await page.keyboard.down("Space");
  await page.waitForTimeout(1050);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "paused");
  await page.screenshot({ path: testInfo.outputPath("phaser-pause-menu.png") });

  await page.keyboard.down("Space");
  await page.waitForTimeout(140);
  await page.keyboard.up("Space");
  await page.waitForTimeout(140);
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await page.waitForTimeout(140);
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "settings");

  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(140);
    await page.keyboard.up("Space");
    await page.waitForTimeout(140);
  }
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await page.waitForTimeout(140);
  expect(await page.evaluate(() => window.localStorage.getItem("spaceblade.reducedEffects"))).toBe("true");

  expect(consoleErrors).toEqual([]);
});

test("changes the saved callsign with the one-button settings menu", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);
  await page.keyboard.down("Space");
  await page.waitForTimeout(1050);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "paused");

  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "settings");

  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(120);
    await page.keyboard.up("Space");
  }
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  expect(await page.evaluate(() => window.localStorage.getItem("spaceblade.playerName"))).toBe("Nova");
});

test("opens How To Play from pause and returns without restarting", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);
  const canvas = page.locator("canvas");
  await page.keyboard.down("Space");
  await page.waitForTimeout(1050);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "paused");

  for (let step = 0; step < 2; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(120);
    await page.keyboard.up("Space");
  }
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "tutorial");

  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "paused");
});

test("pauses gameplay when the browser tab becomes hidden", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);
  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "paused");
  await page.keyboard.up("Space");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.keyboard.down("Space");
  await page.waitForTimeout(520);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "playing");
});

test("clears a held action when the window loses focus", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);
  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.keyboard.up("Space");

  await page.keyboard.down("Space");
  await page.waitForTimeout(520);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-player-animation", "heavy");
});

test("Phaser runner sustains repeated one-button combat without taking damage", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await startPhaserGameplay(page);

  for (let step = 0; step < 10; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(520);
    await page.keyboard.up("Space");
    await page.waitForTimeout(280);
  }

  const state = await page.locator("canvas").evaluate((node) => ({
    screen: node.dataset.spacebladeScreen,
    score: Number(node.dataset.spacebladeScore),
    defeated: Number(node.dataset.spacebladeDefeated),
    hearts: Number(node.dataset.spacebladeHearts),
  }));
  expect(state.screen).toBe("playing");
  expect(state.defeated).toBeGreaterThanOrEqual(3);
  expect(state.score).toBeGreaterThanOrEqual(300);
  expect(state.hearts).toBe(3);
  expect(consoleErrors).toEqual([]);
});

test("charged Space fires a visible projectile that travels before impact", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);
  const canvas = page.locator("canvas");

  await page.keyboard.down("Space");
  await page.waitForTimeout(520);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-projectile-count", "1", { timeout: 2_000 });
  const firedX = Number(await canvas.getAttribute("data-spaceblade-projectile-x"));
  expect(firedX).toBeGreaterThan(640);

  await expect(canvas).toHaveAttribute("data-spaceblade-projectile-count", "0", { timeout: 2_000 });
  await expect(canvas).toHaveAttribute("data-spaceblade-combat-callout", "ENERGY HIT", { timeout: 2_000 });
});

test("Phaser runner transitions from the onboarding wave into wave two", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await startPhaserGameplay(page);

  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(520);
    await page.keyboard.up("Space");
    await page.waitForTimeout(280);
  }

  const state = await page.locator("canvas").evaluate((node) => ({
    screen: node.dataset.spacebladeScreen,
    wave: Number(node.dataset.spacebladeWave),
    defeated: Number(node.dataset.spacebladeDefeated),
    hearts: Number(node.dataset.spacebladeHearts),
  }));
  expect(state.screen).toBe("playing");
  expect(state.wave).toBeGreaterThanOrEqual(2);
  expect(state.defeated).toBeGreaterThanOrEqual(8);
  expect(state.hearts).toBe(3);
  expect(consoleErrors).toEqual([]);
});

test("standalone player and enemy frames advance during gameplay", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await startPhaserGameplay(page);

  const first = await page.locator("canvas").evaluate((node) => ({
    player: node.dataset.spacebladePlayerFrame,
    playerAnimation: node.dataset.spacebladePlayerAnimation,
    enemy: node.dataset.spacebladeEnemyFrame,
    background: node.dataset.spacebladeBackgroundOffset,
  }));
  await page.waitForTimeout(220);
  const second = await page.locator("canvas").evaluate((node) => ({
    player: node.dataset.spacebladePlayerFrame,
    enemy: node.dataset.spacebladeEnemyFrame,
    background: node.dataset.spacebladeBackgroundOffset,
  }));

  expect(first.player).toBeTruthy();
  expect(first.playerAnimation).toBe("walk");
  expect(first.player).toContain("/sprites/frames/player/walk-");
  expect(first.enemy).toBeTruthy();
  expect(second.player).not.toBe(first.player);
  expect(second.enemy).not.toBe(first.enemy);
  expect(second.background).not.toBe(first.background);
  expect(consoleErrors).toEqual([]);
});

test("defeated enemies play their authored death frames before disappearing", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await startPhaserGameplay(page);

  for (let step = 0; step < 10; step += 1) {
    await page.keyboard.down("Space");
    await page.waitForTimeout(520);
    await page.keyboard.up("Space");
    await page.waitForTimeout(280);
    if (await page.locator("canvas").getAttribute("data-spaceblade-enemy-death-frame")) break;
  }

  const deathFrame = await page.locator("canvas").getAttribute("data-spaceblade-enemy-death-frame");
  expect(deathFrame).toMatch(/^\/sprites\/frames\/(?:grunt|runner|shield|tank|glitch|boss)\/dead-\d+\.png$/);
  expect(consoleErrors).toEqual([]);
});

test("enemies play their authored recovery frames after impact", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await startPhaserGameplay(page);
  const recoveryFrame = /^\/sprites\/frames\/(?:grunt|runner|shield|tank|glitch|boss)\/recover-\d+\.png$/;
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-enemy-recovery-frame", recoveryFrame, { timeout: 8_000 });
  expect(consoleErrors).toEqual([]);
});

test("shows the parry timing strip during a real enemy telegraph", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-spaceblade-parry-timing-visible", "true", { timeout: 8_000 });
  await expect(canvas).toHaveAttribute("data-spaceblade-parry-timing", /tooEarly|perfect|tooLate/);
});

test("freshly arriving enemies telegraph before their first contact damage", async ({ page }) => {
  await page.goto("/");
  await startPhaserGameplay(page);

  await page.waitForFunction(() => {
    const canvas = document.querySelector("canvas");
    return canvas?.dataset.spacebladeParryTimingVisible === "true"
      && canvas.dataset.spacebladeHearts === "3";
  }, null, { timeout: 8_000 });

  const state = await page.locator("canvas").evaluate((node) => ({
    timing: node.dataset.spacebladeParryTiming,
    hearts: node.dataset.spacebladeHearts,
  }));
  expect(state.timing).toMatch(/tooEarly|perfect|tooLate/);
  expect(state.hearts).toBe("3");
});

test("menus use visible mouse buttons while gameplay remains one-button", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  await waitForPhaserTitle(page);
  await page.mouse.click(640, 350);
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "tutorial");
  await page.mouse.click(640, 350);
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "playing");

  await page.keyboard.down("Space");
  await page.waitForTimeout(1050);
  await page.keyboard.up("Space");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "paused");
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-menu-mode", "mouse");
  await page.mouse.click(640, 430);
  await expect(page.locator("canvas")).toHaveAttribute("data-spaceblade-screen", "playing");
  expect(consoleErrors).toEqual([]);
});

test("publishes the terminal run status and restarts from the end screen", async ({ page }) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`PAGEERROR: ${error.message}`));

  await page.goto("/");
  const canvas = page.locator("canvas");
  await startPhaserGameplay(page);

  await expect(canvas).toHaveAttribute("data-spaceblade-player-dead-frame", /^\/sprites\/frames\/player\/dead-\d+\.png$/, { timeout: 18_000 });
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "gameOver", { timeout: 18_000 });
  await expect(canvas).toHaveAttribute("data-spaceblade-run-status", "gameOver");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen-title", "GAME OVER");
  await expect(canvas).toHaveAttribute("data-spaceblade-grade", /UNRANKED|B|C|A|S|SS|SSS/);

  await page.mouse.click(640, 314);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "playing");
  await expect(canvas).toHaveAttribute("data-spaceblade-run-status", "playing");
  expect(consoleErrors).toEqual([]);
});

test("switches the highscores screen between Global and Friends with Space", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await startPhaserGameplay(page);
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "gameOver", { timeout: 18_000 });

  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-screen", "highscores");
  await expect(canvas).toHaveAttribute("data-spaceblade-highscores-tab", "global");
  await expect(canvas).toHaveAttribute("data-spaceblade-highscores-state", "disabled");

  await page.keyboard.down("Space");
  await page.waitForTimeout(120);
  await page.keyboard.up("Space");
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await expect(canvas).toHaveAttribute("data-spaceblade-highscores-tab", "friends");
});
