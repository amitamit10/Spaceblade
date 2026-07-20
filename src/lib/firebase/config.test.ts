import { afterEach, describe, expect, it, vi } from "vitest";
import { getFirebaseConfig, isFirebaseConfigValue } from "./config";

describe("Firebase configuration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects blank and placeholder values", () => {
    expect(isFirebaseConfigValue(" ")).toBe(false);
    expect(isFirebaseConfigValue("your_api_key")).toBe(false);
    expect(isFirebaseConfigValue("replace_me")).toBe(false);
    expect(isFirebaseConfigValue("project-123")).toBe(true);
  });

  it("normalizes configured values before creating the client config", () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", " key ");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", " project ");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app");

    expect(getFirebaseConfig()).toEqual({
      apiKey: "key",
      authDomain: "domain",
      projectId: "project",
      appId: "app",
    });
  });

  it("returns null when any required value is only a placeholder", () => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "key");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "domain");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "your_project_id");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "app");

    expect(getFirebaseConfig()).toBeNull();
  });
});
