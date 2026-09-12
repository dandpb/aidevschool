# AID-421 fase (b).2 — Harness de verificação da ponte staged (pré-estacionado)

Matriz independente da QA para o GO/NO-GO pós-promoção do PR #194 (AID-415).
Pronto para executar assim que o novo pin for reportado.

## Uso (alias E permalink, no novo pin)

```bash
QA_BASE_URL="https://aidevschool-codexdojo-os.netlify.app" \
QA_PIN="<novo pin sha>" \
QA_MANIFEST_SHA="<sha256 do pilot-bundle-manifest.json declarado pela FPE>" \
node qa-bridge-matrix.mjs alias-newpin

QA_BASE_URL="https://<deploy-id>--aidevschool-codexdojo-os.netlify.app" \
QA_PIN="<novo pin sha>" QA_MANIFEST_SHA="<sha256>" \
node qa-bridge-matrix.mjs permalink-newpin
```

## Cobertura (33 checks)
- **I1–I3** smoke de identidade: manifest 200; sha256 == declarado; sourceRevision == pin.
- **B1–B3** guardas (padrão AID-412): session 200 + token; 403 cross-origin; 401 sem token.
- **M ×16** matriz oficial 4 jogos (KV WAREHOUSE, WORMHOLE, RELAY STATION, PIPELINE PLANT) × L1–L4
  → veredito PASS + `independent_pass` + sem errors. Payloads: port fiel do teste do PR #194
  (`learner/gate/tests/dojo_verification_bridge_netlify.test.mjs`) + fixtures oficiais
  `teaching_game_producer_payloads.json` (@main `7acf3cf3`).
- **R ×11** rejeição: métricas forjadas por jogo; sem observations; jogo desconhecido
  ("not supported"); trilha mutada; pass=false.

## Critério GO (AID-415)
**33/33 nos DOIS bindings** (alias + permalink) no novo pin → GO fecha AID-415.
Qualquer FAIL na matriz M = NO-GO com defeito first-class.

## Baseline na produção atual (pin 72130c6d, 2026-08-30 ~20:4xZ) — `out-dryrun-current-prod/`
**17/33**: identidade e guardas OK; matriz **1/16** (só KV WAREHOUSE L1 PASS; 15/16 FAIL com
"evidence identity is not the fixed WAREHOUSE L1 verifier contract") — defeito AID-415
reconfirmado ao vivo de forma independente; `R-unknown-game` também falha (erro de contrato
novo). Ground truth dos payloads: suíte canônica `test_teaching_game_bridge.py` 21/21 pass
no worktree QA; WAREHOUSE L1 construído pelo script PASSa na ponte estrita atual (prova de
construção válida).

## Nota
`teaching_game_producer_payloads.json` deve ser re-conferido contra o pin novo pós-merge
(o PR #194 não o altera; se alterar, atualizar a cópia local antes da corrida oficial).
