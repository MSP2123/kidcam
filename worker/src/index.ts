import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, SessionUser } from "./types";
import { chatIdFor, getSessionUser, hashPin, newId, newSalt, normalizeUsername } from "./auth";

const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // KV values are capped at 25MiB; stay safely under that.
const MAX_VIDEO_SECONDS = 30;

const app = new Hono<{ Bindings: Env; Variables: { user: SessionUser } }>();

app.use("*", async (c, next) => {
  const handler = cors({ origin: c.env.ALLOWED_ORIGIN ?? "*", allowHeaders: ["Authorization", "Content-Type"] });
  return handler(c, next);
});

app.post("/api/signup", async (c) => {
  const body = await c.req.json<{ username?: string; pin?: string }>();
  const username = normalizeUsername(body.username ?? "");
  const pin = body.pin ?? "";

  if (username.length < 3) return c.json({ error: "Username needs at least 3 letters or numbers." }, 400);
  if (!/^\d{4,6}$/.test(pin)) return c.json({ error: "PIN must be 4 to 6 digits." }, 400);

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
  if (existing) return c.json({ error: "That username is already taken." }, 409);

  const id = newId();
  const salt = newSalt();
  const pinHash = await hashPin(pin, salt);

  await c.env.DB.prepare(
    "INSERT INTO users (id, username, pin_hash, pin_salt, created_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(id, username, pinHash, salt, Date.now())
    .run();

  const token = newId();
  await c.env.DB.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)")
    .bind(token, id, Date.now())
    .run();

  return c.json({ token, user: { id, username } }, 201);
});

app.post("/api/login", async (c) => {
  const body = await c.req.json<{ username?: string; pin?: string }>();
  const username = normalizeUsername(body.username ?? "");
  const pin = body.pin ?? "";

  const user = await c.env.DB.prepare(
    "SELECT id, username, pin_hash, pin_salt FROM users WHERE username = ?",
  )
    .bind(username)
    .first<{ id: string; username: string; pin_hash: string; pin_salt: string }>();

  if (!user) return c.json({ error: "Username or PIN is incorrect." }, 401);

  const computedHash = await hashPin(pin, user.pin_salt);
  if (computedHash !== user.pin_hash) return c.json({ error: "Username or PIN is incorrect." }, 401);

  const token = newId();
  await c.env.DB.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)")
    .bind(token, user.id, Date.now())
    .run();

  return c.json({ token, user: { id: user.id, username: user.username } });
});

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/signup" || c.req.path === "/api/login") return next();
  const user = await getSessionUser(c.req.raw, c.env);
  if (!user) return c.json({ error: "Not signed in." }, 401);
  c.set("user", user);
  return next();
});

app.get("/api/me", (c) => c.json({ user: c.get("user") }));

app.post("/api/friends/request", async (c) => {
  const me = c.get("user");
  const body = await c.req.json<{ username?: string }>();
  const targetUsername = normalizeUsername(body.username ?? "");

  if (targetUsername === me.username) return c.json({ error: "You can't add yourself." }, 400);

  const target = await c.env.DB.prepare("SELECT id, username FROM users WHERE username = ?")
    .bind(targetUsername)
    .first<{ id: string; username: string }>();
  if (!target) return c.json({ error: "No one has that username." }, 404);

  const requestId = [me.id, target.id].sort().join("_");
  await c.env.DB.prepare(
    `INSERT INTO friend_requests (id, from_uid, from_username, to_uid, to_username, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)
     ON CONFLICT(id) DO UPDATE SET status = 'pending', created_at = excluded.created_at
     WHERE friend_requests.status = 'declined'`,
  )
    .bind(requestId, me.id, me.username, target.id, target.username, Date.now())
    .run();

  return c.json({ ok: true });
});

app.get("/api/friends/requests/incoming", async (c) => {
  const me = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM friend_requests WHERE to_uid = ? AND status = 'pending' ORDER BY created_at DESC",
  )
    .bind(me.id)
    .all();
  return c.json({ requests: results });
});

app.get("/api/friends/requests/sent", async (c) => {
  const me = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM friend_requests WHERE from_uid = ? AND status = 'pending' ORDER BY created_at DESC",
  )
    .bind(me.id)
    .all();
  return c.json({ requests: results });
});

