import { describe, expect, it } from "vitest";
import { shouldPauseForVisibility } from "./spacebladeVisibility";

describe("spaceblade visibility handling", () => {
  it("pauses only an active run when the document is hidden", () => {
    expect(shouldPauseForVisibility(true, "playing")).toBe(true);
    expect(shouldPauseForVisibility(true, "title")).toBe(false);
    expect(shouldPauseForVisibility(false, "playing")).toBe(false);
  });
});
