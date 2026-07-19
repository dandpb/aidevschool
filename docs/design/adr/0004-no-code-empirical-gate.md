# ADR-0004: Gate empírico no-code para a trilha Nível 0

**Status:** Accepted · **Data:** 2026-07-19 · **Decisor:** Daniel (AD-006 em `.specs/STATE.md`)
**Contexto:** A visão dual-audience (`docs/VISION.md`) pede uma trilha para não-técnicos
(`curriculum/00_ai_in_practice/`). A regra de ouro exige evidência executável — mas "executável"
pressupunha código (pytest, coverage, mutation). Sem um gate definido, a trilha 00 ou corrompe a
régua (mastery por opinião) ou nunca sai do papel.

## Opções

| Opção | Prós | Contras |
| --- | --- | --- |
| A. Reusar gate de código (exigir código mínimo) | régua única | mata o público-alvo; não-técnico não escreve pytest |
| B. Mastery por avaliação de LLM | zero atrito | viola a regra de ouro (certeza no modelo); é o GAP 1 de novo |
| **C. Gate no-code: attempt escrito + checklist falsificável verificado (escolhida)** | preserva attempt-first, produtor ≠ verificador, filesystem auditável | evidência mais fraca que execução de código; exige rotulagem explícita |

## Decisão

Unidades da trilha 00 são gateadas assim:

1. **Attempt (antes de solução):** o aprendiz registra em `learner/attempts/<unit>-attempt-<N>.md`
   o que pediu à IA, o que recebeu e onde aplicou — no formato da lição, sem código.
2. **Evidência:** um **checklist de afirmações falsificáveis** escrito pelo aprendiz — cada item
   no formato "a IA afirmou X; verifiquei X assim: [fonte/ação concreta]; resultado: confirmado/refutado".
   Itens não-falsificáveis ("gostei", "parece certo") não contam.
3. **Verificação (Prometor):** o verificador confere item a item — falsificabilidade, fonte
   citada, consistência interna — a partir do contexto isolado (vê a lição e o checklist, não o
   raciocínio do tutor). Só o Prometor registra o resultado.
4. **Registro:** a entrada no `units_log` leva `gate_kind: no_code`. Ratings de revisão espaçada
   derivam do resultado do gate, como nas demais unidades.

## Limites explícitos

- Evidência no-code é **declaradamente mais fraca** que evidência executável de código. O rótulo
  `gate_kind: no_code` existe para que nenhum consumidor confunda as duas classes.
- O gate no-code **nunca** promove unidades dos níveis 1–6 (código). A recíproca também vale:
  unidades 00 não exigem coverage/mutation.
- Dashboards e views derivadas devem propagar o rótulo quando exibirem mastery de unidades 00.

## Consequências

- Fica mais fácil: estender o roster (modo `non_developer`) e abrir a trilha 00 sem tocar na
  régua dos níveis 1–6.
- Fica mais caro: duas classes de evidência para manter; o Prometor ganha um ramo de verificação
  novo que precisa da mesma disciplina adversarial.
- Revisitar quando: a primeira unidade 00 real fechar o gate — validar se o checklist
  falsificável discrimina de fato (análogo ao discrimination sensor) ou se precisa de rubrica
  mais dura.
