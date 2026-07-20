export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
};

const PLACEHOLDER_VALUE = /^(your_|replace_|change_|example|todo)/i;

export function isFirebaseConfigValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.length > 0 && !PLACEHOLDER_VALUE.test(normalized);
}

/**
 * Reads Firebase config from Vite env vars. Returns null when any required
 * value is missing, which makes the leaderboard degrade to "disabled" instead
 * of failing — gameplay never depends on a backend being configured.
 */
export function getFirebaseConfig(): FirebaseConfig | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID;
  const appId = env.VITE_FIREBASE_APP_ID;

  if (
    !isFirebaseConfigValue(apiKey) ||
    !isFirebaseConfigValue(authDomain) ||
    !isFirebaseConfigValue(projectId) ||
    !isFirebaseConfigValue(appId)
  ) return null;
  return {
    apiKey: apiKey.trim(),
    authDomain: authDomain.trim(),
    projectId: projectId.trim(),
    appId: appId.trim(),
  };
}
