const { test, expect } = require("@playwright/test");
const fs = require("node:fs");

test("title to tutorial to live play renders without browser errors", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Spaceblade")).toBeVisible();
  await expect(page.getByText("Press Space To Start")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("01-title.png") });

  await page.keyboard.press("Space");
  await expect(page.getByText("How To Play")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("02-tutorial.png") });

  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
  await page.waitForTimeout(500);
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath("03-playing-start.png") });

  await page.waitForTimeout(2500);
  await page.screenshot({ path: testInfo.outputPath("04-playing-live.png") });

  fs.writeFileSync(
    testInfo.outputPath("report.json"),
    JSON.stringify(
      {
        consoleErrors,
        bodyText: await page.locator("body").innerText(),
        canvasCount: await page.locator("canvas").count(),
      },
      null,
      2,
    ),
  );

  expect(consoleErrors).toEqual([]);
});
