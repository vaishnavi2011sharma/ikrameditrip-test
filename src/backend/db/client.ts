import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { migrations } from "./schema";
import { seed } from "../seed";

export type DB = DatabaseSync;

let shared: DB | null = null;

/** Open (and migrate) a database. Pass ":memory:" in tests. */
export function openDb(path: string): DB {
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 22 || (maj === 22 && min < 5)) {
    throw new Error(`Node.js 22.5 or newer is required (found ${process.versions.node}) — the database uses the built-in node:sqlite.`);
  }
  if (path !== ":memory:") {
    try {
      mkdirSync(dirname(path), { recursive: true });
    } catch (e) {
      // Never hide this: the database file must live on a writable, persistent disk.
      throw new Error(
        `Cannot create the database folder "${dirname(path)}" (${(e as NodeJS.ErrnoException).code ?? "error"}). ` +
          "Set DATABASE_PATH to a writable, persistent location (e.g. a mounted volume). Serverless hosts such as Vercel have a read-only project folder.",
        { cause: e },
      );
    }
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  migrate(db);
  return db;
}

export function migrate(db: DB): number[] {
  db.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)",
  );
  const done = new Set(
    (db.prepare("SELECT id FROM _migrations").all() as { id: number }[]).map((r) => r.id),
  );
  const applied: number[] = [];
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      db.prepare("INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)").run(
        m.id,
        m.name,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
      applied.push(m.id);
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  return applied;
}

/** True on hosts whose project folder is read-only and whose disk is wiped between instances (Vercel, AWS Lambda, Netlify). */
export function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
}

/**
 * Serverless hosts have no persistent disk, so a SQLite file cannot hold leads/admin edits there. On those hosts the site runs
 * READ-ONLY from a database rebuilt in the OS temp folder from the bundled client data, and every write (leads, admin login/edits,
 * uploads) is refused with a clear 503 instead of being silently lost. Persistent hosting: see HANDOVER.md → "Deploying".
 */
export function isReadOnlyMode(): boolean {
  return isServerless();
}

/** Absolute database path: temp folder in read-only mode, otherwise DATABASE_PATH (default ./data/ikra.db) resolved from the cwd. */
export function resolveDbPath(): string {
  if (isReadOnlyMode()) return join(tmpdir(), "ikra-readonly.db");
  return resolve(process.env.DATABASE_PATH || "./data/ikra.db");
}

/** Process-wide connection used by the running site. Path from DATABASE_PATH (see resolveDbPath). */
export function getDb(): DB {
  if (!shared) {
    if (isReadOnlyMode())
      console.warn(
        "[db] Serverless host detected: running READ-ONLY from bundled client data in the temp folder. Leads, admin edits and uploads are disabled until the site is hosted with a persistent database.",
      );
    shared = openDb(resolveDbPath());
    // A brand-new database is filled once with the client-supplied hospitals/doctors/departments so the
    // site is never empty on first run. Skipped when any of those tables already has rows, or AUTO_SEED=false.
    if (process.env.AUTO_SEED !== "false" || isReadOnlyMode()) {
      const n = (t: string) => (shared!.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n;
      if (n("departments") + n("hospitals") + n("doctors") === 0) seed(shared);
    }
  }
  return shared;
}

/** Close the process-wide connection (releases the SQLite file and its -wal/-shm handles). Safe to call twice. */
export function closeDb(): void {
  if (!shared) return;
  const db = shared;
  shared = null;
  db.close();
}

export { tx } from "./tx";
