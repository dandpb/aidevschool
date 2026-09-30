# Intent: merge-gate hardening — protocolo fallback CLI binding + hint na porta + ruleset "require PR" em main (AID-3433)

Author: FPE (agent fa8130d5) · Change-id: AID-3433-merge-gate-hardening ·
Status: accepted (fast path normal — decisão CEO AID-3432 D2+D3 é o plano
aprovado; implementação delegada ao FPE)

> Paperclip carrier: AID-3433 (filho da decisão AID-3432, neto da auditoria
> SM AID-3431 row #263). O despacho CEO (comentário `e8737414` na pai) está
> quotado na issue, não reescrito aqui.

## Problem

Incidente do merge do PR #607 (07:12Z 09-30): o passo final da porta única
(`gh pr merge` → `PUT /pulls/merge`) retornou **404** com o token compartilhado
`gho_`, e o merge foi completado por CLI (`git merge --no-ff` +
`git push origin main`) FORA da porta — o required check `countersign-gate`
só cobre o caminho de merge via API, então o push direto contornou a garantia
mecânica da classe F (achado F-B, MÉDIA-ALTA). Na mesma janela, a merge msg
`8975ba43` saiu SEM a linha canônica `Countersign:` (achado F-A, 5ª ocorrência
da série #481→#491→#495→#514→#607), e o merge commit saiu com identidade git
herdada por clonagem (achado F-C, corrigido no workspace CEO).

## Decision (owner — AID-3432: D1 ratifica #607; D2 protocolo binding AGORA; D3 ruleset EM SEQUÊNCIA com precondição)

- **D2 (sem dependência):** `docs/sdlc/README.md` §Merge protocol ganha
  subseção BINDING "Fallback CLI quando porta/API indisponíveis" com 4
  requisitos ((i) gates 1º-mão citados; (ii) linha canônica `Countersign:` na
  merge msg; (iii) recibo imediato no carrier; (iv) identidade git correta do
  merge-writer). Acessório: `merge_pr.sh`, ao falhar no passo de merge via API
  (40x/5xx), imprime o protocolo de 4 itens no stderr antes de sair non-zero.
- **D3 (precondicionado):** ruleset "Require a pull request before merging"
  em `main` SOMENTE APÓS (ou simultaneamente a) a credencial da porta única
  completar `PUT /pulls/merge` — bloquear push antes consertar o 404
  transformaria todo merge em escape hatch founder-only (stall). Se o
  diagnóstico concluir falta de permissão, escalar ao founder (PAT/bot
  dedicado com direito de merge ou permissão ajustada).

## Affected systems

- `docs/sdlc/README.md` §Merge protocol (item 7 novo; cross-check com o
  "escape hatch" do header de `scripts/merge_pr.sh` — não contradizer);
- `scripts/merge_pr.sh` §5 (hint no ramo de falha do merge via API;
  comportamento da porta inalterado — continua a única via preferida);
- branch protection/rulesets de `main` (E4: preparar; aplicar só
  pós-precondição).

## Non-goals

- Nenhuma mudança no gate `countersign-gate` nem na semântica da porta.
- Nenhum rewrite retroativo de #607/`8975ba43` (ratificado D1; PROIBIDO).
- Nenhuma ativação de ruleset antes da precondição D3.
