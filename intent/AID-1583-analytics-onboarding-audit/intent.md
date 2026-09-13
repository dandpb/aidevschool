# Intent — AID-1583 analytics onboarding: auditoria + plano O1

- **Change-id:** `AID-1583-analytics-onboarding-audit`
- **Issue:** AID-1583 (parent AID-1580; founder AID-1503 → CEO)
- **Tipo:** docs-only (sem mudança de código/engine/produção)
- **Data:** 2026-09-12

## Problema

Onboarding do Learner Analytics Engineer pede (≤72h): (1) auditoria da
instrumentação atual, (2) plano mínimo de medição do funil O1 (n=5–8 até
~09-23) sem bloquear sessões. Janela O1 correndo com última leitura de
funil em 2026-09-06 (gap de cadência).

## Mudança

Dois documentos novos em `docs/metrics/` (diretório novo):

1. `AID-1583-auditoria-instrumentacao.md` — inventário do pipeline
   (coletor 3 envelopes, emissores por superfície, agregação v4, drift
   monitor, suites CI) com evidência file:line; 8 lacunas numeradas
   (G1–G8) com severidade relativa a O1.
2. `AID-1583-plano-medicao-o1.md` — cadência de leitura (L1 09-16
   health-check, L2 09-23/24 fechamento), métricas mínimas com definição
   + fonte por seção do report v4, baseline honesto (zeros incluídos),
   regras de leitura binding, follow-ups com dono.

## Não-metas

Zero deploy, zero mudança de engine, zero tracker novo, zero acesso a
produção (export é do founder/operador via `LEITURA_FUNIL_OPB.md`).
G1–G5 e G8 são follow-ups de engine/board, não deste change.

## Aceitação

- Auditoria cita file:linha/artefato para cada afirmação (verificável).
- Plano declara fonte para cada métrica e inclui baseline zero.
- `scripts/sdlc_guard_check.sh` clean no range (2 added, 0 modified,
  0 deleted — docs + intent).
