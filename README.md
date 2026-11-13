# KidCam

A small web app, installable on both iPadOS (Safari) and Android (Chrome),
where kids can add each other as friends by username and send 30-second
videos back and forth. Each friend shows up as a small chat thread of video
bubbles.

## How it works

- **Login**: username + 4-6 digit PIN (no email needed). Under the hood this
  maps to a normal Firebase email/password account (`username@kidcam.local`),
  so no custom server is needed.
- **Friends**: add someone by username, they get a request, accept/decline.
- **Chat**: tap a friend, hit "Record a video", record up to 30 seconds from
  the front camera, preview it, then send. Videos upload to Firebase Storage
  and show up as playable bubbles in the thread for both people.
- **Installable**: it's a PWA — "Add to Home Screen" on iPad, or Chrome's
  install prompt on Android — so it opens full-screen like a native app.

## One-time Firebase setup

1. Go to the [Firebase console](https://console.firebase.google.com/) and
   create a new project (billing not required — everything here fits in the
   free Spark plan).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create a database (production mode is fine,
   since the rules below lock it down).
4. **Storage** → create a default bucket.
5. **Project settings** → add a Web app → copy the config values into
   `.env.local` (copy `.env.example` to `.env.local` first):

   ```bash
   cp .env.example .env.local
   ```

   Fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

6. Deploy the security rules in this repo so only the two people in a chat
   can see it:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore storage   # point at the existing rules files, don't overwrite them
   firebase deploy --only firestore:rules,storage:rules
   ```

   (Or just paste the contents of `firestore.rules` and `storage.rules` into
   the console's Rules tabs for Firestore and Storage.)

## Running it

```bash
npm install
npm run dev
```

Open the printed URL on your computer to test, or on your phone/iPad's
browser (same Wi-Fi network, using your computer's local IP) to try the
camera for real — camera access needs HTTPS or `localhost`, so for testing
across devices you'll want to deploy it (step below) rather than using the
raw dev server's IP address.

## Deploying so it's installable on real devices

This repo deploys itself to **GitHub Pages** via `.github/workflows/deploy.yml`
every time `main` is pushed. One-time setup:

1. In the repo on GitHub: **Settings → Pages → Source → GitHub Actions**.
2. **Settings → Secrets and variables → Actions** → add these six repository
   secrets with your real Firebase config values (from step 5 above):
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
3. Push to `main` — the Actions tab will show the build + deploy run, and
   the site will be live at `https://<your-username>.github.io/kidcam/`.

(These Firebase values aren't secret in the usual sense — they're visible in
any Firebase web app's bundle — but keeping them in repo secrets means you
don't have to commit `.env.local`, and makes it trivial to swap projects.)

Then on the iPad, open that URL in Safari → Share → **Add to Home
Screen**. On Android, open it in Chrome and tap **Install app** when
prompted (or Menu → Add to Home screen).

Alternatively, Firebase Hosting works too: `npm run build && firebase deploy
--only hosting` (skip setting `GITHUB_PAGES=true` in that case, since the
app would then be served from the domain root, not a `/kidcam/` subpath).

## Notes / limits

- Videos are recorded as WebM (VP8/VP9) via `MediaRecorder`, which both
  Safari (iPadOS 17+) and Chrome support.
- There's a hard 30-second cap enforced client-side during recording, and a
  60MB upload size cap enforced by the Storage rules as a backstop.
- Usernames are first-come-first-served and globally unique.
