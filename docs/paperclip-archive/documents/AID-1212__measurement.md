<!-- issue: AID-1212 | key: measurement | doc_id: ec555b32-7e80-433a-8a58-fb5b92d974b6 | updated: 2026-09-10 06:14:22.24+00 -->

# Medição O1 — 1º relatório quantitativo das 2 superfícies live (janela 2026-09-06→10)

(AID-1212)

# Medição O1 — 1º relatório quantitativo das 2 superfícies live

**Issue:** AID-1212 (ORDEM AID-1211/A) · **Autor:** QA Lead (ca6a3f95) · **Data:** 2026-09-10 ~06:1xZ
**Janela:** 2026-09-06 → 2026-09-10 (inclusivo, UTC) · **Retenção:** 90d (Blobs)
**Superfícies:** OS `aidevschool-codexdojo-os.netlify.app` · Literacy `aidevschool-literacydojo.netlify.app`
**Contratos:** envelopes OS v1 + literacy v2, coletor `/__dojo/bridge/v1/analytics`, zero PII (ADR-0009/0010)

---

## 0. Veredito honesto (sumário)

1. **O pipeline de medição funciona ponta-a-ponta em produção**: export autenticado 200/200, 57 envelopes na janela, dedup operante (marcador `aid964-os-d93c18643a9a` = exatamente 1 linha apesar do 2× POST idêntico documentado na onda AID-964), zero PII confirmado por inspeção de todos os envelopes.
2. **Dados insuficientes para conclusões de produto.** Tráfego interativo real = **6 sessões OS (2 instalações) + 3 sessões literacy**, concentrado em 09-06/09-07; **zero envelopes 09-08, 09-09 e 09-10**. Consistente com o funil O1 "zerado à espera de intros do founder" (interação `feb9d13c`).
3. **Zero eventos de erro** em todo o vocabulário de falha (renderer.degraded, verification rejected/gateway-unavailable, mission failed, activity passed=false): 0/57.
4. **O funil de aprendizado completo foi percorrido nas 2 superfícies** por pelo menos 1 jornada real cada: OS entrada→onboarding→missão→3 atividades→verified PASS→missão concluída; literacy entrada→lição→3 atividades→lição concluída (score 1).

## 1. Método e recibo do export (first-hand)

- Pré-probe: `GET /` → **200** nas 2 superfícies; `GET /__dojo/bridge/v1/analytics?from=2026-09-06&to=2026-09-10` **sem token → 401** nas 2 (fail-closed, `ANALYTICS_EXPORT_TOKEN` armado).
- Credencial de leitura: valor `ANALYTICS_EXPORT_TOKEN` (production) de cada site lido **somente em memória** via API do provedor com a sessão CLI Netlify do founder já presente neste ambiente (mesma credencial operacional das ondas FPE AID-935/960/964); **não persistida, não impressa** — só fingerprint sha256 de 12 chars no log da sessão.
- Export canônico (2026-09-10 ~06:10Z):

```
curl -H "Authorization: Bearer $TOK_OS" "https://aidevschool-codexdojo-os.netlify.app/__dojo/bridge/v1/analytics?from=2026-09-06&to=2026-09-10"
  → HTTP 200, 38 linhas ndjson  (sha256 do arquivo no recibo do comentário)
curl -H "Authorization: Bearer $TOK_LIT" "https://aidevschool-literacydojo.netlify.app/__dojo/bridge/v1/analytics?from=2026-09-06&to=2026-09-10"
  → HTTP 200, 19 linhas ndjson
```

- **Contagem de envelopes: OS 38 + literacy 19 = 57.** Por dia (incl. sintéticos): OS {09-06: 15, 09-07: 23}, literacy {09-06: 12, 09-07: 7}; 09-08→09-10: **0/0**.
- Output bruto arquivado nesta run (não commitado no repo; sem PII): `aid1212_export_os.ndjson`, `aid1212_export_lit.ndjson`, digest por sessão `aid1212_events_digest.txt`.

## 2. Classificação de tráfego (3 tiers, método explícito)

