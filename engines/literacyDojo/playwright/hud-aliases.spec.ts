import { expect, test } from "@playwright/test";

/**
 * AID-5141/W5 — evidência executável dos 10 aliases HUD (design-foundations
 * v2.0 §7.1, AID-5010): os tokens `--ads-*` são DECLARADOS mapeando os
 * valores locais atuais (zero delta visual — nenhum consumidor até a W7).
 * O par mastery da literacy é o formato de referência do contrato (§7.1).
 *
 * Este spec resolve os tokens no render vivo (getComputedStyle em :root) e
 * afirma que cada um resolve EXATAMENTE para o valor local que ele mapeia —
 * se alguém trocar um mapping ou retunar um valor-base sem atualizar o
 * contrato, o spec falha (guard de drift entre alias e valor local).
 *
 * Mutation-guard: remover qualquer declaração, ou apontá-la para outro
 * valor, falha este spec. Adicionar declaração sem consumidor não muda
 * pixel algum — zero delta é a pré-condição da W5.
 */

const HUD_TOKENS = [
  "--ads-progress-text",
  "--ads-progress-muted",
  "--ads-progress-track",
  "--ads-progress-fill",
  "--ads-streak-accent",
  "--ads-mastery-text",
  "--ads-mastery-bg",
  "--ads-review-text",
  "--ads-review-bg",
  "--ads-attention-text",
  "--ads-attention-bg",
] as const;

// Valores locais ATUAIS mapeados (styles.css :root; var() resolve no
// getComputedStyle). Revisar apenas junto com a W6 (retune B9).
const EXPECTED: Record<(typeof HUD_TOKENS)[number], string> = {
  "--ads-progress-text": "#17213a", // var(--text)
  "--ads-progress-muted": "#657089", // var(--muted)
  "--ads-progress-track": "#e5e9f0", // .progress-track (literal local)
  "--ads-progress-fill": "#4f46e5", // .progress-fill (início do gradiente local)
  "--ads-streak-accent": "#ffbf47", // var(--sun) — accent quente local
  "--ads-mastery-text": "#14734d", // var(--success-text) — par stat-done (referência)
  "--ads-mastery-bg": "#e8f8ef", // var(--success-bg)
  "--ads-review-text": "#17213a", // var(--text) — reviews-due/card-review
  "--ads-review-bg": "#fffdf8", // var(--surface)
  "--ads-attention-text": "#b83a31", // var(--error-text) — par de alerta local
  "--ads-attention-bg": "#fff0ed", // var(--error-bg)
};

test("w5-1: 10 tokens HUD resolvem para os valores locais atuais (zero delta) — AID-5010/W5", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  // O OS substitui a rota de boot (navigation.replace) — esperar os estilos
  // estarem vivos antes de ler :root (self-stabilizing em qualquer engine).
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement).getPropertyValue("--ads-progress-text").trim()
        .length > 0,
  );

  const resolved = await page.evaluate(
    (tokens: string[]) => {
      const cs = getComputedStyle(document.documentElement);
      const out: Record<string, string> = {};
      for (const token of tokens) {
        out[token] = cs.getPropertyValue(token).trim().toLowerCase();
      }
      return out;
    },
    [...HUD_TOKENS],
  );

  expect(Object.keys(resolved)).toHaveLength(11);
  for (const token of HUD_TOKENS) {
    expect(resolved[token], `${token} deve mapear o valor local atual`).toBe(EXPECTED[token]);
  }
});
