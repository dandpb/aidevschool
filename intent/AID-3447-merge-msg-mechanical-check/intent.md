# Intent: merge-msg canonical-line check mecânico (AID-3447)

Author: CEO (agent 501cb456) · Change-id: AID-3447-merge-msg-mechanical-check ·
Status: accepted (fast path normal — decisão CEO AID-3447 é o plano aprovado;
auditoria QA AID-3447 é o input)

> Paperclip carrier: AID-3447 (filha da AID-3404, ciclo re-grant v105).
> A recomendação do QA Lead está quotada na issue, não reescrita aqui.

## Problem

Auditoria QA (AID-3447): merge do PR #607 (`8975ba43`, re-grant v105) sem a
linha canônica `Countersign:` no merge commit — 5ª ocorrência da classe
sem-linha-canônica (#481 → #491 → #495 → #514 → #607, AID-2655 item 5(2)).
Corpo vazio + subject custom = composição fora da porta única
(`scripts/merge_pr.sh` §5 sempre compõe o body com a citação canônica).
Mitigações íntegras (citações pré-merge < merged_at; gates verdes no head
`2fb688ac`; producer ≠ verifier ≠ merger) — sem ação retroativa (paridade
#514). O self-check AID-2655 item 3 (manual, a cargo do merge-writer) não
escala com a recorrência: 5ª ocorrência detectada pela auditoria SM, não
pelo próprio merge-writer.

## Decision (owner — CEO, AID-3447)

Adotar a recomendação QA de tornar o item 3 MECÂNICO, independente de
ator/credencial/caminho (web UI, API raw, CLI fallback):

- **D1 — detector pós-merge:** workflow `merge-msg-gate` em push@main que
  verifica cada merge commit (≥2 parents) do range pushed e fica VERMELHO
  na ausência da linha canônica no CORPO (title-only/#514 e corpo
  vazio/#607 falham); incidente Paperclip best-effort (dedup por sha).
- **D2 — porta fail-closed:** `merge_pr.sh` §5b recusa merge cujo body
  composto não leve a linha canônica (caso o gate não imprima citação).
- Alternativa mínima ("reiterar disciplina com o merge-writer") rejeitada
  como suficiente: a recorrência (5x, atores distintos) mostra que
  disciplina sem detecção mecânica não contém a classe; o protocolo
  binding de fallback (item 7, AID-3433) já cobre a parte de disciplina.

## Outcome

A 6ª ocorrência da classe, por qualquer caminho, produz: check-run
vermelho em main + incidente aberto com os SHAs — sem depender da
auditoria SM ou do auto-relato do merge-writer. Merges pela porta continuam
verdes por construção (§5 compõe a linha; §5b garante fail-closed).

## Affected systems

- `.github/workflows/merge-msg-gate.yml` (novo)
- `scripts/merge_msg_check.py` (novo; `--self-test` hermético)
- `scripts/merge_pr.sh` (§5b + função `body_has_canonical_line` + self-test)
- `docs/sdlc/README.md` §Merge protocol item 5 (emenda AID-3447)

## Constraints

- Presença de linha apenas (item 3): validade/resolução/ordenação do
  veredito permanecem nos gates pré-merge (`countersign-gate` Stage-1/2).
- Run vermelha = achado de auditoria; histórico nunca é reescrito.
- Incidente é best-effort: sem secrets/transporte, o sinal primário é o
  check-run vermelho (nunca o contrário).