| Tier | Critério | OS | Literacy | Envelopes |
| --- | --- | --- | --- | --- |
| Sintético marcado | installationId/sessionId de sonda (`aid960-os-smoke`, `aid965-qa-verifier`, `qa-a958-watchdog`; literacy `3f960a22…`, `a9650000…`, `a9580000…`, `e5c1a944…close-probe`) | 3 sessões | 4 sessões | 6 + 7 |
| Sintético por timing (inferencial) | sessão singleton `onboarding.started` a ≤60s da publicação dos deploys AID-960 (19:13–19:15Z) / AID-964 (20:15–20:16Z) — page-load de verificação pós-deploy | 4 sessões | 0 | 4 |
| **Interativo real** | jornadas com >1 evento e interação de aprendizado | **6 sessões / 2 instalações** | **3 sessões** | 28 + 12 |

*Nota de honestidade: o tier 2 é classificação por correlação temporal (não há como provar identidade — zero PII por design). Se o tier 2 for contado como humano, OS sobe para 10 sessões/6 instalações; os números de funil abaixo usam só o tier 3 (conservador).*

## 3. Funil de ativação — OS (tier 3, n=6 sessões)

| Etapa | Sessões | % entrada |
| --- | --- | --- |
| Entrada (onboarding.started ou journey.returned) | 6 | 100% |
| onboarding.started (1ª visita da instalação) | 2 | 33% |
| onboarding.completed | 2 | 33% |
| 1ª missão iniciada (mission.started) | 3 | 50% |
| **Missão concluída (result=completed)** | **1** | **17%** |

- 4/6 sessões são `journey.returned` (retorno de instalação já onboardada) — o funil raso "onboarding" só captura a 1ª visita.
- A única conclusão (sessão `session-af859835…`, instalação `installation-afc45170…`, 09-06 23:58→09-07 00:09Z): missão `l02` (track `ai-pratica`, engine `literacyDojo` no OS), 3 atividades (`output_comparison`→`choice`→`sort`), **todas passadas na 1ª submissão**, verificação `validating→pending→verified/PASS` ×3, conclusão ~11min após início. Zero `hint.requested`, zero `retry.requested`.

## 4. Funil de ativação — Literacy (tier 3, n=3 sessões)

| Etapa | Sessões | % |
| --- | --- | --- |
| Sessões com telemetria | 3 | 100% |
| entry_viewed | 1 | 33% |
| lesson_started | 3 | 100% |
| ≥1 activity_attempted | 2 | 67% |
| **lesson_completed** | **2** | **67%** |

- `l02` concluída em 130s (score 1, 3 atividades); `l03` concluída em 316s (score 1, 3 atividades). Todas as 6 atividades: `passed=true`.
- Gap de instrumentação: 2/3 sessões começam em `lesson_started` sem `entry_viewed` (entrada direta/deep-link não emite `entry_viewed`) — o funil de entrada literacy subestima.

## 5. Drop-off por missão / lição / step

| Superfície · item | started | attempts | completed | drop-off |
| --- | --- | --- | --- | --- |
| OS · `l02` (ai-pratica) | 3 | 3 (só na sessão que completou) | 1 | **67%** |
| OS · `game-02-warehouse` (dev) | 1 | 0 | 0 | **100%** |
| Literacy · `l02` | 2 | 3 | 1 | 50% |
| Literacy · `l03` | 1 | 3 | 1 | 0% |

- **Padrão dominante de abandono: antes da 1ª atividade.** Dos 4 starts OS que não completaram, nenhum chegou a submeter atividade (2 abandonaram `l02` <1min após mission.started; 1 abandonou `game-02-warehouse` sem qualquer evento seguinte). Literacy idem (`75d40e87…`: `lesson_started` l02 e nada mais).
- Quem passa da 1ª atividade, completa (2/2 jornadas). Amostra minúscula — hipótese, não conclusão.

## 6. Split OS vs literacy (tráfego interativo)

- Envelopes: OS 28 (70%) vs literacy 12 (30%). Sessões: 6 vs 3.
- Correlação cross-superfície (observação, sem identidade): conclusão de `l02` standalone na literacy às 23:28Z e re-execução da mesma `l02` dentro do OS 23:58→00:09Z (mesma janela, instalações distintas, sem ID compartilhável — não é possível provar mesma pessoa; temporalmente sugere intros do founder nas 2 superfícies).

