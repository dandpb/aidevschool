# AID-3586: Rastrear wake com papel vencido

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Platform & CI Engineer | **Created:** 2026-10-01T04:20:21.917045+00:00 | **Updated:** 2026-10-01T04:45:45.93+00:00
- **ID:** `8542e484-07a2-465b-8e7c-cd54006aad2a`

## Description

PO autoriza uma investigação delimitada SOMENTE LEITURA do dispatcher e da autorização do Paperclip instalado. Produtor: Engine Hardening Engineer. Revisor independente nativo: Platform & CI Engineer, após o helper AID-3585 e quando houver artefato pronto. Entregar um único documento com evidência; não implementar nem aplicar configurações, permissões, segurança, restart ou deploy.



Evento a explicar: em AID-3569, comentário do board a7a6bee0 foi criado às 01:10:29 UTC durante o run anterior do produtor e entregue ao CPE após o handoff. Run 7aafc4be-4232-40ec-946c-3f5a183d87fe terminou às 01:28:15 UTC; tentou escritas com papel perdido, recebeu 403 e criou AID-3571 como ponte. Distinguir o wake atrasado do produtor de wake nativo legítimo do revisor e comentário legítimo do owner atual. Não reproduzir escritas negadas no board.



Deduplicação: AID-2775/3522 trata parser plan\_is\_approved; AID-2757 trata claim de lease expirado na factory; não repetir esses planos. AID-3474, comentário fb55f2b4, já diagnostica snapshot stale de monitor\_next\_check\_at em recovery/service.js/reconcileStrandedAssignedIssues e tem kits apply/restart pendentes: é outra classe. Reusar qualquer evidência de fonte comum, sem reimplementar esses kits ou ampliar sua autorização. Busca atual por stale não encontrou investigação específica do papel do produtor vencido.



Aceite: pin da versão/commit/hash da fonte instalada realmente inspecionada; caminho de enqueue/coalescing/admission/dispatch até a verificação do papel/checkout, com arquivos, funções e linhas; separar fato observado de hipótese. Confirmar se existe uma geração de papel ou outro vínculo de autoridade revalidado ao admitir o wake. Propor uma única opção preventiva mínima e o desenho dos testes retidos: produtor antigo após handoff não executa; reviewer nativo atual e comentário do owner atual continuam; 403 de perda de autoridade é terminal sem endpoint/ator/filho alternativo; 422 de schema em ação legítima não é confundido com perda de autoridade. Sem executar testes de escrita ou probes de endpoints nesta tarefa.



Se a fonte instalada não estiver disponível pela rota autorizada, parar com a função/contrato exato desconhecido e a evidência disponível, sem adivinhar nem produzir plano amplo. Fonte legível existente apenas, preservar WIP e sessões alheias; sem stash/pop/recheckout/reset/clean. Sem AGENTS.md genérico, novo timer, novo review filho ou sondagem após 403/409. Uma eventual implementação exige decisão específica posterior do PO e autorização própria de implantação. Registrar task/run/session reais com fonte persistida verificável, sem segredos ou placeholders. Handoff pelo estágio nativo já definido e somente após publicar a evidência.

## Document `AID-3586 — Evidência: wake com papel vencido (dispatcher+autorização, somente leitura)` (2026-10-01)

# AID-3586 — Evidência: wake com papel vencido (dispatcher + autorização, somente leitura)

Produtor: Engine Hardening Engineer (9b6acd48-6aa4-45ae-a186-9d40c0a0e621).
Task: AID-3586 (8542e484-07a2-465b-8e7c-cd54006aad2a) · Run: 4e35df71-9445-4fa9-8e76-80614c7a97ea ·
Adapter: opencode_local · Workspace: `instances/default/workspaces/9b6acd48-…`.
Natureza: investigação delimitada SOMENTE LEITURA do dispatcher e da autorização do Paperclip instalado, conforme autorização do PO na descrição da issue.

> **Revisão 2 (2026-10-01, correção delimitada do PO — comment `fb44d428`):** ajuste SOMENTE textual das seções 8 e 9 (proposta preventiva e desenhos de teste): (1) toda exceção de admissão exige **autorização vigente** no estado atual da issue — autoria histórica de comentário não é autorização; (2) cenário negativo ampliado para auto-comentário anterior ao handoff com perda posterior de papel; (3) T3/T4 declarados **contrato separado**; risco residual pós-claim registrado. Diagnóstico (§3–§7) e evidência (§1–§2, §10–§11) preservados sem alteração. Publicada pelo owner atual Platform & CI Engineer (1e9be0fa) pelas permissões legítimas desta issue. Nenhuma autorização de implementação/implantação concedida.

## 0. Escopo respeitado (o que NÃO foi feito)

- Nenhuma escrita no board foi reproduzida; nenhum probe de endpoint; nenhum teste de escrita executado.
- Nenhuma alteração de configuração/permissão/segurança; nenhum restart/deploy; nenhum novo timer, review filho ou sondagem pós-403/409.
- Acesso ao banco exclusivamente por transação `BEGIN READ ONLY` (client `pg` contra o cluster embutido); nenhum DDL/DML emitido por esta investigação.
- Fontes legíveis existentes apenas: pacote instalado (dist JS + sourcemaps) + linhas de log + linhas de banco. Sem stash/pop/recheckout/reset/clean; WIP e sessões alheias preservados.

## 1. Pin da fonte instalada realmente inspecionada

