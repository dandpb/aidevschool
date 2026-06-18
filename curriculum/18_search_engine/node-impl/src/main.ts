import http from "node:http";
import { InvertedIndex } from "./search.js";

const idx = new InvertedIndex();

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && req.url === "/health") {
    res.end(JSON.stringify({ status: "ok", indexed: idx.documentCount }));
    return;
  }

  if (req.method === "POST" && (req.url === "/index" || req.url === "/search")) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);

        if (req.url === "/index") {
          if (!parsed.content) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "content is required" }));
            return;
          }
          const docId = idx.addDocument(parsed.title ?? "", parsed.content);
          res.writeHead(201);
          res.end(JSON.stringify({ doc_id: docId, status: "indexed" }));
        } else {
          const results = idx.search(parsed.query ?? "", parsed.limit ?? 10);
          res.writeHead(200);
          res.end(JSON.stringify({
            query: parsed.query,
            count: results.length,
            results,
          }));
        }
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "invalid json" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "not found" }));
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(JSON.stringify({ level: "info", msg: "search engine listening", port: PORT }));
});

process.on("SIGINT", () => {
  console.log(JSON.stringify({ level: "info", msg: "shutting down" }));
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
