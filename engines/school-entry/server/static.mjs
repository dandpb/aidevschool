import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
export async function servePublic(path, res) {
  const files = {
    "/": "index.html",
    "/admin": "admin.html",
    "/admin/engines": "admin.html",
    "/api.js": "api.js",
    "/app.js": "app.js",
    "/admin.js": "admin.js",
    "/styles.css": "styles.css",
  };
  const file = files[path];
  if (!file)
    throw Object.assign(Error("Não encontrado."), {
      status: 404,
      code: "NOT_FOUND",
    });
  const data = await readFile(join(publicDir, file));
  res.writeHead(200, {
    "Content-Type": file.endsWith(".html")
      ? "text/html; charset=utf-8"
      : file.endsWith(".css")
        ? "text/css"
        : "text/javascript",
  });
  res.end(data);
}
