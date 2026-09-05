# AID-521 — Auditoria de retorno: todo o código e decisões de volta no repo `dandpb/aidevschool`

**Data (UTC):** 2026-09-01 ~12:3xZ · **Produtor:** Founding Product Engineer (fa8130d5) · **Pedido:** founder (issue manual AID-521) — "commitar todo o codigo e decisoes de volta pro repo aidevschool"

## Veredito

**Nenhum código de produto está retido fora do repo.** Todo trabalho vivo já está no remote (`github.com/dandpb/aidevschool`): merged em `main`, ou em branch + PR aberto no head atual. Os únicos artefatos que existiam apenas fora do repo eram **decisões do board** — corrigido neste PR (AID-516 commitida em `_work-products/AID-516/PR-QUEUE-DISPOSITION.md`; esta auditoria em `_work-products/AID-521/`).

## Evidência (executada ao vivo nesta run)

### 1. Worktree principal (checkout compartilhado)
`git status` limpo em `aid-473/f2-branch-prep` @ `3a053829` == `origin/aid-473/f2-branch-prep` == head atual do **PR #218 (aberto, mergeable)**. Merge `3a053829` tem como pais `88d7b03` (F2) e `85f7894` (= `origin/main`, o merge do **PR #214, merged hoje**) — merge com o main **correto e atual**, sem contaminação pelo main local stale.

### 2. Commits locais não-pushed (2) — ambos duplicatas superseded de conteúdo já em `main`
| Branch | Commit | Conteúdo | Por que não está perdido |
| --- | --- | --- | --- |
| `main` (local) | `19cf3a6` (2026-08-28) | feat(os): publish IA Prática missions l04-l14 | Já em `origin/main` por via canônica: `mission-bindings.yaml` do remote contém bindings `l01`–`l14` track `ai-pratica` com `contentVersion` **mais nova** (`2026-08-31.1`, ondas posteriores de publicação). `mission_catalog_rules.py` idêntico. |
| `aid-271/reflow-320` (local) | `7360281` | fix(literacyDojo): reflow 320px | Fix equivalente merged via **PR #180** (`0ae3787` em `origin/main`). |

### 3. Worktrees secundários (43 escaneados) — sem código de produto sujo
- `aid286-pr`, `aid305/wt`, `promo462`: só `node_modules`/scratch não-rastreados.
- `aid289-qa/wt`: dirs de verificação `chk177/`, `chk178/` não-rastreados.
- `aid325-qa/wt`: 4 arquivos rastreados modificados = **estado de runtime de QA** (timestamps `updated:` do whiteboard minimaxDojo e contadores `reviewSlice` do voxelDojo durante playthrough) — dado derivado, não trabalho perdido.

### 4. Stash (1)
`stash@{0}` "stale-shared-ws-noise-pre-AID467-2026-08-31" (131 arquivos): quarentena deliberada de ruído do workspace compartilhado criada durante a higiene AID-467. Mantida por design.

### 5. Decisões fora do repo → commitidas neste PR
- `_work-products/AID-516/PR-QUEUE-DISPOSITION.md` — plano completo de disposição da fila de 21 PRs de bots (verificação de segurança da exposição BYOK via `http://` em `engines/dojoToday/src/assistant.ts:91-99`, severidade real MEDIUM/HIGH, canônicos #216/#171/#198, 17 closes). Antes existia **apenas no board** (`git grep "AID-516" origin/main` → vazio).
- Este arquivo (AID-521) — registro da auditoria com evidência reproduzível.

## Higiene local (não afeta o remote)
`main` local estava 518 commits atrás de `origin/main` com 1 commit superseded (`19cf3a6`) — resincronizado para `origin/main` (`85f7894`) nesta run; commit superseded permanece recuperável via reflog. `aid-271/reflow-320` local mantido como está (branch antiga já merged via #180).

## Estado da fila no fechamento desta auditoria (GitHub API, ao vivo)
- **#214 (F1 coletor OS): MERGED** em `85f7894` — primeira etapa da fila autorizada executada.
- **#218 (F2 funil/drift)**: open, mergeable, head `3a053829`.
- **#189 (SDLC)**: open, mergeable, head `4a24a509`. **#219 (hardening)**: open, mergeable, head `d1e60ba8`.
- Merges permanecem gated pelo board (branch protection: 1 review com write access; auto-merge proibido — precedente AID-286).
