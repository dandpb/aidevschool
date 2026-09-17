import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createApp } from "./app.mjs";
import { createStore } from "./store.mjs";
import { createChecker } from "./health.mjs";
import { createRanker } from "./model.mjs";
import { CATALOG } from "./catalog.mjs";
export function createRuntime(env = process.env, overrides = {}) {
  const production = env.NODE_ENV === "production";
  if (production && env.ALLOW_LOCAL_TARGETS === "1")
    throw Error("Local targets cannot be enabled in production");
  const port = Number(env.PORT ?? 5185),
    host = env.HOST ?? "127.0.0.1",
    baseUrl = env.BASE_URL ?? `http://${host}:${port}`;
  if (production && (!env.BASE_URL || !env.ADMIN_PASSWORD_HASH))
    throw Error("Production requires BASE_URL and ADMIN_PASSWORD_HASH");
  const dir = env.DATA_DIR ?? ".data";
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const targets =
    overrides.targets ??
    (env.ENGINE_TARGETS_FILE
      ? JSON.parse(readFileSync(env.ENGINE_TARGETS_FILE, "utf8"))
      : {});
  for (const [id, target] of Object.entries(targets)) {
    if (
      !CATALOG.some((e) => e.id === id) ||
      typeof target.url !== "string" ||
      typeof target.readySelector !== "string" ||
      !target.readySelector.trim()
    )
      throw Error("Invalid engine target configuration");
  }
  const store = overrides.store ?? createStore(join(dir, "release.sqlite"));
  const checker =
    overrides.checker ??
    createChecker({
      allowLocal: !production && env.ALLOW_LOCAL_TARGETS === "1",
    });
  const logger =
    overrides.logger ?? ((event) => console.info(JSON.stringify(event)));
  const ranker =
    overrides.ranker ?? createRanker({ key: env.TYPESAFE_API_KEY, logger });
  const server = createApp({
    store,
    checker,
    ranker,
    targets,
    baseUrl,
    production,
    adminPasswordHash: env.ADMIN_PASSWORD_HASH,
    logger,
  });
  server.runtime = { store, checker, ranker, targets, host, port };
  server.closeResources = async () => {
    await checker.close?.();
    store.close();
  };
  return server;
}
