import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMainGameScene } from "./mainGameScene";
import type { SettingsState } from "../../app/types";

const settings: SettingsState = {
  screenShakeEnabled: true,
  reducedEffectsEnabled: false,
  volume: 0,
};

describe("createMainGameScene input lifecycle", () => {
  const frames: FrameRequestCallback[] = [];
  let nowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    frames.length = 0;
    nowSpy = vi.spyOn(performance, "now").mockReturnValue(0);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    nowSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("does not pause while the player is charging a heavy slash", () => {
    const canvas = document.createElement("canvas");
    const onPauseRequest = vi.fn();
    const scene = createMainGameScene(canvas, settings, { onPauseRequest });
    scene.start();

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));
    frames.at(-1)?.(250);
    frames.at(-1)?.(950);

    expect(onPauseRequest).not.toHaveBeenCalled();
    scene.stop();
  });
});
