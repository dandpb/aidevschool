/**
 * Sócrates — tutor opcional com IA (off por padrão).
 *
 * Progressivo: sem configuração, o Sócrates fica determinístico (o app funciona
 * 100% offline, sem conta, sem custo — invariantes do MVP). Com uma chave
 * configurada pelo próprio aprendiz (bring-your-own-key, endpoint compatível com
 * OpenAI), ele vira um tutor socrático real em tempo de execução.
 *
 * Segurança/privacidade: a chave vive só no localStorage deste navegador e é
 * enviada APENAS para o endpoint configurado. Conversas não são persistidas.
 * O caminho de evidência (verificador independente) nunca passa por aqui.
 */

export type AiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const STORAGE_KEY = "dojoToday:aiConfig";

export const DEFAULT_CONFIG: AiConfig = {
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export function loadConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AiConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isConfigured(config: AiConfig): boolean {
  return config.apiKey.trim().length > 0;
}

/** System prompt socrático, ancorado na missão e na ética do learning gate. */
function systemPrompt(mission: {
  title: string | null;
  project: string | null;
  state: string | null;
}): string {
  const ctx = [
    `- Conceito: "${mission.title ?? "—"}"`,
    mission.project ? `- Projeto: ${mission.project}` : "",
    mission.state ? `- Estado: ${mission.state}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return [
    "Você é Sócrates, um tutor socrático de engenharia de software para programadores",
    "que aprendem com assistência de IA, no DevSchool.",
    "",
    "Contexto da missão atual do aprendiz:",
    ctx,
    "",
    "Regras:",
    "- Ensine por PERGUNTAS. Nunca entregue a solução, código pronto ou a resposta direta.",
    "- Reforce o ciclo do DevSchool: o aprendiz tenta primeiro; quem avalia a evidência é um",
    "  verificador independente — não você e não a opinião do aprendiz.",
    "- Seja curto (no máx. ~4 frases), concreto e em português do Brasil.",
    "- Não invente fatos sobre a missão. Se faltar contexto, peça ao aprendiz para articular",
    "  a dúvida ou descrever o que já tentou.",
    "- Foco em robustez (testes, revisão, benchmark, limites da IA) — não em decorar sintaxe.",
  ].join("\n");
}

/**
 * Chama o assistente. Retorna { ok, text }. Lança nada: erros viram { ok: false }.
 * Usa fetch nativo (zero dependências) contra um endpoint compatível com OpenAI.
 */
export async function askSocrates(
  config: AiConfig,
  mission: { title: string | null; project: string | null; state: string | null },
  question: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const base = config.baseUrl.replace(/\/+$/, "");

  // Security: enforce HTTPS for BYOK endpoints to prevent API key exposure over plaintext
  try {
    const urlObj = new URL(base);
    if (
      urlObj.protocol !== "https:" &&
      urlObj.hostname !== "localhost" &&
      urlObj.hostname !== "127.0.0.1"
    ) {
      return { ok: false, error: "Segurança: O endpoint deve usar HTTPS (exceto localhost)." };
    }
  } catch {
    return { ok: false, error: "URL base inválida." };
  }

  const url = `${base}/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt(mission) },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} — verifique chave/endpoint.` };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "Resposta vazia do assistente." };
    return { ok: true, text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Falha de rede: ${msg}` };
  }
}

/** Resposta determinística quando não há IA configurada (ou como contraste). */
export function deterministicNudge(mission: { title: string | null }): string {
  return [
    "Sem IA configurada, eu sigo no modo determinístico: tente primeiro.",
    `Escreva, por conta própria, o que você espera que "${mission.title ?? "esta missão"}"`,
    "faça em um caso-limite — depois jogue para gerar evidência. Quem avalia é o verificador independente.",
    "Para conversar comigo de verdade, configure um assistente (botão acima).",
  ].join(" ");
}
