import { describe, it, expect } from "vitest";
import { pixelBackgroundThemes, drawPixelBackground } from "./pixelBackground";

describe("pixel background", () => {
  it("supports all three sector themes", () => {
    expect(pixelBackgroundThemes()).toEqual([
      "neonCity",
      "industrialSector",
      "corruptedCore",
    ]);
  });

  it("does not throw when given a minimal 2d context stub", () => {
    const calls: string[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === "canvas") return { width: 1280, height: 720 };
          if (prop === "createLinearGradient") {
            return () => ({ addColorStop: () => calls.push("stop") });
          }
          return () => calls.push(String(prop));
        },
      },
    ) as unknown as CanvasRenderingContext2D;
    expect(() => drawPixelBackground(ctx, "neonCity", 0)).not.toThrow();
    expect(calls.length).toBeGreaterThan(0);
  });
});
