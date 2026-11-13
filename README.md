# KidCam

A small web app, installable on both iPadOS (Safari) and Android (Chrome),
where kids can add each other as friends by username and send 30-second
videos back and forth. Each friend shows up as a small chat thread of video
bubbles. The whole stack runs on Cloudflare's free tier.

**Live app:** https://kidcam.marksmurfik-d59.workers.dev
**API:** https://kidcam-api.marksmurfik-d59.workers.dev

## How it works

- **Login**: username + 4-6 digit PIN (no email needed). The PIN is hashed
  (PBKDF2) and never stored in plain text.
- **Friends**: add someone by username, they get a request, accept/decline.
- **Chat**: tap a friend, hit "Record a video", record up to 30 seconds from
  the front camera, preview it, then send. The friends list and chat refresh
  every few seconds (simple polling — no realtime infra needed for this).
- **Installable**: it's a PWA — "Add to Home Screen" on iPad, or Chrome's
  install prompt on Android — so it opens full-screen like a native app.

## Architecture

- **Frontend** (`/`): React + Vite, deployed as a Cloudflare Worker with
  static assets (the modern replacement for "Cloudflare Pages").
- **Backend** (`/worker`): a Cloudflare Worker (Hono) exposing a small REST
  API — signup/login, friend requests, and chat messages.
- **Database**: Cloudflare D1 (SQLite) — users, sessions, friends, friend
  requests, message metadata.
- **Video storage**: Cloudflare Workers KV — each video is one KV value
  (capped at 20MB, well under KV's 25MB limit; a 30-second clip is normally
  a few MB). Videos are fetched as authenticated blobs, not public URLs.

Both the frontend and the API are on Cloudflare's **free plan** — no credit
card needed anywhere in this stack, and nothing here can incur a surprise
charge (free-tier limits just stop working rather than billing you).

## One-time setup (if you want to redeploy this yourself)

1. Install Wrangler and log in:
   ```bash
   npm install -g wrangler
   wrangler login
   ```
2. Create your own D1 database and KV namespace, then update the ids in
   `worker/wrangler.toml`:
   ```bash
   cd worker
   npm install
   wrangler d1 create kidcam-db
   wrangler kv namespace create kidcam_videos
   # paste the printed database_id / id into wrangler.toml
   wrangler d1 execute kidcam-db --remote --file=./schema.sql
   ```
3. Deploy the API:
   ```bash
   wrangler deploy
   ```
   Note the `https://kidcam-api.<your-subdomain>.workers.dev` URL it prints.
4. Back in the project root, point the frontend at your API and deploy it:
   ```bash
   cd ..
   npm install
   echo "VITE_API_BASE=https://kidcam-api.<your-subdomain>.workers.dev" > .env.local
   npm run build
   wrangler deploy
   ```
5. Update `worker/wrangler.toml`'s `ALLOWED_ORIGIN` to your frontend's
   deployed URL (tightens CORS) and redeploy the API:
   ```bash
   cd worker && wrangler deploy
   ```

## Running it locally

```bash
npm install
npm run dev
```

The dev server talks to whatever `VITE_API_BASE` points at in `.env.local`
(normally the deployed Worker — there's no need to run the API locally too,
though `wrangler dev` in `worker/` works if you want to).

Camera access needs HTTPS or `localhost`, so for testing the camera on an
iPad or Android phone, use the deployed URL rather than your dev server's
local network IP.

## Installing on a device

On the iPad, open the deployed URL in Safari → Share → **Add to Home
Screen**. On Android, open it in Chrome and tap **Install app** when
prompted (or Menu → Add to Home screen).

## Notes / limits

- Videos are recorded as WebM (VP8/VP9) via `MediaRecorder`, which both
  Safari (iPadOS 17+) and Chrome support.
- There's a hard 30-second cap enforced client-side during recording, and a
  20MB upload size cap enforced by the Worker as a backstop (KV's hard limit
  is 25MB per value).
- Usernames are first-come-first-served and globally unique.
- Friends/chat use polling (every ~4s) instead of websockets — simple and
  reliable for this scale, at the cost of a few seconds of lag.
