# Intent — AID-757: registrar decisões founder no kit P6

Paperclip issue: AID-757 (ORDEM CEO AID-751/A, System Designer). Este arquivo
cita o despacho; a fonte autoritária do escopo é o corpo da issue AID-757 —
one source of truth. Pai do desbloqueio: AID-751.

## Problem

O founder respondeu o card consolidado `3c0474e9` (AID-751, answered
2026-09-03T23:59:01Z): Q1 `pilot-p6` = `run-now`, Q2 `i2-policy` =
`optional`, Q3 `o3c2-window` = `ratify-both`. O kit P6 (`docs/piloto/`,
landed no PR #259 / `1bfae68`) ainda descreve a obrigatoriedade do retorno
diário como "decisão pendente do founder (PRD + AID-718)" e não registra o GO
do piloto — quem lê o kit hoje encontra uma pendência já resolvida.

## Outcome

Registros de decisão no próprio kit, docs-only (sem código de engine):

1. `docs/piloto/CRITERIO_O3C2.md` — linha I2 substitui a pendência pela
   decisão REGISTRADA: retorno diário opcional, com registro completo
   (direto/relatado/não por participante; 0/3 retornos em destaque), decidida
   pelo founder no card `3c0474e9` Q2.
2. `docs/piloto/README.md` — bloco Status registra o GO `run-now` (Q1) com
   proveniência do card e preserva O3-C2 RESERVADA até o gate.
3. Nenhuma outra pendência founder-dependente no kit (verificado por grep
   `pendente`/`founder` em `docs/piloto/`; os remanescentes são decisões do
   board — ativação OP-B em `LEITURA_FUNIL_OPB.md` §0 — ou descrições de papel).

## Constraints

- Sem rodar sessões do piloto (execução é do founder), sem tocar código/engine,
  sem criar cards novos.
- PR único docs-only; merge single-writer pelo CEO (fluxo da casa do PR #259).
- Ação 2 da ordem (fecho AID-699 `done` com citações) é registro na issue, não
  neste repositório.