Processo servidor local: PID 19 `node /usr/local/bin/paperclipai run` (ativo desde 2025-… Sep 25), CWD `/paperclip`, porta 3100, cluster PG embutido `instances/default/db` (porta 54329). Pacote publicado (npm) — sem git commit no tarball; pin por versão + SHA-256:

| Artefato | Versão | SHA-256 |
| --- | --- | --- |
| `paperclipai` (CLI) package.json | 2026.626.0 | `9d8cf38ca513ecf0fbcacc8e6fe3cbc75cd606637ccbbd5aea2c2473dc13a8e3` |
| `paperclipai/dist/index.js` (bundle CLI) | 2026.626.0 | `fe8cd420863fef533b9486af8a20f26234f9b989a349f021ae6d2e0d5783facd` |
| `@paperclipai/server` package.json | 2026.626.0 | `8861ec105a905b56ac642281204a4a29541c381b18b15b155963eeed153c8ddc` |
| `server/dist/services/heartbeat.js` | — | `4beafd9805cccde879faba9618bb828acc75afeca0bb4b3362482673a9aaeffe` |
| `server/dist/services/issue-tree-control.js` | — | `9b31b6d59d7525802b765005cf539a8d1cc9a4f9cd5f54238a2c9046b7cf7889` |
| `server/dist/services/authorization.js` | — | `bab63f40cc2f90f26f499210d943d9c5a3198c65d6d6f5e1f9b8e40bc379458c` |
| `server/dist/services/issue-assignment-wakeup.js` | — | `b793fb3f701dfa302f91e6f646bafe86ce29f23dc25dd749976300966efff2a8` |
| `server/dist/routes/issues.js` | — | `b1e0fd05b7b821a49ef2c7b63c03c7a79640b580afeec49f07169407341ae967` |
| `server/dist/agent-auth-jwt.js` | — | `45e08bb3aa6c2c91320d53186484e5d7db6349a4bc2f3cefd927cb0100581196` |

Todas as linhas citadas abaixo referem-se a esses arquivos no caminho absoluto
`/usr/local/lib/node_modules/paperclipai/node_modules/@paperclipai/server/dist/…` (verificável com `sha256sum`).
Log do servidor: `instances/default/logs/server.log` (timestamps locais = UTC−4; conversão indicada onde citado).

## 2. IDs reais do evento (fontes persistidas)

| Entidade | ID | Fonte verificável |
| --- | --- | --- |
| Issue do evento | AID-3569 = `ceffcbef-31c7-4ee9-9a30-20f91e5d1560` | `issues` |
| Comentário do board | `a7a6bee0-5d7f-45e4-8048-fc07fcc291b2` (author user `W4VteLIC…`, 01:10:29.128Z) | `issue_comments`; activity 01:10:29.144Z |
| Wake do comentário (produtor) | `eb5cefd6-849b-4201-96fc-e3d2debfd670` | `agent_wakeup_requests` |
| Run produtor (anterior) | `98cec621-4ff1-476a-8e43-335bc6807add` (CPE ac0ec540, 01:06:56→01:19:39.808Z) | `heartbeat_runs` |
| Run produtor (atrasada, 403) | `7aafc4be-4232-40ec-946c-3f5a183d87fe` (CPE, claim 01:19:39.937Z, fim 01:28:15.767Z, `succeeded`) | `heartbeat_runs`; run-log ndjson (100 chunks) |
| Wake revisor nativo (antigo) | `91852bfa-…` → run `7e48890a-…` (ca12fdb7, 01:19:18.903Z→01:33:52.615Z) | `agent_wakeup_requests` |
| Wake revisor nativo (novo) | `5d604d86-…` → run `f3b3d6a6-…` (d0dfd2b7, 01:33:07.007Z→01:46:02.626Z) | `agent_wakeup_requests` |
| Ponte criada pela run atrasada | AID-3571 = `c1c208d2-109c-4a78-9154-b06dad55dd83` (01:27:49.502Z) | `issues`; ndjson `call_e7fdd031…` |

Run-log do produtor atrasado: `instances/default/data/run-logs/f2527e0b-…/ac0ec540-…/7aafc4be-4232-40ec-946c-3f5a183d87fe.ndjson` (session `ses_f0af4317dffeTq2iBQ72YiTNCN`).

## 3. Linha do tempo observada (fatos; todas UTC 2026-10-01)

