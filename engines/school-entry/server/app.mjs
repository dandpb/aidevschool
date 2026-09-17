import { servePublic } from "./static.mjs";
import { createServer } from "node:http";
import { CATALOG } from "./catalog.mjs";
import { createStore } from "./store.mjs";
import { hashPassword, verifyPassword, token } from "./auth.mjs";
import { validateJudgments } from "./model.mjs";
export { CATALOG, createStore, hashPassword };
const text = {
  empty: "Nenhuma engine está disponível agora. Volte mais tarde.",
  fallback: "A recomendação está indisponível. Explore as engines disponíveis.",
  "no-match":
    "Não encontramos uma correspondência para seu pedido. Explore as opções disponíveis.",
  recommended: "Estas são as opções mais próximas do seu pedido.",
};
function fail(status, code, message) {
  return Object.assign(Error(message), { status, code });
}
export function createApp({
  store,
  targets = {},
  checker,
  ranker,
  baseUrl,
  adminPasswordHash,
  now = Date.now,
  production = false,
  logger = () => {},
} = {}) {
  if (production && (!baseUrl || !baseUrl.startsWith("https://")))
    throw Error("production requires HTTPS BASE_URL");
  const sessions = new Map(),
    limits = new Map();
  let requests = 0;
  const server = createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    const send = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(body));
    };
    const origin = baseUrl ?? `http://127.0.0.1:${server.address()?.port}`;
    const secure = origin.startsWith("https:");
    const cookie = (value, age) =>
      `entry_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure ? "; Secure" : ""}`;
    const cookieId = (req.headers.cookie ?? "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("entry_session="))
      ?.slice(14);
    for (const [id, s] of sessions) if (s.expires <= now()) sessions.delete(id);
    const session = sessions.get(cookieId);
    function limit(kind, max) {
      const key = kind + ":" + req.socket.remoteAddress;
      for (const [k, v] of limits) if (v.until <= now()) limits.delete(k);
      const item = limits.get(key) ?? { count: 0, until: now() + 60000 };
      if (limits.size >= 10000 && !limits.has(key))
        throw fail(429, "RATE_LIMIT", "Tente novamente mais tarde.");
      item.count++;
      limits.set(key, item);
      if (item.count > max)
        throw fail(429, "RATE_LIMIT", "Tente novamente mais tarde.");
    }
    async function body() {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 16384)
          throw fail(400, "INVALID_BODY", "Pedido muito grande.");
      }
      try {
        return JSON.parse(raw || "{}");
      } catch {
        throw fail(400, "INVALID_BODY", "JSON inválido.");
      }
    }
    function admin() {
      if (!session) throw fail(401, "UNAUTHORIZED", "Entre como operador.");
      if (
        !["GET", "HEAD"].includes(req.method) &&
        req.headers["x-csrf-token"] !== session.csrf
      )
        throw fail(403, "CSRF", "Sessão inválida.");
    }
    function rows() {
      try {
        return store.list();
      } catch {
        throw fail(
          503,
          "STORAGE_UNAVAILABLE",
          "Não foi possível consultar a disponibilidade.",
        );
      }
    }
    const view = (e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
    });
    async function healthy(e) {
      if (!e.enabled || !targets[e.id]) return false;
      try {
        return (await checker(targets[e.id])) === true;
      } catch {
        return false;
      }
    }
    async function eligible() {
      const snapshot = rows();
      const checks = await Promise.all(snapshot.map(healthy));
      const latest = rows();
      return latest
        .filter(
          (e) => e.enabled && checks[snapshot.findIndex((x) => x.id === e.id)],
        )
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    try {
      const path = new URL(req.url, "http://local").pathname;
      if (
        !["GET", "HEAD"].includes(req.method) &&
        req.headers.origin !== origin
      )
        throw fail(403, "ORIGIN", "Origem não permitida.");
      if (path === "/api/session") {
        if (req.method === "GET")
          return send(
            200,
            session
              ? { authenticated: true, csrfToken: session.csrf }
              : { authenticated: false },
          );
        if (req.method === "POST") {
          limit("login", 5);
          const b = await body();
          if (!verifyPassword(b.password, adminPasswordHash))
            throw fail(401, "UNAUTHORIZED", "Credenciais inválidas.");
          if (sessions.size >= 1000)
            throw fail(429, "SESSION_LIMIT", "Tente novamente mais tarde.");
          const id = token(),
            csrf = token();
          sessions.set(id, { csrf, expires: now() + 8 * 3600000 });
          res.setHeader("Set-Cookie", cookie(id, 8 * 3600));
          return send(200, { authenticated: true, csrfToken: csrf });
        }
        if (req.method === "DELETE") {
          admin();
          sessions.delete(cookieId);
          res.setHeader("Set-Cookie", cookie("", 0));
          return send(200, { authenticated: false });
        }
      }
      if (path === "/api/admin/engines" && req.method === "GET") {
        admin();
        return send(200, {
          engines: rows().map((e) => ({
            ...e,
            targetConfigured: !!targets[e.id],
          })),
        });
      }
      if (path.startsWith("/api/admin/engines/") && req.method === "PUT") {
        admin();
        const id = decodeURIComponent(path.split("/").pop()),
          b = await body();
        if (
          typeof b.enabled !== "boolean" ||
          !Number.isSafeInteger(b.version) ||
          b.version < 0
        )
          throw fail(400, "INVALID_INPUT", "Estado inválido.");
        let updated;
        try {
          updated = store.update(id, b.enabled, b.version);
        } catch {
          throw fail(503, "STORAGE_UNAVAILABLE", "Não foi possível salvar.");
        }
        if (!updated)
          throw fail(409, "CONFLICT", "Estado alterado. Atualize a lista.");
        return send(200, { ...updated, targetConfigured: !!targets[id] });
      }
      if (path.startsWith("/api/launch/") && req.method === "POST") {
        limit("launch", 20);
        if (requests >= 8)
          throw fail(429, "BUSY", "Tente novamente mais tarde.");
        requests++;
        try {
          const id = decodeURIComponent(path.split("/").pop()),
            e = rows().find((e) => e.id === id);
          if (
            !e ||
            !(await healthy(e)) ||
            !rows().find((e) => e.id === id)?.enabled
          )
            throw fail(
              409,
              "UNAVAILABLE",
              "Esta engine não está disponível agora.",
            );
          return send(200, { url: targets[id].url });
        } finally {
          requests--;
        }
      }
      if (
        (path === "/api/engines" && req.method === "GET") ||
        (path === "/api/recommend" && req.method === "POST")
      ) {
        limit(path === "/api/recommend" ? "recommend" : "catalog", 10);
        if (requests >= 8)
          throw fail(429, "BUSY", "Tente novamente mais tarde.");
        let description;
        if (req.method === "POST") {
          const b = await body();
          if (
            typeof b.description !== "string" ||
            !(description = b.description.trim()) ||
            description.length > 2000
          )
            throw fail(
              400,
              "INVALID_INPUT",
              "Descreva seu objetivo usando de 1 a 2000 caracteres.",
            );
        }
        if (requests >= 8)
          throw fail(429, "BUSY", "Tente novamente mais tarde.");
        requests++;
        try {
          const engines = await eligible();
          if (!description) return send(200, { engines: engines.map(view) });
          let mode = "empty",
            selected = engines;
          if (engines.length) {
            try {
              let timer;
              const result = await Promise.race([
                ranker(description, engines),
                new Promise((_, reject) => {
                  timer = setTimeout(() => reject(Error("timeout")), 5000);
                }),
              ]).finally(() => clearTimeout(timer));
              validateJudgments(result, engines);
              mode = result.anyFit < 0.5 ? "no-match" : "recommended";
              if (mode === "recommended")
                selected = [...engines]
                  .sort(
                    (a, b) =>
                      result.scores[b.id] - result.scores[a.id] ||
                      a.id.localeCompare(b.id),
                  )
                  .slice(0, 3);
            } catch {
              mode = "fallback";
              logger({ event: "fallback", category: "provider" });
            }
          }
          const enabled = new Set(
            rows()
              .filter((e) => e.enabled)
              .map((e) => e.id),
          );
          selected = selected.filter((e) => enabled.has(e.id));
          if (!selected.length) mode = "empty";
          return send(200, {
            mode,
            message: text[mode],
            engines: selected.map((e) => ({
              ...view(e),
              ...(mode === "recommended"
                ? {
                    reason: e.reason || e.description,
                  }
                : {}),
            })),
          });
        } finally {
          requests--;
        }
      }
      if (path.startsWith("/api/"))
        throw fail(404, "NOT_FOUND", "Não encontrado.");
      if (req.method !== "GET")
        throw fail(405, "METHOD_NOT_ALLOWED", "Método não permitido.");
      await servePublic(path, res);
    } catch (error) {
      send(error.status ?? 500, {
        error: {
          code: error.code ?? "INTERNAL",
          message: error.status
            ? error.message
            : "Não foi possível concluir o pedido.",
        },
      });
    }
  });
  return server;
}
