import type { DatabaseSync } from "node:sqlite";
type DB = DatabaseSync;

const depth = new WeakMap<DB, number>();

/** Run fn in a transaction (nested calls become savepoints); rolls back on throw. */
export function tx<T>(db: DB, fn: () => T): T {
  const d = depth.get(db) ?? 0;
  const sp = `sp${d}`;
  db.exec(d === 0 ? "BEGIN" : `SAVEPOINT ${sp}`);
  depth.set(db, d + 1);
  try {
    const r = fn();
    db.exec(d === 0 ? "COMMIT" : `RELEASE ${sp}`);
    return r;
  } catch (e) {
    db.exec(d === 0 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
    throw e;
  } finally {
    depth.set(db, d);
  }
}