app.post("/api/friends/requests/:id/respond", async (c) => {
  const me = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json<{ accept?: boolean }>();

  const request = await c.env.DB.prepare("SELECT * FROM friend_requests WHERE id = ?")
    .bind(id)
    .first<{
      id: string;
      from_uid: string;
      from_username: string;
      to_uid: string;
      to_username: string;
      status: string;
    }>();

  if (!request || request.to_uid !== me.id || request.status !== "pending") {
    return c.json({ error: "Request not found." }, 404);
  }

  const newStatus = body.accept ? "accepted" : "declined";
  await c.env.DB.prepare("UPDATE friend_requests SET status = ? WHERE id = ?").bind(newStatus, id).run();

  if (body.accept) {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT OR REPLACE INTO friends (uid, friend_uid, friend_username) VALUES (?, ?, ?)",
      ).bind(request.from_uid, request.to_uid, request.to_username),
      c.env.DB.prepare(
        "INSERT OR REPLACE INTO friends (uid, friend_uid, friend_username) VALUES (?, ?, ?)",
      ).bind(request.to_uid, request.from_uid, request.from_username),
    ]);
  }

  return c.json({ ok: true });
});

app.get("/api/friends", async (c) => {
  const me = c.get("user");
  const { results } = await c.env.DB.prepare(
    "SELECT friend_uid as uid, friend_username as username FROM friends WHERE uid = ?",
  )
    .bind(me.id)
    .all();
  return c.json({ friends: results });
});

app.get("/api/chats/:friendUid/messages", async (c) => {
  const me = c.get("user");
  const friendUid = c.req.param("friendUid");
  const chatId = chatIdFor(me.id, friendUid);

  const { results } = await c.env.DB.prepare(
    "SELECT id, sender_id, sender_username, duration_seconds, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC",
  )
    .bind(chatId)
    .all();

  return c.json({ messages: results });
});

app.post("/api/chats/:friendUid/messages", async (c) => {
  const me = c.get("user");
  const friendUid = c.req.param("friendUid");

  const friend = await c.env.DB.prepare(
    "SELECT friend_username FROM friends WHERE uid = ? AND friend_uid = ?",
  )
    .bind(me.id, friendUid)
    .first<{ friend_username: string }>();
  if (!friend) return c.json({ error: "Not friends with that user." }, 403);

  const form = await c.req.formData();
  const file = form.get("video");
  const durationSeconds = Number(form.get("durationSeconds") ?? 0);

  if (!(file instanceof File)) return c.json({ error: "No video file received." }, 400);
  if (file.size > MAX_VIDEO_BYTES) return c.json({ error: "Video is too large." }, 413);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_VIDEO_SECONDS) {
    return c.json({ error: "Video must be 30 seconds or less." }, 400);
  }

  const chatId = chatIdFor(me.id, friendUid);
  const messageId = newId();
  const kvKey = `${chatId}/${messageId}`;
  const contentType = file.type || "video/webm";

  await c.env.VIDEOS.put(kvKey, await file.arrayBuffer(), {
    metadata: { contentType },
  });

  await c.env.DB.prepare(
    `INSERT INTO messages (id, chat_id, sender_id, sender_username, kv_key, content_type, duration_seconds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(messageId, chatId, me.id, me.username, kvKey, contentType, Math.round(durationSeconds), Date.now())
    .run();

  return c.json({ ok: true, id: messageId });
});

app.get("/api/videos/:messageId", async (c) => {
  const me = c.get("user");
  const messageId = c.req.param("messageId");

  const message = await c.env.DB.prepare("SELECT chat_id, kv_key, content_type FROM messages WHERE id = ?")
    .bind(messageId)
    .first<{ chat_id: string; kv_key: string; content_type: string }>();

  if (!message || !message.chat_id.split("_").includes(me.id)) {
    return c.json({ error: "Not found." }, 404);
  }

  const { value, metadata } = await c.env.VIDEOS.getWithMetadata(message.kv_key, "arrayBuffer");
  if (!value) return c.json({ error: "Video not found." }, 404);

  const contentType = (metadata as { contentType?: string } | null)?.contentType ?? message.content_type;
  return new Response(value, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
});

export default app;