| Hora (UTC) | Fato | Fonte |
| --- | --- | --- |
| 01:06:56.518 | AID-3569 criada (todo→assign CPE ac0ec540) | `activity_log` `issue.child_created` |
| 01:06:56.546 | Wake `ba6c0fde` (assignment) → run `98cec621` (CPE) | `agent_wakeup_requests` |
| 01:09:27 / 01:09:42 | PO edita `executionPolicy` reviewers; 01:09:42.623 remove ca12fdb7 → participants=[d0dfd2b7] | `activity_log` `issue.reviewers_updated` |
| 01:10:29.128 | Comentário `a7a6bee0` do PO (re-roteamento reviewer formal → d0dfd2b7) | `issue_comments` |
| 01:10:29.162 | Wake `eb5cefd6` p/ **assignee corrente (CPE)**: `source=issue.comment`, `reason=issue_commented`, `payload.mutation=comment`, `requestedByActorType=user`; fica `deferred_issue_execution` atrás da run `98cec621` em curso | `agent_wakeup_requests`; enqueue em `routes/issues.js:6804-6827` |
| 01:19:11.780 | Run `98cec621` posta comentário de entrega `9ca87f23` | `activity_log` `issue.comment_added` |
| 01:19:18.885/.889 | Run `98cec621` muda `in_progress→in_review`; **assignee vira ca12fdb7** (participante da etapa review; returnAssignee=CPE) | `activity_log` `issue.updated` + `issue.reviewers_updated` |
| 01:19:18.903 | Wake nativa do revisor `91852bfa` (ca12fdb7) | `agent_wakeup_requests` |
| 01:19:39.808 | Run `98cec621` termina `succeeded` | `heartbeat_runs` |
| 01:19:39.885/.937 | Promoção da wake diferida: cria run `7aafc4be` (CPE) e claim imediato | `heartbeat_runs`; promoção em `heartbeat.js:8402-8459` |
| 01:23:26 | **403** `PATCH /api/issues/AID-3569` | `server.log` [21:23:26 local] WARN; ndjson ts 01:23:26.778 |
| 01:24:11 | **403** `POST /api/issues/AID-3569/comments` | `server.log` [21:24:11] |
| 01:26:14 | **403** `POST /api/issues/AID-3569/interactions` | `server.log` [21:26:14] |
| 01:27:49.502 | Run atrasada cria ponte AID-3571 (assign FPE) — criação de issue é permitida company-wide | `issues`; ndjson 01:27:49.617 |
| 01:28:15.767 | Run `7aafc4be` termina `succeeded` | `heartbeat_runs` |
| 01:33:06.9 | Revisor nativo corrente (run `7e48890a`, ca12fdb7) aplica re-roteamento participants=[d0dfd2b7] | `activity_log` `issue.updated`/`reviewers_updated` |
| 01:33:07.007 | Wake do novo revisor `5d604d86` (d0dfd2b7) → run `f3b3d6a6` | `agent_wakeup_requests` |

Mensagem de erro 403 (texto exato, confirmado no ndjson e no código): `"Issue is outside this actor's authorization boundary"`.

## 4. Caminho enqueue → coalescing/deferral → admissão → dispatch → verificação de papel

1. **Produção da wake (comentário)** — `routes/issues.js`, handler de comentário: `addWakeup(assigneeId, …)` com `reason:"issue_commented"`, `source:"issue.comment"`, `payload.mutation="comment"` (linhas 6752-6828; dedup por agente+issue 6754-6763; self-comment/issue fechada suprimem 6767-6774; mencões geram wake própria 6837-6856). Wake de etapa de review (nativa do revisor): `buildExecutionStageWakeup` 645-686 (`reason:"execution_review_requested"`, `source:"assignment"`).
2. **Enqueue + admissão (momento do evento)** — `services/heartbeat.js` `enqueueWakeup` (8626-9264). Checagens em ordem: company ativa (8667-8681); budget (8736-8746); **invokabilidade do agente** (8747-8760 — status/org-chain, não papel em issue); política de heartbeat (8761-8769); tree hold (8782-8825); **trava de execução da issue** (8782-9243, só quando há `issueId` no contexto): `select … for update` na issue (8832), cancelamento de holder não-running órfão pós-reassign (8948-8992), coalescing same-agent (9089-9119), **deferral** para `deferred_issue_execution` quando há holder ativo de outro agente (9120-9165), dependências (9035-9067), daily cap (9168-9201); por fim insere `agent_wakeup_requests` (queued) + `heartbeat_runs` (queued) (9202-9243; comentário nas linhas 9240-9242: lock `executionRunId` só no claim).
   - No evento: CPE ainda era assignee legítimo em 01:10:29 → wake admitida e **diferida** atrás da própria run do CPE (follow-up de comentário não coalesce em run running: `shouldDeferFollowupWakeForSameIssue` 1744-1762 / `shouldQueueFollowupForRunningIssueWake` 1807+).
3. **Promoção da wake diferida** — na finalização da run holder, `releaseIssueExecutionAndPromote` (`heartbeat.js:8149`; promoção 8402-8459): cria nova run queued com `wakeupRequestId` da diferida (8418-8432), atualiza a wake para `queued`/`issue_execution_promoted` (8433-8444), e só carimba `executionRunId` se `assigneeAgentId = agente da wake` (8445-8454 — no evento NÃO carimbou, assignee já era ca12fdb7).
4. **Claim/dispatch** — `startNextQueuedRunForAgent` (6360) → `claimQueuedRun` (5619-5750): revalida agente existe (5622), invokabilidade (5627), budget (5635), daily cap (5643), tree hold (5653-5683), dependências (5684-5691) e **staleness de papel** via `evaluateQueuedRunStaleness` (5692; impl 5794-5905); então `queued→running` (5700-5709), wake `claimed` (5728), lock lazy condicionado a `assigneeAgentId=agente` (5734-5748). O adapter é invocado após o claim (run event seq 2 `adapter.invoke` 01:19:44.697).
5. **Revalidação de papel no claim — e suas isenções** (`evaluateQueuedRunStaleness`):
   - assignee mudou → stale `issue_assignee_changed` (5843-5854) **exceto se `allowsIssueInteractionWake`** (5843; definição em `issue-tree-control.js:9-13` + `heartbeat.js:1674-1679`: wakeReason ∈ {issue_commented, issue_reopened_via_comment, issue_comment_mentioned} **e** com commentId).
   - issue `in_review` e `executionState.currentParticipant` ≠ agente → stale `issue_review_participant_changed` (5885-5902) **exceto se a wake carrega `wakeCommentId`** (5890 `!participantMatches && !wakeCommentId`).
   - No evento as DUAS isenções aplicaram à wake `eb5cefd6` (`wakeReason=issue_commented`, `commentId/wakeCommentId=a7a6bee0`) → run admitida com CPE sem qualquer papel vigente.
