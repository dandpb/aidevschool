import { expect, test } from '@playwright/test'

/**
 * AID-5141/W5 — evidência executável dos 10 aliases HUD (design-foundations
 * v2.0 §7.1, AID-5010): os tokens `--ads-*` são DECLARADOS em
 * src/styles/foundation.css mapeando os valores locais atuais (zero delta
 * visual — nenhum consumidor até a W7). FSRS/revisões ficam fora do escopo
 * do OS por design (§7.4): os pares review/attention mapeiam os estados
 * locais mais próximos (documentado no DESIGN.md §8).
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
  '--ads-progress-text',
  '--ads-progress-muted',
  '--ads-progress-track',
  '--ads-progress-fill',
  '--ads-streak-accent',
  '--ads-mastery-text',
  '--ads-mastery-bg',
  '--ads-review-text',
  '--ads-review-bg',
  '--ads-attention-text',
  '--ads-attention-bg',
] as const

// Valores locais ATUAIS mapeados (foundation.css :root; var() resolve no
// getComputedStyle — inclui o par mastery pós-W4, já 7.68:1/B9a). Revisar
// apenas junto com a W6 (retune B9).
const EXPECTED: Record<(typeof HUD_TOKENS)[number], string> = {
  '--ads-progress-text': '#17213a', // var(--school-ink)
  '--ads-progress-muted': '#3f4a64', // var(--school-muted) — W6 AAA (AID-5177)
  '--ads-progress-track': '#ded8cd', // .hub-mission-progress (literal local)
  '--ads-progress-fill': '#1f8259', // .hub-mission-progress span — W6 AAA (AID-5177, B9b)
  '--ads-streak-accent': '#ff755d', // var(--coral) — Flame do topbar
  '--ads-mastery-text': '#3f4a64', // var(--school-muted) pós-W6 (override W4 removido)
  '--ads-mastery-bg': '#e5f2eb', // var(--school-primary-soft)
  '--ads-review-text': '#1f4034', // var(--school-primary-dark) — "próximo passo"
  '--ads-review-bg': '#e5f2eb', // var(--school-primary-soft)
  '--ads-attention-text': '#3f4a64', // var(--school-muted) — W6 AAA (AID-5177)
  '--ads-attention-bg': '#fff6df', // wash quente dos nós in-progress/evidence-pending
}

test('w5-1: 10 tokens HUD resolvem para os valores locais atuais (zero delta) — AID-5010/W5', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'networkidle' })
  // O OS substitui a rota de boot (navigation.replace) — esperar os estilos
  // estarem vivos antes de ler :root (self-stabilizing em qualquer engine).
  await page.waitForFunction(
    () =>
      getComputedStyle(document.documentElement).getPropertyValue('--ads-progress-text').trim()
        .length > 0,
  )

  const resolved = await page.evaluate(
    (tokens: string[]) => {
      const cs = getComputedStyle(document.documentElement)
      const out: Record<string, string> = {}
      for (const token of tokens) {
        out[token] = cs.getPropertyValue(token).trim().toLowerCase()
      }
      return out
    },
    [...HUD_TOKENS],
  )

  expect(Object.keys(resolved)).toHaveLength(11)
  for (const token of HUD_TOKENS) {
    expect(resolved[token], `${token} deve mapear o valor local atual`).toBe(EXPECTED[token])
  }
})
