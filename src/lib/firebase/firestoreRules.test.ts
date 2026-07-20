import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const rules = readFileSync(join(process.cwd(), "firestore.rules"), "utf8");

describe("Firestore leaderboard rules", () => {
  it("requires validated public creates and rejects mutations", () => {
    expect(rules).toContain("allow read: if true;");
    expect(rules).toContain("allow create: if");
    expect(rules).toContain("request.resource.data.createdAt is timestamp");
    expect(rules).toContain("request.resource.data.score >= 100");
    expect(rules).toContain("request.resource.data.score <= 999999");
    expect(rules).toContain("allow update, delete: if false;");
  });
});
