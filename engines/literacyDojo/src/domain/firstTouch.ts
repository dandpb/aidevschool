import type { AnalyticsActivityType } from "./analytics";

/**
 * First-touch da 1ª atividade (F1 `2026-09-10-activation-first-activity`,
 * spec R1 — Anexo A countersign CD AID-1414 doc `input-cd` rev `6d38e23e`):
 * a intro da lição declara o que o aprendiz vai fazer na 1ª atividade e que
 * o primeiro toque não exige produção de texto.
 *
 * Camada de APRESENTAÇÃO apenas: nenhuma mudança de estado, fluxo ou evento.
 * O mapa é exaustivo por construção — `Record<AnalyticsActivityType, string>`
 * quebra a compilação se o enum fechado de 7 crescer sem frase (guard de
 * drift). Nenhuma redação nova sem countersign CD.
 */

/** Lead-in fixo exibido antes da frase do tipo (colocação do Anexo A). */
export const FIRST_TOUCH_LEAD_IN = "Primeiro passo:";

/** Frases do spec Anexo A, VERBATIM — não editar sem countersign CD. */
export const FIRST_TOUCH_PHRASES: Readonly<Record<AnalyticsActivityType, string>> = {
  choice: "Você vai escolher as suas respostas entre opções prontas — só clicar, nada de digitar.",
  sort: "Você vai colocar as partes na ordem certa com as setas — nada de digitar.",
  missing_context:
    "Você vai ler um pedido que saiu torto e marcar o que estava faltando — só marcar, nada de digitar.",
  safety_classification:
    "Você vai classificar cada item em duas categorias — só clicar, nada de digitar.",
  prompt_builder:
    "Você vai montar um pedido preenchendo campos curtos — escrever pouco e direto, sem texto longo.",
  output_comparison:
    "Você vai comparar duas respostas da IA e marcar os motivos — nada de digitar.",
  rubric_review:
    "Você vai avaliar uma resposta critério por critério — só marcar, nada de digitar.",
};

/** Frase first-touch do tipo da 1ª atividade (`activities[0].type`). */
export function firstTouchPhrase(type: AnalyticsActivityType): string {
  return FIRST_TOUCH_PHRASES[type];
}
