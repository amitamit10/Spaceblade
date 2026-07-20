import { describe, expect, it } from "vitest";
import { rebuildAutoParkourOffset, rebuildFloorTransitionOffset, rebuildFloorTraversalPhase, rebuildPlayerVisualOffset, rebuildShakeOffset } from "./renderScene";

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

  it("automatically vaults without requiring a second control", () => {
    const takeoff = rebuildAutoParkourOffset(180, "right");
    const landing = rebuildAutoParkourOffset(620, "right");

    expect(takeoff.y).toBeLessThan(0);
    expect(takeoff.x).toBeGreaterThan(0);
    expect(takeoff.angle).not.toBe(0);
    expect(landing.y).toBeLessThan(0);
    expect(rebuildAutoParkourOffset(1200, "right")).toEqual({ x: 0, y: 0, angle: 0 });
  });

  it("vaults forward in the direction the runner is facing", () => {
    expect(rebuildAutoParkourOffset(180, "left").x).toBeLessThan(0);
  });

  it("climbs to the next building floor automatically between waves", () => {
    const climb = rebuildFloorTransitionOffset(700, "right");

    expect(climb).not.toBeNull();
    expect(climb!.y).toBeLessThan(-100);
    expect(rebuildFloorTransitionOffset(1500, "right")).toBeNull();
  });

  it("labels the automatic route through the building shaft", () => {
    expect(rebuildFloorTraversalPhase(0)).toBe("vault");
    expect(rebuildFloorTraversalPhase(700)).toBe("wall-climb");
    expect(rebuildFloorTraversalPhase(1200)).toBe("landing");
    expect(rebuildFloorTraversalPhase(1500)).toBe("complete");
  });
});
