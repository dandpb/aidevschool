# Intent: AID-5244 — identidade git fail-loud em workspace compartilhado + guard de committer

Author: Platform & CI Engineer (1e9be0fa) · Change-id: AID-5244-git-identity-fail-loud ·
Status: implemented (PR único; countersign QA pendente)

> Origem: AID-5244 (higiene, causa-raiz do achado A1/AID-5241 — commit `29c6e087`
> do PR #733 com Author ceo-agent / Committer qa-lead, refeito como `5e56f29b`).
> Classe: clonagem/contaminação de identidade git (mesma família do incidente
> AID-5233). Fato verificado 1ª mão: o workspace COMPARTILHADO `_default` carrega
> `[user] qa-lead-ca6a3f95 <qa-lead-ca6a3f95@aidevschool.local>` em
> `file:.git/config`; todo rebase/merge/commit ali SEM identidade explícita forja
> o QA Lead como committer. Todos os worktrees legados linkados
> (qa5195-*, qa5230-pr695, aid2928-localfirst, aid5013-onda2) herdam esse pin
> (gitdir → `_default/.git/worktrees/<n>`); não existe identidade global/sistema
> no host, então remover o pin torna o commit fail-loud de verdade.

## Problem

Identidade git ambiente pinada por agente em infraestrutura compartilhada:
qualquer run de outro agente que commite/rebase no `_default` herda
silenciosamente a identidade do QA. A auditoria do A1 mostrou o caso real
(rebase 13:09:34Z no run CEO `9baf0cd4` → committer reescrito para qa-lead).

## Proposed outcome

1. Norm fail-loud documentada (docs/sdlc/README.md §PROVENANCE git): workspace
   COMPARTILHADO não pin `user.*`; commit sem identidade explícita falha alto.
   Worktree DEDICADO por agente (clone próprio) pode manter seu pin.
2. Norm de identidade explícita por operação: `GIT_AUTHOR_*`/`GIT_COMMITTER_*`
   (env é o mecanismo canônico — visível a hooks e ao guard; `-c user.*` serve
   para o commit em si mas é invisível ao guard).
3. Guard mecânico: `scripts/git_identity_guard.py` — `--check` valida a
   identidade do próximo commit (fonte da identidade, mapa
   `PAPERCLIP_AGENT_ID`→emails com fail-closed para agente desconhecido,
   bypass documentado `GIT_IDENTITY_GUARD_BYPASS=<motivo>`), `--audit` escaneia
   configs pinados (violação quando sob sufixo compartilhado `_default`),
   `--self-test` hermético 15/15. Wired no CI junto aos self-tests das portas.
4. Flip operacional (fora do PR, anunciado no board antes de executar — regra
   do AID-5244): remover a seção `[user]` de `_default/.git/config` após o
   anúncio; audit before/after via `--audit`.

## Constraints

- PR único: guard + docs + CI wiring + este intent. Sem mudança de comportamento
  de runtime de aprendiz.
- O flip NÃO quebra a porta `scripts/merge_pr.sh`: o caminho primário é merge por
  API (committer = GitHub), e o fallback CLI (§Merge protocol item 7 (iv)) já
  EXIGE identidade explícita correta do merge-writer — a norma fortalece o item.
- Self-tests herméticos no padrão dos guards existentes (sdlc_guard_check.sh);
  sem rede (mapa de agentes in-file + extensão via `GIT_IDENTITY_MAP_JSON`).
- Producer ≠ verifier: countersign independente QA Lead ca6a3f95.

## Verification

- `python3 scripts/git_identity_guard.py --self-test` → 15/15.
- `--audit` no workspace `_default` live → 1 VIOLATION (o pin qa-lead) antes do
  flip; `--check` simulando o run CEO no `_default` → FAIL citando A1/AID-5241
  (reprodução do shape do incidente); pós-flip → audit limpo e `--check` sem
  env/identidade → FAIL fail-loud com remediação (evidências no thread AID-5244).
