import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from "node:crypto";
import type { DB } from "../db/client";

const SESSION_DAYS = 7;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export type Role = "admin" | "editor" | "sales";
export type SessionUser = { id: number; email: string; name: string; role: Role };
export type Session = { user: SessionUser; csrf: string };

function scrypt(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? reject(e) : resolve(k))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Minimum bar for admin passwords. */
export function passwordProblem(pw: string): string | null {
  if (pw.length < 12) return "Password must be at least 12 characters";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw))
    return "Password needs upper case, lower case and a number";
  return null;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const hashToken = sha256;

export async function createUser(
  db: DB,
  u: { email: string; name: string; password: string; role: Role },
): Promise<number> {
  const problem = passwordProblem(u.password);
  if (problem) throw new Error(problem);
  const hash = await hashPassword(u.password);
  const r = db
    .prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(u.email.trim().toLowerCase(), u.name.trim(), hash, u.role);
  return Number(r.lastInsertRowid);
}

export type LoginResult =
  | { ok: true; token: string; session: Session }
  | { ok: false; reason: "invalid" | "locked" };

// Pre-computed hash so unknown-email logins cost the same as real ones.
let dummyHash: Promise<string> | null = null;

export async function login(db: DB, email: string, password: string): Promise<LoginResult> {
  const user = db
    .prepare("SELECT * FROM users WHERE email = ? AND active = 1")
    .get(email.trim().toLowerCase()) as
    | {
        id: number;
        email: string;
        name: string;
        role: Role;
        password_hash: string;
        failed_logins: number;
        locked_until: string | null;
      }
    | undefined;

  if (!user) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return { ok: false, reason: "invalid" };
  }
  if (user.locked_until && Date.parse(user.locked_until) > Date.now()) {
    return { ok: false, reason: "locked" };
  }
  const good = await verifyPassword(password, user.password_hash);
  if (!good) {
    const fails = user.failed_logins + 1;
    const lock = fails >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
    db.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?").run(
      lock ? 0 : fails,
      lock,
      user.id,
    );
    return { ok: false, reason: lock ? "locked" : "invalid" };
  }
  db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(user.id);

  const token = randomBytes(32).toString("base64url");
  const csrf = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)").run(
    sha256(token),
    user.id,
    csrf,
    expires,
  );
  return {
    ok: true,
    token,
    session: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, csrf },
  };
}

export function getSession(db: DB, token: string | undefined | null): Session | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.csrf_token, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND u.active = 1`,
    )
    .get(sha256(token)) as
    | { id: number; email: string; name: string; role: Role; csrf_token: string; expires_at: string }
    | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) <= Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
    return null;
  }
  return {
    user: { id: row.id, email: row.email, name: row.name, role: row.role },
    csrf: row.csrf_token,
  };
}

export function logout(db: DB, token: string | undefined | null): void {
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
}

/** Fixed-window counter. Returns true if the call is allowed. */
export function rateLimit(db: DB, key: string, max: number, windowSec: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const win = now - (now % windowSec);
  db.prepare("DELETE FROM rate_limits WHERE window_start < ?").run(win - windowSec);
  db.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
     ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
  ).run(key, win);
  const row = db
    .prepare("SELECT count FROM rate_limits WHERE key = ? AND window_start = ?")
    .get(key, win) as { count: number };
  return row.count <= max;
}

export function hashIp(ip: string): string {
  // Salted so raw IPs are never stored; salt from env, with a fixed fallback for dev.
  return sha256(`${process.env.IP_HASH_SALT ?? "dev-salt"}:${ip}`).slice(0, 32);
}

export const permissions: Record<string, Role[]> = {
  content: ["admin", "editor"],
  leads: ["admin", "sales"],
  users: ["admin"],
};
