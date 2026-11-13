import type { Env, SessionUser } from "./types";

const PBKDF2_ITERATIONS = 100_000;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export function newSalt(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);

  const row = await env.DB.prepare(
    `SELECT u.id as id, u.username as username
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
  )
    .bind(token)
    .first<SessionUser>();

  return row ?? null;
}

export function chatIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}
