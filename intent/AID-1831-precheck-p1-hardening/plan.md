# Plan: PRECHECK P1 HARDENING — fechar os atos finais do gap P1-a e registrar o fechamento P1-b

Change-id: AID-1831-precheck-p1-hardening · From: intent/AID-1831-precheck-p1-hardening/intent.md · Status: approved

## Files that change

- `docs/serving/PROMOTION-RUNBOOK.md` — §4.2 reescrito para o fluxo canônico
  (`scripts/precheck/waves/<AID>-<pin7>.json` + receita do README; cópia-por-onda aposentada);
  §6.3 aponta `precheck.mjs --against alias` no rollback.
- `precheck-ce3b4f5c.mjs` (raiz) — **removido** (relíquia AID-462 commitada via PR #295; padrão
  condenado pela auditoria; sem referências no repo).
- `scripts/precheck/guard-no-stray-copies.sh` (novo) — falha se um `precheck-*.mjs` rastreado
  aparecer fora de `scripts/precheck/` além da baseline; `--self-test` (4 cenários) e
  `--repo/--baseline` para testabilidade.
- `scripts/precheck/stray-copies-baseline.txt` (novo) — 18 receipts históricos congelados
  (`_work-products/` + `work-products/`); ratchet: só encolhe.
- `.github/workflows/ci.yml` — job `precheck-baseline` ganha 2 steps (self-test do guard +
  scan), offline, sem dependências novas; nome do job inalterado.
- `docs/serving/PIPELINE-AUDIT_AID-1526_2026-09-12.md` — §6 aditivo: registro de fechamento
  dos 4 achados P1 com evidência; ponto de decisão do 10º required context nomeado.
- `intent/AID-1831-precheck-p1-hardening/` — este par intent/plan.

## Order of work

1. Guard + baseline + self-test local (4/4) — inclui prova de que a relíquia da raiz é
   flagada antes da remoção e clean depois.
2. Remoção da relíquia; re-run do guard (clean).
3. Runbook §4.2/§6.3; re-leitura de consistência (nenhuma outra menção ao fluxo antigo).
4. Registro §6 da auditoria (evidência P1-b coletada first-hand: git provenance, CI wiring,
   probes live fail-closed l02-v3).
5. CI: wiring dos steps; validação local do YAML (actionlint se disponível; senão parse).

## Verification

- `bash scripts/precheck/guard-no-stray-copies.sh --self-test` → 4/4.
- `bash scripts/precheck/guard-no-stray-copies.sh` → clean na árvore pós-remoção.
- `node scripts/precheck/precheck.mjs --self-test` → 27/27 (inata).
- `node scripts/precheck/precheck.mjs --wave ... --dry-run` → válido (inata).
- `node --test learner/gate/tests/literacy_verify_netlify.test.mjs` → 3/3 (evidência P1-b).
- CI do PR: 9 required checks + `Promotion precheck baseline` verdes.

## Risks

- Guard falso-positivo em arquivo legítimo: padrão restrito a `precheck*.mjs` fora de
  `scripts/precheck/`; baseline congelada cobre todo o histórico existente; remoção da baseline
  é regressiva (re-flagga) — intencional.
- Perda da relíquia: conteúdo é cópia histórica AID-462 sem uso (grep de referências vazio);
  histórico permanece no git.
