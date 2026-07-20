import { randomUUID } from "node:crypto";

const apiKey = process.env.VITE_FIREBASE_API_KEY;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  console.error("Firebase rule verification requires VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID.");
  process.exit(2);
}

const documentId = `rules-probe-${randomUUID()}`;
const documentName = `projects/${projectId}/databases/(default)/documents/leaderboardScores/${documentId}`;
const requestBody = {
  writes: [{
    update: {
      name: documentName,
      fields: {
        playerName: { stringValue: "Probe" },
        score: { integerValue: "1" },
        wave: { integerValue: "1" },
        enemiesDefeated: { integerValue: "0" },
        parries: { integerValue: "0" },
        clientRunId: { stringValue: "rules-probe-12345678" },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    },
  }],
};

const endpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit?key=${encodeURIComponent(apiKey)}`;
const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(requestBody),
});
const responseText = await response.text();
const rejected = response.status === 403 && responseText.includes("PERMISSION_DENIED");

if (!rejected) {
  console.error(`Expected Firestore to reject the invalid public write; received HTTP ${response.status}.`);
  process.exit(1);
}

console.log(JSON.stringify({ invalidPublicWrite: "rejected", status: response.status }));
