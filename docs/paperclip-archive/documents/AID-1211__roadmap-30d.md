<!-- issue: AID-1211 | key: roadmap-30d | doc_id: 5d91753b-bf40-49ce-b672-bc8aeb6a5bb7 | updated: 2026-09-10 06:09:36.514+00 -->

# AiDevSchool — Roadmap 30 dias (ciclo LEARN/BUILD/VERIFY/SHIP)

(AID-1211)

# AiDevSchool — Roadmap 30 dias (2026-09-10 → 2026-10-10)

**Ciclo: LEARN → BUILD → VERIFY → SHIP** sobre o piloto live. Decisão CEO no desbloqueio AID-1211.

## Estado atual (ponto de partida, verificado 2026-09-10)
- **Produto live (2 superfícies):** codexDojo OS (`aidevschool-codexdojo-os.netlify.app`) + LiteracyDojo 20 missões pt-BR (`aidevschool-literacydojo.netlify.app`).
- **Engenharia:** main `e839d0fc`, CI 36/36 verde incl. `product readiness (claims)` v41 (3 use cases OS re-granted, AID-1200/1206). Dívida de testes zero (AID-1153 entregue).
- **Telemetria:** coletor hardened, export Bearer fail-closed, 90d, zero PII (ADR-0009/0010). **Ninguém analisou os dados ainda.**
- **Growth:** funil O1 (meta 5-8 sessões até ~09-23) **zerado e travado desde 09-06** na interação founder `feb9d13c` (5-8 intros nomeadas + canal).
- **Board:** vazio além do funil — motivo deste desbloqueio.

## Semana 1 (09-10 → 09-16) — MEASURE + LEARN
| Issue | Dono | Entrega |
| --- | --- | --- |
| AID-1212 | QA | 1º relatório quantitativo das 2 superfícies (janela 09-06→10): sessões, funil de ativação, drop-off por missão |
| AID-1213 (blocked-by 1212) | UX | Síntese top 3-5 achados + drafts de `intent.md` para os 3 maiores problemas |
| AID-1214 | Content | Proposta do próximo arco (5-8 missões) para as 2 personas |
| AID-1215 (blocked-by 1213+1214) | SDLC SM | Triagem conforme/não conforme + recomendação aceitar/agendar/rejeitar |
| Interação founder (este issue) | Founder | Decisão do funil O1: intros / abordagem facilitada / pausar |

## Semana 2 (09-17 → 09-23) — BUILD
- CEO decide a onda Build a partir da triagem SM (gate de aceitação de intents no padrão SDLC).
- Intents aceitas → `spec.md` → `plan.md` → FPE implementa em PRs pequenos; QA countersign; merge single-writer CEO.
- Funil O1: sessões agendadas/conduzidas até 09-23 (depende da decisão founder da Semana 1).

## Semana 3 (09-24 → 09-30) — VERIFY + REVIEW
- QA re-verifica superfícies pós-mudanças; re-grant de readiness claims se o contrato mudar.
- Notas qualitativas das primeiras sessões de usuários reais entram como input do LEARN seguinte.

## Semana 4 (10-01 → 10-10) — SHIP + DECIDIR
- Onda de promoção pelo PROMOTION-RUNBOOK (olho nas cotas Netlify: ~60-90 créditos/onda).
- Veredito do piloto: continuar / escalar / pivotar. Checar gatilhos da Opção B de serving (docs/serving §3.4).

## Decisões de gestão (deste desbloqueio)
1. **Nenhum agente novo neste ciclo.** O banco atual (SM, QA, G&R, Content, System Designer, UX, FPE) cobre medição, síntese, conteúdo, processo, build e growth. Contratação de **Growth/Data Analyst** fica condicionada a: funil O1 entregar 5+ sessões OU relatórios de telemetria virarem semanais recorrentes.
2. **Producer ≠ verifier mantido** em toda a onda Build.
3. **Não-metas:** sem infra paga, sem edits no currículo canônico fora dos gates SDLC, sem domínio próprio (deferred).

## Riscos & mitigadores
- **Founder é gargalo do funil** → interação estruturada neste issue com caminho de continuação.
- **Dados insuficientes na Semana 1** (funil zerado) → relatório QA assume "n=insuficiente" honesto; UX prioriza fricção observável first-hand.
- **Token de export founder-only** → AID-1212 tem caminho `blocked` com unblock owner nomeado (founder+CEO).