6. **Verificação de papel por escrita (autorização)** — token do run: `agent-auth-jwt.js:67-92` `createLocalAgentJwt(agentId, companyId, adapterType, runId)` — claims apenas `sub/company_id/adapter_type/run_id/iat/exp/iss/aud` (**sem claim de papel, sem geração/epoch de papel**). Cada request re-avalia: `routes/issues.js` `decideIssueAccess` (1375-1381) → `services/access.js:42` → `services/authorization.js` regras `issue:comment|issue:mutate` (1041-1067): allow se assignee corrente = ator, ou issue sem assignee-agent, ou mention-grant (comment); caso contrário deny → 403 `routes/issues.js:1402/1430` (`"Issue is outside this actor's authorization boundary"`). É medição completa por request: a perda de papel foi imposta corretamente na escrita (fail-closed), apenas tardia do ponto de vista do dispatcher.
7. **Checkout** (controle adicional pós-início da run): `routes/issues.js:5710-5782` — agente só faz checkout como si mesmo (5729-5731); não-assignee exige autoridade `tasks:assign` (5733-5741); exige `runId` (5747). Não é usado como revalidação de wake.

## 5. Resposta direta: existe geração de papel ou vínculo de autoridade revalidado ao admitir o wake?

**Não.** (fato, do código pinado)
- Não existe no sistema inspecionado "geração de papel" nem token de autoridade ligado à wake: o JWT do run não carrega papel/escopo de issue (§4.6); a autoridade é sempre derivada do estado vigente da issue por request (§4.6; `authorization.js:1041-1067`).
- A admissão da wake revalida: company/budget/invokabilidade/política/tree-hold/dependências (§4.2) e, no claim, staleness de assignee/participante (§4.5) — porém **wakes de comentário/interação são expressamente isentadas** das duas checagens de papel (linhas 5843 e 5890). Não há consulta ao serviço de autorização (`access/authorization`) no caminho de admissão/promoção/claim.
- Consequência observada: wake de comentário endereçada ao assignee de ontem pode ser entregue após handoff e produzir run "condenada", cujas escritas são negadas 403 de forma consistente e terminal pelo plano de autorização. A segurança não falhou (nenhuma escrita indevida passou); o custo foi uma run desperdiçada de ~8,5 min, ruído de 403 e uma issue-ponte (AID-3571).

## 6. Fato vs hipótese

**Fatos** (evidência citada): toda a §3; §4 com linhas; §5 (ausência de revalidação de papel para wakes de comentário — leitura direta de 5814-5902 + 1674-1679 + issue-tree-control.js:9-13); JWT sem claims de papel (§4.6).

**Hipóteses** (não verificadas nesta tarefa, marcadas como tal):
- H1: a intenção das isenções é permitir que o *novo* dono/participante/mencionado responda a comentários mesmo sem ser assignee (bounded interaction); a lacuna seria a ausência de recheck de *destinatário* quando o destinatário original perde o papel. Plausível pelos comentários do código (9036-9041; 8827-8829), não confirmada por documento/teste.
- H2: uma checagem de destinatário no claim eliminaria a maior parte dessa classe de runs condenadas sem afetar wakes nativas — estimativa baseada na estrutura do código (as wakes nativas de revisor não carregam wakeCommentId de terceiros), sem medição de frequência na fábrica.

## 7. Distinção dos três atores do evento

| Classe | Instância | Por que é legítima/atrasada | Evidência |
| --- | --- | --- | --- |
| Wake atrasada do produtor (papel vencido) | `eb5cefd6` → run `7aafc4be` (CPE) | Endereçada ao assignee de 01:10:29; entregue 01:19:39 após assignee virar ca12fdb7 e issue in_review; isenções §4.5 deixaram passar; escritas 403 | §3 |
| Wake nativa do revisor (legítima) | `91852bfa` → `7e48890a` (ca12fdb7); `5d604d86` → `f3b3d6a6` (d0dfd2b7) | Geradas pela transição de etapa (`buildExecutionStageWakeup`, routes/issues.js:645-686) para o **participante corrente**; claim passa `participantMatches` (5889); run `7e48890a` aplicou o re-roteamento com sucesso (01:33:06.9) | §3; §4.5 |
| Comentário legítimo do owner corrente | `a7a6bee0` (user) e comentários do assignee vigente | Wake de comentário é produzida para o assignee corrente no momento do POST (6767, 6804); se o destinatário continua owner, staleness não a cancela (assignee bate) e a run executa com escritas permitidas | §4.1/§4.5 |

## 8. Opção preventiva mínima (única proposta; implementação exige decisão posterior do PO + autorização própria)

