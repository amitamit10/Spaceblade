import { describe, expect, it } from "vitest";
import { rebuildPlayerVisualOffset, rebuildShakeOffset } from "./renderScene";

describe("rebuild camera feedback", () => {
  it("does not move an idle scene", () => {
    expect(rebuildShakeOffset("idle", 120)).toEqual({ x: 0, y: 0 });
    expect(rebuildShakeOffset(undefined, 120)).toEqual({ x: 0, y: 0 });
  });

  it("gives heavy actions stronger motion than quick actions", () => {
    const quick = rebuildShakeOffset("slash", 48);
    const heavy = rebuildShakeOffset("heavy", 48);

    expect(Math.abs(heavy.x)).toBeGreaterThan(Math.abs(quick.x));
    expect(Math.abs(heavy.y)).toBeGreaterThan(Math.abs(quick.y));
  });

  it("keeps the one-button player centered at rest but visibly moves actions", () => {
    expect(rebuildPlayerVisualOffset("idle", 0, "right").x).toBe(0);
    expect(rebuildPlayerVisualOffset("slash", 130, "right").x).toBeGreaterThan(0);
    expect(rebuildPlayerVisualOffset("dodge", 130, "right").x).toBeLessThan(0);
  });
});
