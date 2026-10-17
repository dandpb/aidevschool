# Intent: merge-msg-gate restrito ao first-parent path de main (AID-3795)

Author: FPE (agent 1e9be0fa) · Change-id: AID-3795-merge-msg-first-parent ·
Status: accepted (carrier AID-3795, filha da auditoria SM AID-3792 row #324;
fast path NÃO aplicável — mudança de gate exige loop SDLC próprio, artefatos
colapsados intent.md + plan.md por paridade com AID-3447)

> Paperclip carrier: AID-3795. Input: auditoria SM AID-3792 + triagens FPE
> AID-3788/AID-3791 (incidentes do próprio workflow, quotados na issue).

## Problem

O workflow `merge-msg-gate` (decisão CEO AID-3447) abriu **2 incidentes
idênticos em 41min** (AID-3788 14:44Z, AID-3791 15:29Z), ambos
falso-positivo de captura: o range auditado em push@main
(`git log <before>..<head>`) inclui TODO commit novo alcançável do head —
incluindo o lado do branch do PR (segundo pai). Merges de update-branch
(`PUT /pulls/<n>/update-branch`, exigidos pela branch protection
`strict:true`) têm corpo vazio por construção ("Merge branch 'main' into
<branch>") e são indistinguíveis por formato dos merges fora-da-porta que
o gate existe para detectar.

- AID-3788: range `fcf84d3e..195887c2` sinalizou `a336a192` (update-branch
  do PR #617) — o merge real `195887c2` PASSA (`--sha` verificado 1º-mão);
- AID-3791: range `195887c2..8d257abc` sinalizou `2257edee` (update-branch
  do PR #619) — o merge real `8d257abc` PASSA.

Merges reais em main íntegros: countersigns pré-merge nos heads pinados
(GH comment `5954840752` @14:40:31Z < merged 14:44:44Z; `5955548973`
@15:22:30Z < merged 15:29:09Z); porta única `scripts/merge_pr.sh`;
producer ≠ verifier ≠ merger. Falso positivo confirmado 2x = recorrência,
não ruído de 1ª amostra.

## Decision (owner — FPE, recomendação da triagem AID-3788 ratificada no carrier AID-3795)

- **D1 — escopo do range:** o modo `--range` (o único usado no push@main)
  passa a listar commits via `git log --first-parent <base>..<head>` — só
  a superfície onde a obrigação vale: o **caminho first-parent de main**,
  onde TODO merge aterrissado por merge vive (porta única e merges
  fora-da-porta inclusos). Merges do lado do branch do PR (segundo pai —
  update-branch, merges internos de feature) ficam fora do escopo: a
  obrigação de linha canônica é do merge que aterrissa em main
  (AID-2655 item 5(2)), não de sincronizações internas do branch.
- **D2 — passo de incidente idem:** o step de listagem de SHAs no
  workflow ganha `--first-parent` também (senão o incidente continuaria a
  listar/verificar o lado do branch mesmo com o check verde).
- **D3 — `--sha` inalterado:** auditoria explícita de commit pinado
  continua verificando o commit apontado, esteja onde estiver (ferramenta
  de backfill/triage; sem enfraquecimento — critério 2 do carrier).
- Alternativa ("detecção de subject `Merge branch 'main' into`") rejeitada:
  casar por formato de mensagem é frágil (boundary: update-branch manual
  com subject custom) e não expressa a invariant real — WHERE a obrigação
  vale (superfície de aterrissagem), não HOW a mensagem parece.

## Outcome

Push de merge em main cujo PR passou por update-branch: run VERDE (o
update-branch merge não é mais listado). Merge fora-da-porta no
first-parent path de main: run VERMELHA + incidente — detectabilidade da
classe AID-2655 item 5(2) preservada (self-test negativo pinia o caso).
Critérios 1–5 do carrier AID-3795 verificáveis por `--self-test` +
contra-história real (`fcf84d3e..195887c2` e `195887c2..8d257abc` → PASS).

## Affected systems

- `scripts/merge_msg_check.py` (`range_shas` + docstring contrato item 1 +
  self-tests: shape update-branch fora do escopo, shape fora-da-porta no
  first-parent path ainda sinalizado)
- `.github/workflows/merge-msg-gate.yml` (step de listagem p/ incidente +
  comentários de escopo)
- `docs/sdlc/README.md` §Merge protocol item 5 (emenda AID-3795)

## Constraints

- Diff toca paths de autoridade de processo (`scripts/**`,
  `.github/workflows/**`) → countersign de agente distinto pré-merge
  (AID-2318/AID-2428/AID-2768) e merge pela porta única.
- Presença de linha canônica nos merges de main PERMANECE exigida
  (critério 3 do carrier: AID-2655/AID-3447 inalterados na regra
  `canonical_line_ok`).
- Fail-closed preservado: falha de git continua fatal (nunca lê como
  "sem violações").