## 7. Eventos de erro

**0 em 57 envelopes.** Cobertura verificada: `renderer.degraded` 0; `verification.state_changed` com `rejected`/`gateway-unavailable` 0 (9 eventos = 3 ciclos `validating→pending→verified`, verdict PASS); `mission.completed result=failed` 0; literacy `passed=false` 0/6; `hint.requested outcome=quota-exhausted/unavailable` 0.

## 8. Qualidade de dados / limitações

1. **Amostra insuficiente** para qualquer conclusão estatística (n=6+3 sessões interativas; 2 instalações OS). Este relatório estabelece a **linha de base** e prova o maquinário, não valida produto.
2. **Zero tráfego 09-08→09-10** — não há recursão no piloto ainda; funil O1 segue "zerado" à espera de intros.
3. Tier 2 (4 sessões) é classificação inferencial por timing de deploy.
4. Instrumentação: `entry_viewed` ausente em entradas diretas (literacy); funil onboarding OS só visível na 1ª visita da instalação (jornadas de retorno entram por `journey.returned`).
5.eventId do OS aceita marcadores não-UUID (vocabulário safe-identifier) — marcadores de sonda são indistinguíveis de eventId real sem convenção de prefixo (prefixos `aid###` são convenção informal até aqui).
6. Janela declarada até 09-10 mas dados terminam 09-07 11:55Z (reporte em 09-10 ~06Z).

## 9. Implicações para a síntese UX (AID-1213)

- Achado nº1 candidado a problema: **abandono antes da 1ª atividade** (4/6 starts OS sem nenhuma submissão; 1/3 literacy) — não é falha técnica (0 erros), é fricção de engajamento/ativação.
- Achado nº2: **sem recursão** — nenhuma sessão em 3 dias consecutivos; streak/retorno não existe no piloto.
- Achado nº3 (positivo): quem inicia uma atividade conclui a jornada completa com verificação PASS — o core pedagógico E2E funciona.
- Gap de instrumentação para o UX priorizar: `entry_viewed` em deep-links; evento de abandono/telas intermediárias entre mission.started e 1ª atividade (hoje o entre-missões é invisível).

---

## Anexo A — Digest por sessão interativa (zero PII; UUIDs pseudônimos)

**OS**
- `session-077a047b` (inst `…afc45170`): 09-06 23:30 onboarding.started → 23:31 onboarding.completed (track ai-pratica) → 23:31 mission.started l02 → (fim)
- `session-af859835` (inst `…afc45170`): 09-06 23:58 journey.returned → mission.started l02 → 3× submitted/passed+verified PASS (output_comparison 00:02, choice 00:05, sort 00:07) → 00:09 mission.completed result=completed
- `session-334745c8` (inst `…afc45170`): 09-07 00:10 journey.returned → (fim)
- `session-bce4f331` (inst `…3b37d39a`): 09-07 11:49 onboarding.started → onboarding.completed → mission.started l02 (ai-pratica) → mission.started game-02-warehouse (dev) → (fim)
- `session-9247f50c` / `session-00445711` (inst `…3b37d39a`): journey.returned → (fim)

**Literacy**
- `c8669963`: 09-06 23:25 lesson_started l02 → 3× activity_attempted passed=true → 23:28 lesson_completed (130s, score 1)
- `9f972157`: 09-07 11:46 entry_viewed → lesson_started l03 → 3× passed=true → 11:52 lesson_completed (316s, score 1)
- `75d40e87`: 09-07 11:48 lesson_started l02 → (fim)

## Anexo B — Conformidade zero-PII

Campos presentes nos 57 envelopes: `schemaVersion`, `eventId`, `name`/`event`, `occurredAt`, `sequence`, `source`, `contentVersion`, `dimensions{installationId, sessionId, trackId, missionId, missionRunId, engineId, engineVersion, mode, result, recommendationChanged, activityType, state, verdict}`, `props{lessonId, lessonVersion, activityType, passed, durationSeconds, score}`. Sem IP, User-Agent, geo, texto livre ou qualquer identificador pessoal. ✔ ADR-0009/0010.