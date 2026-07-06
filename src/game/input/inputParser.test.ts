import { describe, it, expect } from "vitest";
import { createInputParser } from "./inputParser";

describe("createInputParser", () => {
  it("returns tap for a single quick press", () => {
    const p = createInputParser();
    expect(p.keyDown(0)).toBeNull();
    expect(p.keyUp(100)).toBe("tap");
  });

  it("returns doubleTap on the second release within the window", () => {
    const p = createInputParser();
    p.keyDown(0);
    expect(p.keyUp(100)).toBe("tap");
    p.keyDown(150);
    expect(p.keyUp(250)).toBe("doubleTap"); // second keyup within 300ms of first
  });

  it("does not double tap when the second release is outside the window", () => {
    const p = createInputParser();
    p.keyDown(0);
    expect(p.keyUp(100)).toBe("tap");
    p.keyDown(500);
    expect(p.keyUp(600)).toBe("tap"); // 600 - 100 = 500ms > 300ms
  });

  it("exposes holdStart exactly once after 220ms held", () => {
    const p = createInputParser();
    p.keyDown(0);
    expect(p.peekHeldAction(100)).toBeNull(); // below threshold
    expect(p.peekHeldAction(220)).toBe("holdStart");
    expect(p.peekHeldAction(300)).toBeNull(); // only once
  });

  it("returns holdRelease when released at or after 300ms", () => {
    const p = createInputParser();
    p.keyDown(0);
    p.peekHeldAction(220);
    expect(p.keyUp(320)).toBe("holdRelease");
  });

  it("returns null for an aborted charge released between thresholds", () => {
    const p = createInputParser();
    p.keyDown(0);
    expect(p.keyUp(250)).toBeNull(); // >=180 and <300
  });

  it("ignores repeated keydown while already held", () => {
    const p = createInputParser();
    p.keyDown(0);
    p.keyDown(50); // auto-repeat, ignored
    p.keyDown(120); // auto-repeat, ignored
    // Still a single tap measured from the first keydown.
    expect(p.keyUp(160)).toBe("tap");
  });

  it("ignores a keyup with no active hold", () => {
    const p = createInputParser();
    expect(p.keyUp(100)).toBeNull();
  });

  it("does not emit holdStart after release", () => {
    const p = createInputParser();
    p.keyDown(0);
    p.keyUp(320);
    expect(p.peekHeldAction(600)).toBeNull();
  });
});
