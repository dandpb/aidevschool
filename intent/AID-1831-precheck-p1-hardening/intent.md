# Intent: PRECHECK P1 HARDENING — fechar os atos finais do gap P1-a e registrar o fechamento P1-b (audit AID-1526)

Author: Platform & Release Engineer (Paperclip AID-1831) · Change-id: AID-1831-precheck-p1-hardening · Status: accepted

> Origina da ORDEM AID-1830/A (issue AID-1831, CEO, 2026-09-14 ~08:0xZ), itens 1–2:
> "1. P1-a — Precheck baseline versionado + self-test: (...) Entregar: baseline versionado no
> repo + self-test minimo do proprio precheck (ex.: fixture de falha conhecida) rodando em CI.
> Meta: nenhuma onda futura promove com precheck nao-verificado.
> 2. P1-b — literacy-verify untracked (gap conhecido da auditoria): trazer para o mesmo padrao
> dos demais gates (CI/versionado/evidencia) ou formalizar a decisao de remocao com registro."

## Problem

O núcleo do P1-a já foi entregue por AID-1556/PR #359 (baseline `scripts/precheck/` + self-test
+ job CI, verdes no head de `main` re-verificado 2026-09-14). Porém três resíduos mantêm o risco
do padrão cópia-por-onda vivo: (i) o runbook de promoção §4.2 ainda instrui "adaptar o script da
onda anterior"; (ii) a relíquia `precheck-ce3b4f5c.mjs` (cópia AID-462) segue commitada na raiz
do repo (via PR #295); (iii) nada impede mecanicamente que uma nova cópia `precheck-*.mjs`
aterrisse fora de `scripts/precheck/`. O P1-b já está de facto fechado (função rastreada desde
AID-941/PR #295, contract test no required check `codexdojo-os (TS)`, deploy via `functions=`
no netlify.toml), mas sem registro formal de fechamento — o gap continua se propagando como
"aberto" em despachos (a própria ORDEM AID-1831 o lista como pendente).

## Proposed outcome

- Runbook §4.2/§6.3 apontando para o fluxo canônico (`waves/<onda>.json` + `precheck.mjs
  --wave`, `--against alias` no rollback); cópia-por-onda declarada aposentada.
- Relíquia da raiz removida; guard `scripts/precheck/guard-no-stray-copies.sh` com baseline
  congelado de receipts históricos (ratchet: só encolhe) + self-test no CI (padrão
  `sdlc_guard_check.sh --self-test`).
- Registro de fechamento dos 4 achados P1 da auditoria AID-1526 (§6 aditivo no doc da
  auditoria), com evidência verificável para P1-b (probes live 2026-09-14) e o ponto de decisão
  explícito do 10º required context (linha CEO pendente; kit rev 3 é artefato stale AID-1818/1820).
- Análise §8 B1 onda 2 (meta-check agregado voxelDojo) como doc próprio — ver change-id
  irmão neste PR; zero mudança em settings.

## Affected users and systems

Pipeline de promoção (runbook consumidor), CI (job `precheck-baseline` ganha 2 steps offline),
auditoria AID-1526 (registro). Nenhuma engine de produto; nenhum check enfraquecido.

## Constraints

- PR-first: autor não merga (R1 §2 — review de domínio do Platform & CI Engineer, merge FPE).
- Zero deploy/alias/settings/produção; free tier; steps novos são offline (<1 min).
- Nenhum check removido/relaxado; receipts históricos preservados (baseline congelada).
