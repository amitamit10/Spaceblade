import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => {
  class MockScene {}
  return {
    default: {
      AUTO: "AUTO",
      Scale: { FIT: "FIT", CENTER_BOTH: "CENTER_BOTH" },
      Scene: MockScene,
      Game: class MockGame {},
    },
  };
});

import Phaser from "phaser";
import { createSpacebladeGameConfig, SPACEBLADE_HEIGHT, SPACEBLADE_WIDTH } from "./spacebladeConfig";
import { SpacebladePlayScene } from "./spacebladeScene";

describe("Phaser game shell", () => {
  it("uses the locked low-cost arena dimensions", () => {
    const config = createSpacebladeGameConfig({ parent: "app" });

    expect(SPACEBLADE_WIDTH).toBe(1280);
    expect(SPACEBLADE_HEIGHT).toBe(720);
    expect(config.width).toBe(SPACEBLADE_WIDTH);
    expect(config.height).toBe(SPACEBLADE_HEIGHT);
    expect(config.type).toBe(Phaser.AUTO);
    expect(config.render?.pixelArt).toBe(true);
    expect(config.scale?.mode).toBe(Phaser.Scale.FIT);
  });

  it("keeps the low-cost 30 FPS frame pacing contract", () => {
    const config = createSpacebladeGameConfig({ parent: "app" });

    expect(config.fps?.target).toBe(30);
    expect(config.fps?.forceSetTimeOut).toBe(true);
  });

  it("keeps the first engine slice independent of server state", () => {
    const config = createSpacebladeGameConfig({ parent: "app" });

    expect(config.scene).toEqual([SpacebladePlayScene]);
    expect(config.physics).toBeUndefined();
  });
});
