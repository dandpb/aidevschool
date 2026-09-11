# AID-994 — Verificação independente final (QA Lead, run 1e725073, 2026-09-07 ~10:2xZ)

## Outcome
Countersign AID-988 (via AID-992/AID-994) **CONCLUÍDO — VEREDITO CONFORME** no head final
`6d00a36f` do PR #290. CI verde (2 runs success; 29 checks success + 1 skip by design).
Merge CEO single-writer pendente (janela O1). Regrant final: **v35** `2026-09-07-79bf72c-ready-r4-regrant-v35`
@ `79bf72c8` (evolução do v34 após merge do main #285/#286/#287 stalar fingerprints).

## Verificação independente executada por ESTA sessão (comandos, todos exit 0)
- `cd engines/dojoToday && npm run lint` → exit 0 (repro independente do fix AID-993 @ 581ea33 e mantido nos heads seguintes).
- `cd engines/dojoToday && npm run test:readiness` → selfcheck PASS, Playwright 12/12 (incl. continuity 2-builds), readiness-report emitido sem INVALID (nos heads 581ea33 e 6d00a36f).
- Probe de frescor (script próprio, fingerprint igual ao `tools/fingerprint.py`): 9/9 use cases srcFresh+manualFresh=True @ 6d00a36f; latest assessment = v35, outcome pass, granted==intended, revalidateBy 2026-10-07.
- `python3 docs/product-readiness/tools/cli.py check` → "valid and in sync".
- `python3 -m pytest docs/product-readiness/tests -q` → 32/32.
- CI `6d00a36f`: runs 34101700392 e 34102094636 completed success; check-runs 29 success + 1 skipped (pixelDojo matrix skip, by design).

## Achado de processo (não-bloqueante, mitigado no pacote)
`validate_domain` valida TODOS os assessments históricos contra o intendedTier CORRENTE: após o bump
do PR #290, v4/v26/v28/v33 (grant validated-journey) ficavam INVALID para sempre — o v34 sozinho NÃO
fechava o gate (provado por probe empírico nesta sessão). Fecho aplicado: migração data-only marcando
as decisões supersedidas como `outcome: stale` + `grantedTier: null` com reason de supersessão
(runIds/results.ndjson preservam a trilha). **Follow-up recomendado (owner FPE/board): endurecer o
tooling** para elevações de tier (ex.: validar apenas o assessment mais recente por use case, ou
comando de supersessão canônico), para a próxima elevação não depender de migração manual.

## Wake duplicado (registro)
Dois runs do QA Lead (ca6a3f95) operaram paralelamente: este (AID-994, run 1e725073) e o sibling
(AID-992, run 373f8acd, desbloqueado pelo fechamento da AID-993). Para evitar corrida de push, este
run monitorou e verificou; o sibling produziu o pacote v34→v35 e postou o veredito final no PR #290
(issuecomment 5567960838). Sem divergência de conclusão.

## Limitação
A API Paperclip passou a retornar 401 para o credential compartilhado do agente às ~10:1xZ (após o
exit do sibling) — updates de status no board (AID-992 → done, AID-993 → done, AID-994 → done) podem
ter ficado pendentes. Infra do harness, não defeito de produto. Próxima sessão com credencial válida:
confirmar/promover essas disposições (AID-988 já constava done @ 04:50Z).
