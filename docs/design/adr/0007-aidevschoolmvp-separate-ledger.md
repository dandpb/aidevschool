# ADR-0007: aiDevschoolMvp mantém ledger próprio (contexto separado) — bridge adiado

**Status:** Accepted · **Data:** 2026-07-25 · **Decisor:** Daniel (via revisão de
arquitetura `/improve-codebase-architecture`)
**Contexto:** A revisão de arquitetura de 2026-07-25 identificou que
`engines/aiDevschoolMvp/` mantém seu próprio estado de aprendiz
(`state.json`, `ledger.jsonl`, `curriculum.json`, `gate_registry.json` em
`aidevschool/scripts/`), sem nenhum adaptador de escrita para
`learner/learning_state.yaml` nem evidência consumível pelo `learner/gate`.
Isso fragmenta, na prática, o invariante do ecossistema **"1 aprendiz, 1
currículo"** (CONTEXT-MAP.md): o progresso do MVP é invisível para as views
derivadas compartilhadas (dojoToday, codexDojo, `.mavis/`).

## Opções

| # | Decisão | Alternativas | Escolhida |
| --- | --- | --- | --- |
| 1 | Relação entre o ledger do MVP e a Learner Journey | (a) adaptador ledger→`units_log` agora; (b) declarar contexto separado e adiar o bridge; (c) silêncio (fragmentação acidental) | **(b) contexto separado, bridge adiado** |

## Decisão

`aiDevschoolMvp` é, **por decisão e não por acidente**, um contexto de produto
separado com estado de aprendiz próprio enquanto seu contrato de gates estiver
em consolidação. A fragmentação é aceita temporariamente porque:

1. O ADR-0006 (bridge do verificador G4) ainda está **Proposed** — escrever um
   adaptador de ledger agora seria construir sobre um contrato não ratificado.
2. O MVP está em construção ativa (content/keys/scripts ainda não commitados);
   seu schema de ledger é alvo móvel.

**Gatilho de revisão:** quando o ADR-0006 for ratificado (ou rejeitado),
reabrir esta decisão: ou se implementa o adaptador
`ledger.jsonl → units_log + verifier receipts` (opção 1a), ou se emenda este
ADR tornando a separação permanente.

## Consequências

- Nenhum código novo de integração é escrito agora (evita módulo especulativo).
- Ferramentas de revisão de arquitetura não devem re-sugerir o bridge sem
  mencionar este ADR e o gatilho de revisão.
- O invariante "1 aprendiz, 1 currículo" passa a valer para o ecossistema
  **excluindo** `engines/aiDevschoolMvp/`, até revisão.
