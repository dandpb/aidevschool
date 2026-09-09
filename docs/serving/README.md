# Serving — superfícies externas, promoção e monitoramento (Opção A)

**Decisão vigente:** **Opção A de serving** (AID-982 doc `proposal` rev `6aef1574`, §2-A) — aprovada
pelo CEO no desbloqueio AID-986 (dictame 2026-09-07). Superfícies estáticas atuais + coletor
endurecido + monitor externo uptime free tier + gate formalizado. **US$0/mês; domínio próprio
deferido** (~US$10–15/ano, gasto permanece decisão founder). Sequenciamento das opções B/C pelos
gatilhos objetivos do doc §3.4 (B: churn multi-device pós-O1 ou decisão de self-serve; C: SLA em
contrato). Piloto pago segue o modelo facilitado P6/O1 (cobrança out-of-band).

## Superfícies em produção (2)

| Superfície | URL | Papel | Build/deploy |
| --- | --- | --- | --- |
| codexDojo OS | `https://aidevschool-codexdojo-os.netlify.app/` | Host mission-first do piloto (superfície contribuidor) | `npm run build:pilot` + `scripts/build-pilot-bundle.mjs`; functions staged do canônico `learner/gate/netlify-functions` |
| LiteracyDojo avulso | `https://aidevschool-literacydojo.netlify.app/` | Entrada pública de aprendiz (20 missões IA Prática, pt-BR) | `npm run build`; functions do dir canônico `learner/gate/netlify-functions` |

Coletor de telemetria same-origin: `POST /__dojo/bridge/v1/analytics` (envelopes OS v1 + literacy v2;
backing durável Netlify Blobs, chave idempotente `dia/eventId`, retenção 90d, zero PII —
ADR-0009/0010). Export operacional: `GET` da mesma rota com Bearer `ANALYTICS_EXPORT_TOKEN`
(segredo só no provedor; sem token → **401 fail-closed**). POST cross-site (`sec-fetch-site` ≠
`same-origin`) → **403 `origin-forbidden`**.

## Documentos deste diretório

| Documento | Papel |
| --- | --- |
| [`PROMOTION-RUNBOOK.md`](PROMOTION-RUNBOOK.md) | **Gate canônico staging→prod** (promovido do work-product AID-956; fluxo provado nas ondas AID-935/AID-960/AID-964) + rollback + incidente |
| [`UPTIME-MONITOR-SETUP.md`](UPTIME-MONITOR-SETUP.md) | Config exata do monitor externo uptime (free tier) + runbook de signup founder (único passo externo) + verificação pós-signup FPE |

## Postura de cotas free tier (Netlify) — resumo

Netlify Free = **300 créditos/mês** (preço de lista verificado 2026-09-07): deploy de produção
**15 créditos**, requisições web **2 créditos/10k**, banda **20 créditos/GB**, compute
**10 créditos/GB-hora**. O tráfego do piloto é irrelevante diante do pool (monitor 6 checks @5min
≈ 52k req/mês ≈ 10 créditos; sessões de aprendiz somam ordens de magnitude menos). **O fator
limitante é onda de promoção:** ~2 deploys/superfície (draft + alias) + retries ⇒ **~60–90
créditos por onda**. Gatilhos objetivos para revisar (donos: FPE monitora, founder decide gasto):
créditos < 100 no meio do mês, ou > 4 ondas planejadas no mês, ou banda > 1 GB/mês ⇒ conversar
sobre Personal (US$9/mês, 1.000 créditos) antes de esgotar o pool. Relatório completo da revisão
de cotas: comentário AID-989 (2026-09-07).

## Fronteira invariável

Zero contas de aprendiz, zero PII no funil, progresso local-first, analytics externo cross-origin
**rejeitado** (ADR-0010 alt. 1a). O monitor externo **nunca** porta o token de export (checks de
401 são tokenless por design). Anti-escopo vigente do doc AID-982 §5: nada de engines novas,
contas, billing ou analytics cross-origin nesta superfície.
