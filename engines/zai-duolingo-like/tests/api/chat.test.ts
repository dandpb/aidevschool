// POST /api/chat — LLM backend contract with the OpenAI-compatible provider
// stubbed at global fetch (no network).

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { postJson } from "../helpers";

describe("POST /api/chat", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });
  afterEach(() => {
    process.env = OLD_ENV;
    vi.unstubAllGlobals();
  });

  it("empty message → 400 empty-message", async () => {
    process.env.LLM_API_KEY = "test-key";
    const res = await POST(postJson({ message: "  " }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("empty-message");
  });

  it("without LLM_API_KEY → 503 llm-not-configured", async () => {
    delete process.env.LLM_API_KEY;
    const res = await POST(postJson({ message: "olá" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("llm-not-configured");
  });

  it("HTTP base URL is rejected for security", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "http://api.z.ai/api";
    const res = await POST(postJson({ message: "olá" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Segurança");
  });

  it("localhost HTTP base URL is allowed", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "http://localhost:11434";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "resposta local" } }],
          }),
          { status: 200 }
        )
      )
    );
    const res = await POST(postJson({ message: "oi" }));
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe("resposta local");
  });

  it("invalid URL is rejected", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_BASE_URL = "not-a-url";
    const res = await POST(postJson({ message: "olá" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("URL base inválida.");
  });

  it("happy path: forwards system prompt + history, returns the reply", async () => {
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "modelo-teste";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "resposta do modelo" } }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await POST(
      postJson({
        message: "me ajuda com prompts",
        history: [{ role: "user", content: "oi" }],
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reply).toBe("resposta do modelo");

    // the provider call carries the persona, history, and new message
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("modelo-teste");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages.at(-1)).toEqual({
      role: "user",
      content: "me ajuda com prompts",
    });
  });

  it("provider failure → 500 model-failed", async () => {
    process.env.LLM_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("boom", { status: 502 }))
    );
    const res = await POST(postJson({ message: "olá" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("model-failed");
  });
});
