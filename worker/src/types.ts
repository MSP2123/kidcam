export interface Env {
  DB: D1Database;
  VIDEOS: KVNamespace;
  ALLOWED_ORIGIN: string;
}

export interface SessionUser {
  id: string;
  username: string;
}
