import { type Server, createServer } from "node:http";
import { expect, test } from "@playwright/test";

test("CSP permits actual loopback BYOK requests with CORS preflight", async ({ page }) => {
  const received: string[] = [];
  const server: Server = createServer((request, response) => {
    received.push(`${request.method} ${request.url}`);
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
    } else {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ choices: [{ message: { content: "Resposta local real" } }] }));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No loopback server port");
    for (const host of ["localhost", "127.0.0.1"]) {
      await page.goto("/");
      await page.evaluate((url) => {
        localStorage.setItem(
          "dojoToday:aiConfig",
          JSON.stringify({ baseUrl: url, apiKey: "test-key", model: "test-model" }),
        );
      }, `http://${host}:${address.port}/v1`);
      await page.locator("#soc-q").fill("Como começar?");
      await page.locator("#soc-send").click();
      await expect(page.locator("#soc-reply"), host).toContainText("Resposta local real");
    }
    expect(received.filter((entry) => entry === "OPTIONS /v1/chat/completions")).toHaveLength(2);
    expect(received.filter((entry) => entry === "POST /v1/chat/completions")).toHaveLength(2);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
