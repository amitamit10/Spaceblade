import { describe, expect, it } from "vitest";
import { initialSpacebladeScreen } from "./spacebladeDevice";

describe("Spaceblade entry device flow", () => {
  it("shows the keyboard warning only for coarse-pointer devices", () => {
    expect(initialSpacebladeScreen(true)).toBe("mobileWarning");
    expect(initialSpacebladeScreen(false)).toBe("title");
  });
});
