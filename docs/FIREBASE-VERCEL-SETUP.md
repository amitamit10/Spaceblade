# Firebase Leaderboard Setup

The game is fully playable without Firebase. Complete this checklist only when
the online leaderboard should be enabled.

## 1. Create The Free Backend

1. Create a Firebase project in the Firebase console.
2. Create a Cloud Firestore database in production mode.
3. Register a web app in the project settings.
4. Copy the web app values for `apiKey`, `authDomain`, `projectId`, and
   `appId`.

## 2. Apply The Rules

From the repository root, use the Firebase CLI through `npx` so no global
installation is required. The repository already contains `firebase.json`
pointing at the checked-in rules:

```bash
npx firebase-tools@latest login
npx firebase-tools@latest use --add
npx firebase-tools@latest deploy --only firestore:rules
```

Choose the project created in step 1. The checked-in [`firestore.rules`](../firestore.rules)
file is the authoritative rule set. It permits validated creates and public
reads, requires a server timestamp, and rejects updates and deletes.

## 3. Add Vercel Variables

Add the four values to the Spaceblade Vercel project for **Production**. Never
commit them to the repository:

```bash
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_APP_ID production
```

For a local configured check, pull the production values into the ignored
`.env.production.local` file:

```bash
vercel env pull --environment=production .env.production.local
```

Never commit that file or paste its contents into chat.

Deploy a fresh production build after adding them:

```bash
vercel deploy --prod --yes
```

## 4. Verify The Online Path

1. Open the production URL and start a run with Space.
2. End an eligible run with a score of at least `100`.
3. Open **Highscores** and confirm Global records loads without the disabled
   message.
4. Confirm the submitted row contains the callsign, score, wave, grade, and a
   server-generated timestamp.
5. Run the automated offline-first gate, which must still pass:

```bash
npm run verify:production
npm run verify:production:online
```

To verify the deployed public-write boundary without creating a document, pull
the production values into the ignored env file and run the rules probe:

```bash
vercel env pull --environment=production .env.production.local
node --env-file=.env.production.local scripts/verify-firebase-rules.mjs
```

The probe submits an intentionally invalid score and expects HTTP 403. It never
prints the Firebase API key and never writes a valid leaderboard record.

If a configured read fails, the Global screen exposes a one-button retry. If
Firebase values are absent or placeholders, the game intentionally remains in
the disabled state and never attempts a network request during normal play.
