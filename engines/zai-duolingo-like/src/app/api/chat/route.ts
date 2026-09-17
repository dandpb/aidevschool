import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bip's persona — shared with the original sandbox mini-service.
const SYSTEM_PROMPT = `Você é «Bip», um tutor de IA acolhedor que vive no Vertical Protocol — um jogo cozy-cyberpunk ambientado em uma Tóquio úmida e cheia de néon. O usuário está aprendendo letramento em IA.

Regras:
- Responda em português do Brasil, em tom amigável, didático e levemente brincalhão (como um robôzinho companheiro).
- Ajude o usuário a PRATICAR prompts. Quando ele mandar um prompt fraco, sugira melhorias usando a fórmula: Contexto + Tarefa + Formato.
- Seja conciso (máx. ~150 palavras) salvo quando o usuário pedir algo mais longo.
- Não invente fatos. Se não souber, diga que não sabe e sugira verificar em fontes confiáveis.
- Quando o usuário pedir para a IA «agir como» alguém, obedeça brevemente e depois comente como a persona moldou a resposta.
- Nunca gere conteúdo prejudicial, ilegal ou que viole consentimento.`;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

// POST /api/chat — the Playground's LLM backend. Replaces the sandbox-only
// mini-service + gateway (Bun + z-ai CLI) with a direct call to any
// OpenAI-compatible chat-completions API, configured via env:
//   LLM_API_KEY  (required)
//   LLM_BASE_URL (default https://api.z.ai/api/coding/paas/v4 — GLM/z.ai;
//                 any OpenAI-compatible endpoint works: OpenAI, OpenRouter,
//                 Groq, Ollama, LM Studio...)
//   LLM_MODEL    (default glm-5.3)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const message: string =
    typeof body?.message === "string" ? body.message.slice(0, 2000) : "";
  if (!message.trim()) {
    return NextResponse.json(
      { ok: false, error: "empty-message" },
      { status: 400 }
    );
  }
  const history: ChatMsg[] = Array.isArray(body?.history)
    ? body.history.slice(-10).map((m: { role?: string; content?: unknown }) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: String(m.content ?? "").slice(0, 4000),
      }))
    : [];

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "llm-not-configured" },
      { status: 503 }
    );
  }
  const baseUrl = (
    process.env.LLM_BASE_URL ?? "https://api.z.ai/api/coding/paas/v4"
  ).replace(/\/$/, "");
  const model = process.env.LLM_MODEL ?? "glm-5.3";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ],
        // glm-5.x reasons before answering — leave headroom for
        // reasoning_content + the ~150-word reply
        max_tokens: 1500,
      }),
    });
    if (!res.ok) {
      throw new Error(`llm-http-${res.status}`);
    }
    const data = await res.json();
    const reply: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Hmm... estática nos dados. Tente reformular seu prompt.";
    return NextResponse.json({ ok: true, reply });
  } catch {
    return NextResponse.json(
      { ok: false, error: "model-failed" },
      { status: 500 }
    );
  }
}
