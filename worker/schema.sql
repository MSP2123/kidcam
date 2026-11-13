CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  from_uid TEXT NOT NULL,
  from_username TEXT NOT NULL,
  to_uid TEXT NOT NULL,
  to_username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to ON friend_requests(to_uid, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests(from_uid, status);

CREATE TABLE IF NOT EXISTS friends (
  uid TEXT NOT NULL,
  friend_uid TEXT NOT NULL,
  friend_username TEXT NOT NULL,
  PRIMARY KEY (uid, friend_uid)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_username TEXT NOT NULL,
  kv_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