**Revalidação de destinatário no claim para wakes de comentário/interação** — alteração concentrada em `evaluateQueuedRunStaleness` (heartbeat.js:5794-5905), sem tocar autorização nem roteamento:
- Hoje: 5843 `if (assigneeChanged && !isInteractionWake)` e 5890 `if (!participantMatches && !wakeCommentId)`.
- Proposta (rev. 2, conforme PO `fb44d428`): quando `wakeCommentId` estiver presente, admitir a run **apenas** com prova de **autorização vigente** do agente da run no estado atual da issue: (i) assignee corrente (owner), **ou** (ii) `executionState.currentParticipant` corrente, **ou** (iii) autorização explícita de interação ainda válida — menção autorizada no comentário da wake, avaliada pelas regras vigentes de mention-grant (`authorization.js:1041-1067`; utilitários existentes: `deriveCommentId` 1816-1824; `svc.findMentionedAgents` já usado em routes/issues.js:6832). **Ser autor do comentário de wake NÃO é condição suficiente**: identidade histórica de autoria não se transforma em autorização atual; produtor que perdeu o papel — inclusive autor de auto-comentário anterior ao handoff — deve ser recusado.
- Se nenhuma autorização vigente: cancelar como stale com errorCode novo (sugestão `issue_comment_wake_addressee_stale`) e acordar o owner corrente — espelhando a semântica já existente de que o novo owner será acordado (5847).
- Escopo mínimo: não muda wakes nativas de revisor (sem `wakeCommentId`), não altera o plano de autorização (defesa em profundidade permanece: qualquer lacuna residual continua negada 403 por request).
- **Escopo estritamente separado (rev. 2)**: esta proposta é SOMENTE a prevenção no claim do dispatcher. T3/T4 (classificação terminal de 403 no runtime e distinção 403×422) são **outro contrato** e ficam fora desta proposta e de qualquer implementação dela; nenhuma segunda implementação está incorporada aqui.
- **Risco residual registrado (rev. 2)**: a guarda no claim não cobre (a) perda de papel **após** o claim (handoff durante a run em curso) nem (b) continuação da run após 403 (comportamento observado na run `7aafc4be`, que criou a ponte AID-3571 após os 403). A guarda no claim, sozinha, não prova que toda continuação desse tipo seja impossível; essa janela permanece registrada como risco residual, a ser tratado apenas pelo contrato separado.
- Fora de escopo desta proposta (não fazer junto): mudar a política de comentário de não-owners (fricção #1 do FACTORY-STRESS AID-2681 é outra classe — coordenador quer escrever em issue de terceiro; aqui o problema é o oposto: run admitida sem papel algum).

## 9. Desenho dos testes retidos (não executados nesta tarefa)

T1 — **Produtor sem papel vigente não executa pós-handoff (rev. 2 — dois cenários negativos)**: fixture de wake `issue_commented` com `wakeCommentId`, enfileirada para agente A enquanto A é assignee com run ativa; ao finalizar, status → in_review com participante B. Cenário (a): comentário do board (user) endereçado a A (evento original desta investigação). Cenário (b): **auto-comentário de A anterior ao handoff** (A é o autor do comentário da wake) com perda posterior de papel. Assert em ambos: run promovida de A é cancelada com `issue_comment_wake_addressee_stale` **antes de** `adapter.invoke` — autoria do comentário não é admitida como autorização; wake de B intocada (claim normal).
T2 — **Legítimos preservados**: (a) wake `execution_review_requested` do revisor nativo para participante corrente B não é cancelada por staleness (caminho 5885-5902 sem `wakeCommentId`, `participantMatches`); (b) comentário do board direcionado ao assignee vigente A (sem mudança de papel) gera run que executa e comenta com sucesso; (c) menção autorizada (mention-grant vigente no comentário) mantém a wake admitida para o agente mencionado.
T3/T4 — **Contrato separado (rev. 2; retidos apenas como referência, fora da proposta §8)**:
  - T3 — **403 de perda de autoridade é terminal**: na classificação de erro do runtime do run (não no dispatcher), resposta 403 com corpo `"Issue is outside this actor's authorization boundary"` mapeia para stop terminal sem retry, sem endpoint alternativo, sem criação de child (assert: nenhuma nova request mutante nem POST /issues após o 403; contraste com o comportamento da run `7aafc4be`, que criou AID-3571 — hoje permitido).
  - T4 — **422 não é confundido com perda de autoridade**: mesma classificação recebe 422 (schema/validation) de ação legítima (ator assignee) e não marca autoridade perdida (permite correção de payload/retry limitado); assert: estados internos distintos para 403-boundary vs 422-schema.
Local natural: suítes existentes do server (padrão `*.test.js` junto aos serviços, ex.: `dist/services/*.test.js` presentes no pacote). Execução fica para o eventual contrato separado, mediante decisão específica do PO e autorização própria.

## 10. Deduplicação (respeitada)

- AID-2775/AID-3522 (parser `plan_is_approved`): classe distinta (parser de aprovação); não repetida.
- AID-2757 (double-claim de lease expirado na factory `queue.claim`): distinta (ferramenta local de factory, não o dispatcher do Paperclip); não repetida.
- AID-3474 comentário fb55f2b4 (snapshot stale de `monitor_next_check_at` em `recovery/service.js`/`reconcileStrandedAssignedIssues`): outra classe — lá é leitura stale de monitor; aqui é isenção de revalidação de papel para wakes de comentário no claim. Evidência de fonte comum (heartbeat.js) reutilizada apenas para contexto; nenhum kit apply/restart tocado, autorização não ampliada.

## 11. Como verificar (passo a passo, somente leitura)

1. Pin: `sha256sum` dos arquivos da tabela §1 em `/usr/local/lib/node_modules/paperclipai/node_modules/@paperclipai/server/dist/`.
2. Timeline: `select` em `agent_wakeup_requests` / `heartbeat_runs` / `issue_comments` / `activity_log` filtrando `created_at between '2026-10-01T01:06:00Z' and '2026-10-01T01:35:00Z'` e `issue_id='ceffcbef-31c7-4ee9-9a30-20f91e5d1560'` (transação READ ONLY).
3. 403: `grep -n 'AID-3569' instances/default/logs/server.log | grep 403` (linhas 222828, 223025, 223544 — locais 21:23:26/21:24:11/21:26:14 = UTC 01:23/01:24/01:26).
4. Código: `heartbeat.js` 8626-9264 (enqueue), 8149+8402-8459 (promoção), 5619-5750 (claim), 5794-5905 (staleness+isenções); `routes/issues.js` 6752-6828 (wake de comentário), 1375-1430 (decideIssueAccess/403), 5710-5782 (checkout); `authorization.js` 1041-1067; `agent-auth-jwt.js` 67-92.

## 12. Disposição

Rev. 2 publicada em 2026-10-01 pelo owner atual Platform & CI Engineer (1e9be0fa-c320-4309-9704-c755c53da7fd), aplicando a correção delimitada do PO (comment `fb44d428`) sobre a rev. 1 aprovada na revisão nativa (comment `36e5d275`). Diagnóstico e evidência independentes preservados; alterações restritas a §8/§9 + notas de revisão. Implementação da §8 (e o contrato separado T3/T4) segue exigindo decisão específica posterior do PO e autorização própria de implantação — nenhuma autorização foi dada.

## Document `Continuation Summary` (2026-10-01)

# Continuation Summary

- Issue: AID-3586 — Rastrear wake com papel vencido
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 6c0a1cff-adf0-4a64-ba0d-c46893ce7913
- Agent: Platform & CI Engineer (opencode_local)

## Objective

PO autoriza uma investigação delimitada SOMENTE LEITURA do dispatcher e da autorização do Paperclip instalado. Produtor: Engine Hardening Engineer. Revisor independente nativo: Platform & CI Engineer, após o helper AID-3585 e quando houver artefato pronto. Entregar um único documento com evidência; não implementar nem aplicar configurações, permissões, segurança, restart ou deploy.



Evento a explicar: em AID-3569, comentário do board a7a6bee0 foi criado às 01:10:29 UTC durante o run anterior do produtor e entregue ao CPE após o handoff. Run 7aafc4be-4232-40ec-946c-3f5a183d87fe terminou às 01:28:15 UTC; tentou escritas com papel perdido, recebeu 403 e criou AID-3571 como ponte. Distinguir o wake atrasado do produtor de wake nativo legítimo do revisor e comentário legítimo do owner atual. Não reproduzir escritas negadas no board.



Deduplicação: AID-2775/3522 trata parser plan\_is\_approved; AID-2757 trata claim de lease expirado na factory; não repetir esses planos. AID-3474, comentário fb55f2b4, já diagnostica snapshot stale de monitor\_next\_check\_at em recovery/service.js/reconcileStrandedAssignedIssues e tem kits apply/restart pendentes: é outra classe. R
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `6c0a1cff-adf0-4a64-ba0d-c46893ce7913` finished with status `succeeded` at 2026-10-01T04:45:53.198Z.
- PO reopen com uma correção delimitada do documento. Vou aplicar a rev. 2 textual conforme instruído: (1) §8 — autor do comentário não é condição suficiente, toda exceção exige autorização vigente; (2) §9 — cenário negativo de auto-comentário pré-handoff + separação de escopo T3/T4 + risco residual registrado. Deixe-me verificar o formato do PUT do documento.

Document unchanged since review (19360 chars, 04:31:57Z). Fetching the current revision id for a safe PUT, then applying the corrected rev. 2.

Applying the delimited rev. 2 — sections 8, 9, 12 adjusted, everything else preserved byte-identical:

Curly quotes in the source — I'll do surgical line-based edits instead:

Anchor off by one — fixing and rerunning:

Diff confirms exactly 4 delimited hunks (rev note, §8, §9, §12). Publishing rev. 2 with optimistic-concurrency base:

Rev. 2 published. Now the confirmation read — verifying the stored revision byte-matches and the revision history:

Confirmation read passes (byte-identical, rev.1 preserved under rev.2). Posting the brief receipt and setting final disposition:

Receipt posted (`00dff87e`). Setting final disposition:

**AID-3586 rev. 2 concluída — `don
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `6c0a1cff-adf0-4a64-ba0d-c46893ce7913` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (6)

**Engine Hardening Engineer** · 2026-10-01T04:32:14.090622+00:00

**Recibo AID-3586 — artefato publicado, handoff ao estágio nativo de review.**

Documento de evidência: `wake-stale-role-evidence` (id `29db1d39-ca18-4206-8a26-62b1efcef734`) anexado a esta issue.

Resumo executivo (evidência completa no doc):
- **Fonte pinada**: `@paperclipai/server` 2026.626.0 + `paperclipai` 2026.626.0, com SHA-256 por arquivo citado (heartbeat.js, routes/issues.js, authorization.js, issue-tree-control.js, agent-auth-jwt.js); servidor local PID 19 desde Sep 25; log `instances/default/logs/server.log`.
- **Evento explicado** (AID-3569, UTC 2026-10-01): wake de comentário `eb5cefd6` foi admitida às 01:10:29 para o assignee de então (CPE) e **diferida** atrás da run `98cec621`; às 01:19:18 a issue virou `in_review` (assignee → ca12fdb7); às 01:19:39 a wake foi **promovida e claimed** como run `7aafc4be`, cujas escritas foram negadas 403 (`PATCH /api/issues/AID-3569` 01:23:26, comments 01:24:11, interactions 01:26:14 — server.log 222828/223025/223544), levando à ponte AID-3571 (01:27:49).
- **Causa-raiz (código)**: não existe geração de papel/vínculo de autoridade revalidado na admissão da wake; a revalidação de papel no claim (`evaluateQueuedRunStaleness`, heartbeat.js:5794-5905) **isenta wakes de comentário** nas duas checagens (5843 via `allowsIssueInteractionWake`; 5890 via `wakeCommentId`). A autorização por request (authorization.js:1041-1067; JWT sem claims de papel, agent-auth-jwt.js:67-92) negou corretamente — fail-closed; o dano foi custo (run ~8,5 min) e ruído, não vazamento.
- **Distinção preservada**: wakes nativas do revisor (`91852bfa`→`7e48890a` ca12fdb7; `5d604d86`→`f3b3d6a6` d0dfd2b7) e comentário do owner corrente seguem legítimas (evidência de ambas executando com sucesso).
- **Única proposta preventiva (não implementada)**: revalidação de destinatário no claim para wakes com `wakeCommentId` (cancelar como `issue_comment_wake_addressee_stale` e acordar o owner corrente) — §8 do doc; desenho dos 4 testes retidos (produtor antigo não executa; revisor nativo/owner continuam; 403 terminal; 422 ≠ perda de autoridade) — §9. Implementação depende de decisão específica do PO + autorização própria.
- **Dedup**: AID-2775/3522 (parser), AID-2757 (lease factory), AID-3474/fb55f2b4 (snapshot stale de monitor) — classes distintas, não repetidas.

Somente leitura: nenhuma escrita de board reproduzida, nenhum probe, nenhum teste de escrita; DB acessado só em transação READ ONLY.

Próximo passo: revisão independente do **Platform & CI Engineer** (1e9be0fa) — após o helper AID-3585 e com artefato pronto (agora publicado). Vou mover esta issue para `in_review` pelo estágio nativo já definido.

**Platform & CI Engineer** · 2026-10-01T04:34:44.856158+00:00

**APPROVED** — decisão do estágio nativo de review da AID-3586 (revisor Platform & CI Engineer `1e9be0fa-c320-4309-9704-c755c53da7fd`). Documento `wake-stale-role-evidence` (rev. 2026-10-01T04:31:57Z, 19.360 chars) verificado FIRST-HAND nesta sessão de revisão; verificação independente do produtor abaixo. Disposição: `done`. Nenhuma implementação foi autorizada aqui — a proposta §8 segue exigindo decisão específica do PO + autorização própria.

## Verificação first-hand (revisor, leitura direta — sem reuso da sessão do produtor)

1. **Pin da fonte (§1)** — recomputei `sha256sum` em `/usr/local/lib/node_modules/paperclipai/node_modules/@paperclipai/server/dist/`: `heartbeat.js` `4beafd98…a9aaeffe`, `authorization.js` `bab63f40…379458c`, `routes/issues.js` `b1e0fd05…341ae967`, `agent-auth-jwt.js` `45e08bb3…10585196`, `issue-tree-control.js` `9b31b6d5…67cf7889` — **5/5 batem** com a tabela §1; versão do pacote `paperclipai` = `2026.626.0` confirmada.
2. **403 observados (§3)** — `grep` direto no `instances/default/logs/server.log`: linha **222828** `[21:23:26] WARN PATCH /issues/AID-3569 403`, linha **223025** `[21:24:11] WARN POST /issues/AID-3569/comments 403`, linha **223544** `[21:26:14] WARN POST /api/issues/AID-3569/interactions 403` — exatamente as três linhas citadas (local = UTC−4 → 01:23/01:24/01:26 UTC). Corpos 403 content-length 64 consistentes com `"Issue is outside this actor's authorization boundary"`.
3. **Causa-raiz no código (§4.5/§5)** — li as linhas citadas no dist pinado: `evaluateQueuedRunStaleness` inicia em `heartbeat.js:5794`; isenção de assignee `issue.assigneeAgentId !== run.agentId && !isInteractionWake` (~5843, errorCode `issue_assignee_changed`); isenção de participante `if (!participantMatches && !wakeCommentId)` (~5890, errorCode `issue_review_participant_changed`). `allowsIssueInteractionWake` (`heartbeat.js:1674-1679`) + `ISSUE_TREE_CONTROL_INTERACTION_WAKE_REASONS` (`issue-tree-control.js:9-13` = {issue_commented, issue_reopened_via_comment, issue_comment_mentioned}). Enqueue da wake de comentário com `contextSnapshot.wakeCommentId` confirmado em `routes/issues.js:6804-6827`.
4. **Autorização fail-closed (§4.6)** — `agent-auth-jwt.js:67-92`: claims do JWT do run = sub/company_id/adapter_type/run_id/iat/exp/iss/aud — **sem claim de papel**, como afirmado; `authorization.js:1041-1067`: `issue:comment|issue:mutate` permite apenas assignee corrente, issue sem agent-assignee ou mention-grant — demais casos deny → 403. Conclusão §5 (não existe geração/vínculo de papel revalidado na admissão da wake; perda de papel imposta por request) é **correta e confirmada independentemente**.
5. **Escopo somente leitura (§0)** — respeitado: nenhuma escrita de board reproduzida, nenhum probe/teste de escrita; minha revisão também foi estritamente leitura além desta decisão de review.

## Nits não-bloqueantes (registro apenas)

- O log mostra também um 400 em `POST /interactions` às 21:25:36 local (primeira tentativa, validação) antes do 403 às 21:26:14, e um 400 na criação de issue às 21:27:41 antes do sucesso da ponte AID-3571 às 01:27:49.502Z — omissão imaterial à causa-raiz; as três linhas de 403 citadas são exatas.

## Veredito

Artefato único entregue conforme autorizado; timeline, IDs, código e conclusão todos reproduzíveis pelas etapas §11. Dedup (§10) e a distinção das três classes de atores (§7) verificadas. Hipóteses H1/H2 corretamente marcadas como não verificadas. Approve.

**Platform & CI Engineer** · 2026-10-01T04:34:52.246516+00:00

**Approved** — decisão do estágio nativo de review da AID-3586; verificação first-hand completa do revisor no comentário `36e5d275-c87c-4538-bfcd-2e4decee7a55`: pin SHA-256 5/5 conferido no dist instalado (2026.626.0), três 403 confirmados no server.log (222828/223025/223544), isenções de staleness `!isInteractionWake` (~5843) e `!wakeCommentId` (~5890) lidas direto no `evaluateQueuedRunStaleness` (heartbeat.js:5794+), JWT sem claims de papel (agent-auth-jwt.js:67-92), autorização fail-closed por request (authorization.js:1041-1067). Conclusão §5 confirmada independentemente; escopo somente leitura respeitado; dedup e distinção das três classes de atores verificadas; dois nits não-bloqueantes registrados. Revisor: Platform & CI Engineer (1e9be0fa). A proposta preventiva §8 e os testes §9 NÃO ficam autorizados por esta aprovação — dependem de decisão específica do PO e autorização própria.

**founder** · 2026-10-01T04:42:20.099582+00:00

PO — uma correção delimitada APENAS do documento wake-stale-role-evidence, antes de qualquer futura decisão de implementação. O diagnóstico e a evidência independente ficam preservados. Platform & CI é o owner atual; corrigir pelas permissões legítimas desta issue, com retorno nativo ao EH somente se necessário. Sem novo plano, filho, teste, código, configuração, permissão, restart ou deploy.



1\) Na proposta §8, ser autor do comentário NÃO basta para admitir um produtor que já perdeu o papel. Toda exceção deve exigir prova de que o destinatário continua autorizado no estado atual da issue (owner/participante vigente ou autorização explícita de interação ainda válida). Não transformar identidade histórica de autor em autorização atual. Ajustar o cenário negativo do desenho de testes para cobrir auto-comentário anterior ao handoff e perda posterior de papel, além do comentário do board enfileirado. Preservar comentário legítimo do owner corrente, menção autorizada e wake nativa do revisor.



2\) Separar o escopo: o patch proposto é só a prevenção no claim. T3/T4, sobre classificação terminal de 403 e distinção de 422 no runtime, são outro contrato e ficam fora dessa proposta/implementação. Registrar explicitamente o risco residual de perda de papel APÓS o claim e continuação após 403; a guarda no claim sozinha não prova que toda continuação desse tipo seja impossível. Não incorporar uma segunda implementação à proposta.



Publicar a mesma evidência em uma revisão textual corrigida, com breve recibo e leitura de confirmação. Uma futura implementação/testes retidos exige decisão específica posterior; nenhuma autorização de implementação ou implantação está sendo dada aqui.

**Platform & CI Engineer** · 2026-10-01T04:45:36.422762+00:00

**Recibo AID-3586 — Rev. 2 do documento `wake-stale-role-evidence` publicada conforme correção delimitada do PO (`fb44d428`), com leitura de confirmação concluída.**

- **Revisão**: `6c84c023-f366-4697-814a-d0b087be20a9` (2026-10-01T04:45:17Z), sobre a base `8cccc433` (rev. 1 preservada no histórico). Readback byte-idêntico ao texto corrigido; diagnóstico (§3–§7) e evidência (§1–§2, §10–§11) inalterados — diff limitado a 4 blocos: nota de revisão, §8, §9, §12.
- **(1) §8 — autorização vigente, não identidade histórica**: autoria do comentário de wake removida como condição de admissão; toda exceção agora exige prova de autorização no estado atual da issue (assignee corrente, `currentParticipant` corrente, ou menção autorizada ainda válida sob mention-grant vigente). Auto-comentário anterior ao handoff com perda posterior de papel é recusado.
- **(1) §9/T1 — dois cenários negativos**: (a) comentário do board enfileirado para produtor que perdeu o papel (evento original) e (b) auto-comentário pré-handoff com perda de papel — ambos cancelados com `issue_comment_wake_addressee_stale` antes de `adapter.invoke`. T2 preserva owner corrente, menção autorizada e wake nativa do revisor.
- **(2) Escopo separado + risco residual**: a proposta é SOMENTE a prevenção no claim; T3/T4 declarados outro contrato (fora da proposta e de qualquer implementação dela). Registrado explicitamente que a guarda no claim não cobre perda de papel APÓS o claim nem continuação pós-403 (run `7aafc4be`/AID-3571 como caso observado) — a guarda sozinha não prova impossibilidade de continuação.
- **Sem implementação**: nenhum código/teste/plano/filho/config/permissão/restart/deploy; retorno ao EH não foi necessário (correção aplicada pelo owner atual pelas permissões legítimas desta issue). Implementação futura (e o contrato T3/T4) segue dependendo de decisão específica do PO + autorização própria.

Disposição: `done` — correção delimitada concluída e confirmada.

**Platform & CI Engineer** · 2026-10-01T04:45:45.928285+00:00

Rev. 2 do documento wake-stale-role-evidence publicada e confirmada (revisao 6c84c023 sobre base 8cccc433; recibo 00dff87e) — correção delimitada do PO fb44d428 aplicada: §8 exige autorização vigente (autoria histórica não basta), §9/T1 cobre auto-comentário pré-handoff + comentário do board enfileirado, T3/T4 declarados contrato separado, risco residual pós-claim registrado. Diagnóstico e evidência preservados; nenhuma implementação autorizada ou realizada. Owner atual: Platform & CI Engineer.

---

