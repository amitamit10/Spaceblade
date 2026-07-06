import { describe, it, expect, vi } from "vitest";
import { createSpaceMenuController } from "./spaceMenuController";

describe("createSpaceMenuController", () => {
  it("focuses the first action initially", () => {
    const c = createSpaceMenuController(["resume", "settings", "quit"], () => {});
    expect(c.getFocusedAction()).toBe("resume");
  });

  it("cycles focus forward on tap", () => {
    const c = createSpaceMenuController(["resume", "settings", "quit"], () => {});
    c.onTap();
    expect(c.getFocusedAction()).toBe("settings");
    c.onTap();
    expect(c.getFocusedAction()).toBe("quit");
  });

  it("wraps around to the first action", () => {
    const c = createSpaceMenuController(["resume", "settings", "quit"], () => {});
    c.onTap();
    c.onTap();
    c.onTap();
    expect(c.getFocusedAction()).toBe("resume");
  });

  it("does not move focus for single-action screens", () => {
    const c = createSpaceMenuController(["start"], () => {});
    c.onTap();
    expect(c.getFocusedAction()).toBe("start");
  });

  it("confirms the focused action on hold", () => {
    const onConfirm = vi.fn();
    const c = createSpaceMenuController(["resume", "settings", "quit"], onConfirm);
    c.onTap();
    c.onHoldConfirm();
    expect(onConfirm).toHaveBeenCalledWith("settings");
  });

  it("resets focus back to the first action", () => {
    const c = createSpaceMenuController(["resume", "settings", "quit"], () => {});
    c.onTap();
    c.onTap();
    c.reset();
    expect(c.getFocusedAction()).toBe("resume");
  });
});
