import { describe, it, expect } from "vitest";
import { validateSprite } from "./pixelSprite";
import type { PixelSprite } from "./pixelSprite";

const good: PixelSprite = {
  id: "good",
  w: 3,
  h: 2,
  palette: { a: "#fff", b: "#000" },
  rows: ["a.b", "b.a"],
};

describe("validateSprite", () => {
  it("returns no problems for a well-formed sprite", () => {
    expect(validateSprite(good)).toEqual([]);
  });

  it("flags the wrong number of rows", () => {
    const bad = { ...good, rows: ["a.b"] };
    expect(validateSprite(bad).length).toBeGreaterThan(0);
  });

  it("flags a row whose width does not match w", () => {
    const bad = { ...good, rows: ["a.b", "ab"] };
    expect(validateSprite(bad).length).toBeGreaterThan(0);
  });

  it("flags an unknown palette character", () => {
    const bad = { ...good, rows: ["a.b", "b.z"] };
    expect(validateSprite(bad).length).toBeGreaterThan(0);
  });

  it("treats '.' as transparent and always valid", () => {
    const dots: PixelSprite = { id: "dots", w: 2, h: 2, palette: {}, rows: ["..", ".."] };
    expect(validateSprite(dots)).toEqual([]);
  });
});
