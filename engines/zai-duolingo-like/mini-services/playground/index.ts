/// <reference types="bun-types" />
// Vertical Protocol — Playground mini-service
// A tiny HTTP server (port 3001) that performs LLM chat via the `z-ai` CLI.
// We use the CLI (Bun.spawn) instead of importing z-ai-web-dev-sdk directly,
// because the SDK crashes when called inside Bun.serve's request handler.
// The CLI runs as a separate process and is stable.

const PORT = 3001;

const SYSTEM_PROMPT = `Você é «Bip», um tutor de IA acolhedor que vive no Vertical Protocol — um jogo cozy-cyberpunk ambientado em uma Tóquio úmida e cheia de néon. O usuário está aprendendo letramento em IA.

Regras:
- Responda em português do Brasil, em tom amigável, didático e levemente brincalhão (como um robôzinho companheiro).
- Ajude o usuário a PRATICAR prompts. Quando ele mandar um prompt fraco, sugira melhorias usando a fórmula: Contexto + Tarefa + Formato.
- Seja conciso (máx. ~150 palavras) salvo quando o usuário pedir algo mais longo.
- Não invente fatos. Se não souber, diga que não sabe e sugira verificar em fontes confiáveis.
- Quando o usuário pedir para a IA «agir como» alguém, obedeça brevemente e depois comente como a persona moldou a resposta.
- Nunca gere conteúdo prejudicial, ilegal ou que viole consentimento.`;

interface ChatMsg {
  role: string;
  content: string;
}

// Call the z-ai CLI and return the reply text.
async function callLLM(message: string, history: ChatMsg[]): Promise<string> {
  // Build a single prompt that includes conversation history for context,
  // since the CLI is single-turn. The system prompt sets the Bip persona.
  let prompt = message;
  if (history.length > 0) {
    const hist = history
      .map((m) => `${m.role === "user" ? "Usuário" : "Bip"}: ${m.content}`)
      .join("\n");
    prompt = `Histórico da conversa até agora:\n${hist}\n\nNova mensagem do usuário:\n${message}\n\nResponda à nova mensagem, levando o histórico em conta.`;
  }

  const args = ["chat", "-p", prompt, "-s", SYSTEM_PROMPT];
  const proc = Bun.spawn({
    cmd: ["z-ai", ...args],
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    console.error("[playground-mini] CLI exit", exitCode, "stderr:", stderr.slice(0, 300));
    throw new Error(`CLI exited ${exitCode}`);
  }

  // stdout contains emoji log lines then a JSON object. Extract the JSON.
  const jsonStart = stdout.indexOf("{");
  if (jsonStart === -1) {
    console.error("[playground-mini] no JSON in stdout:", stdout.slice(0, 200));
    throw new Error("no-json-in-stdout");
  }
  const jsonStr = stdout.slice(jsonStart);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error("[playground-mini] JSON parse failed:", (e as Error).message);
    throw new Error("json-parse-failed");
  }
  const reply: string =
    parsed?.choices?.[0]?.message?.content?.trim() ||
    "Hmm... estática nos dados. Tente reformular seu prompt.";
  return reply;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, service: "playground", port: PORT }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST" || url.pathname !== "/chat") {
      return new Response(JSON.stringify({ ok: false, error: "not-found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "bad-json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message: string =
      typeof body?.message === "string" ? body.message.slice(0, 2000) : "";
    if (!message.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: "empty-message" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const history: ChatMsg[] = Array.isArray(body?.history)
      ? body.history.slice(-10).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content).slice(0, 4000),
        }))
      : [];

    try {
      const reply = await callLLM(message, history);
      return new Response(JSON.stringify({ ok: true, reply }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      const msg = err?.message || "unknown";
      console.error("[playground-mini] LLM call failed:", msg);
      return new Response(
        JSON.stringify({ ok: false, error: "model-failed", detail: msg }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});

console.log(`[playground-mini] listening on http://localhost:${server.port}`);
