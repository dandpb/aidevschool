import { DatabaseSync } from "node:sqlite";
import { CATALOG } from "./catalog.mjs";
export function createStore(path = ":memory:") {
  const db = new DatabaseSync(path);
  db.exec(
    "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS engine_release (id TEXT PRIMARY KEY, enabled INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)",
  );
  const seed = db.prepare(
    "INSERT OR IGNORE INTO engine_release(id,updated_at) VALUES (?,?)",
  );
  for (const e of CATALOG) seed.run(e.id, new Date().toISOString());
  const list = () =>
    CATALOG.map((e) => {
      const r = db.prepare("SELECT * FROM engine_release WHERE id=?").get(e.id);
      return { ...e, ...r, enabled: r.enabled === 1 };
    });
  const update = (id, enabled, version) => {
    if (!CATALOG.some((e) => e.id === id)) return null;
    const result = db
      .prepare(
        "UPDATE engine_release SET enabled=?,version=version+1,updated_at=? WHERE id=? AND version=?",
      )
      .run(Number(enabled), new Date().toISOString(), id, version);
    return result.changes ? list().find((e) => e.id === id) : null;
  };
  return { list, update, setEnabled: update, close: () => db.close() };
}
