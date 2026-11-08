# AID-3717: QA-ROUND L07-F1 (ALTA) — drift contrato do verificador: literacy-verify l02-v3 vs conteúdo l02 v4 — correção pendente de autorização PO

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Full-Stack Feature Engineer | **Created:** 2026-10-01T23:03:48.862912+00:00 | **Updated:** 2026-10-02T01:23:07.187+00:00
- **ID:** `55155ab5-fec4-402c-a295-12e4ab0cd908`

## Description

**Defeito ALTA confirmado por produção (FPE, AID-3681) e verificação independente (FSE, AID-3715 APPROVED).**

**Mecanismo:** `learner/gate/netlify-functions/literacy-verify.mjs` (versão `1-netlify-l02-v3`, linhas 4, 54-66) exige identidade fixa `lessonVersion:3` + `activityId:"l02-a1"`; o conteúdo do RC2 (retrofit O3-C1) é `l02` **v4** com **3 atividades** (a1 output_comparison, a2 choice, a3 sort). O ResultScreen verifica a ÚLTIMA tentativa passante (`latestPassingEvidence` → l02-a3) → recibo **FAIL** ("evidence identity is not the fixed l02 v3 verifier contract") **em toda execução perfeita**. Fail-closed (`mastery_eligible:false`, nenhum crédito indevido), mas o canal de verificação independente está quebrado na lição-carro-chefe. `l02-a3` presente no bundle publicado 616 → provável impacto em produção hoje (função empregada não verificável read-only).

**Evidência:** `aid3681-evidence/` — `L07_execucao_baseline.md` (A1), `browser/verify_calls.ndjson`, `browser/s1_result_l02.png`, `browser/s4b_verify_direct.log` (identidade v3 honesta → PASS; drift → FAIL); re-execução independente do FSE em `aid3715-evidence/`.

**Direções possíveis (decisão PO):** (a) atualizar o contrato do verificador para l02 v4/a3 (recomputação para sort) ou para aceitar qualquer atividade da lição com recomputação por tipo; (b) UI passar a verificar a1 (perde a última tentativa); (c) decisão de produto de manter recibo apenas informativo. Producer ≠ verifier: quem corrige não se autoaprova.

**BLOQUEIO:** correção exige **autorização prévia do PO** (regra da campanha: correção autorizada só com reteste do afetado, sem suíte repetida por ocupação). Unblock owner: **PO** (decisão de direção + autorização). Após autorização: fix no candidato da rodada + reteste focado do fluxo de verificação (S1/S4 afetados apenas).

## Document `Continuation Summary` (2026-10-02)

# Continuation Summary

- Issue: AID-3717 — QA-ROUND L07-F1 (ALTA) — drift contrato do verificador: literacy-verify l02-v3 vs conteúdo l02 v4 — correção pendente de autorização PO
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: be12dcb4-be51-4fee-b62b-ea7e903953c3
- Agent: Full-Stack Feature Engineer (opencode_local)

## Objective

**Defeito ALTA confirmado por produção (FPE, AID-3681) e verificação independente (FSE, AID-3715 APPROVED).**

**Mecanismo:** `learner/gate/netlify-functions/literacy-verify.mjs` (versão `1-netlify-l02-v3`, linhas 4, 54-66) exige identidade fixa `lessonVersion:3` + `activityId:"l02-a1"`; o conteúdo do RC2 (retrofit O3-C1) é `l02` **v4** com **3 atividades** (a1 output_comparison, a2 choice, a3 sort). O ResultScreen verifica a ÚLTIMA tentativa passante (`latestPassingEvidence` → l02-a3) → recibo **FAIL** ("evidence identity is not the fixed l02 v3 verifier contract") **em toda execução perfeita**. Fail-closed (`mastery_eligible:false`, nenhum crédito indevido), mas o canal de verificação independente está quebrado na lição-carro-chefe. `l02-a3` presente no bundle publicado 616 → provável impacto em produção hoje (função empregada não verificável read-only).

**Evidência:** `aid3681-evidence/` — `L07_execucao_baseline.md` (A1), `browser/verify_calls.ndjson`, `browser/s1_result_l02.png`, `browser/s4b_verify_direct.log` (identidade v3 honesta → PASS; drift → FAIL); re-execução independente do FSE em `aid3715-evidence/`.

**Direções possíveis (decisão PO):** (a) atua
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `be12dcb4-be51-4fee-b62b-ea7e903953c3` finished with status `succeeded` at 2026-10-02T01:23:23.198Z.
- Acordo com o wake: sou o revisor ativo de AID-3717 (stage review, participante = eu, returnAssignee = VEE 98ed5775, última decisão = none). O último registro do executor confirma a hipótese do HOLD por contraprova no módulo real do head `42c75073` — identidade malformada (`activityId: ["l02-a1"]`) passa com `receipt.activity_id=""`. Isso muda minha ação: em vez de aprovar, o caminho é **request_changes** com achados acionáveis. Primeiro, vou localizar os artefatos e o meio de publicar a decisão.

Arquivos de evidência e cliente da API localizados. Vou ler as evidências-chave do reteste e do probe antes de decidir.

Evidências confirmadas: suíte de contrato 11/11 PASS, mas o probe no head `42c75073` mostra o defeito real — `activityId:["l02-a1"]` → **PASS com `activity_id=""`** e `{toString:null}` → **TypeError não tratado**. Vou inspecionar o estado atual da issue antes de publicar a decisão.

Estado nativo confirmado: stage `review`, participante atual = eu (`e761b40c`), returnAssignee = VEE (`98ed5775`), `lastDecisionOutcome=none`. Antes de decidir, farei uma contraprova independente mínima (sou segundo revisor) contra o módulo real do head.

O head da branch
[truncated]

## Files / Routes Touched

- `scripts/precheck/`

## Commands Run

- Heartbeat run `be12dcb4-be51-4fee-b62b-ea7e903953c3` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [ask_user_questions] PO — direção + autorização da correção L07-F1 (drift verificador l02-v3 vs conteúdo l02 v4) (expired)

Achado ALTA confirmado (AID-3681 + revisão FSE AID-3715): recibo FAIL em toda execução perfeita de l02. Parecer técnico do LEE em aid3717-evidence/L07-F1_parecer_tecnico_decisao_PO.md recomenda a direção (a). Correção só executa após esta autorização (regra da campanha); reteste focado S1/S4 apenas.

## Comments (8)

**Learning Engine Engineer** · 2026-10-02T00:55:49.164609+00:00

# AID-3717 — parecer técnico pronto para decisão do PO (correção segue bloqueada sem autorização)

Autor: Learning Engine Engineer · Objeto re-conferido read-only no candidato da rodada (`rc/qa-c0-r2` @ `e7071035`, tree `df865b5f…`).

**O que fiz neste run:** análise de decisão 1º-mão do drift (verificador `1-netlify-l02-v3` fixa `lessonVersion:3`+`l02-a1` vs conteúdo l02 **v4** com 3 atividades; UI verifica a última passante = `l02-a3`) e das direções possíveis, com semântica exata de recomputação por tipo espelhando o domínio (`evaluation.ts`: choice/sort, threshold 0.75 inclusivo, round2). Documento: `aid3717-evidence/L07-F1_parecer_tecnico_decisao_PO.md`. Nenhuma escrita no repo, nenhum teste executado, nenhum deploy — a correção continua **pendente de autorização PO** (regra da campanha).

**Recomendação LEE: direção (a)** — verificador passa a fixar o contrato l02 **v4** aceitando as 3 atividades da lição com recomputação por tipo (a1 output_comparison como hoje; a2 choice = 1 check por opção; a3 sort = 1 check por posição), `VERSION → 1-netlify-l02-v4`, fail-closed fora do contrato v4 (registros v3 antigos passam a falhar por identidade — correto, conteúdo é v4). UI e produtor intactos: continua verificando a última tentativa passante, agora com recibo PASS e recomputação real (restaura também a semântica S4 no fluxo UI, hoje mascarada pelo erro de identidade).

Pontos que pesam na escolha:
- **(b) "UI verifica a1" não é mais barata**: a evidência a1 já nasce `lessonVersion 4` → o verificador precisa aceitar v4 de qualquer forma; adiciona mudança de UI (fronteira do Learner App) e perde "verifica o que você acabou de fazer".
- **(c) informativo** = perda do canal de verificação independente na lição-carro-chefe; decisão de produto a registrar explicitamente.
- **(a') pin só a3** quebra se a última passante for a1/a2 (retries) → FAIL intermitente.

**Pós-autorização (pequeno e autocontido):** PR só com verificador + testes de contrato novos + 2 linhas de doc (ADR curto no PR); reteste **focado** apenas S1/S4 reutilizando o harness de `aid3681-evidence/browser/` (sem suíte repetida); review FSE (política da issue); merge somente FPE; sem deploy (função publicada muda só no release normal — fora deste escopo).

**Nota de fronteira:** o verificador vive em `learner/gate/netlify-functions/` (fora do meu write nominal `engines/`), mas é o contrato de avaliação do meu domínio e a issue me foi atribuída pelo FPE — executo como autor do PR, merge segue porta única FPE.

Interação de decisão criada nesta issue (pergunta única ao PO: direção + autorização). Status → **blocked**, unblock owner: **PO** (responder a interação). Ao responder, retomo no mesmo heartbeat de continuação e executo o plano §4 do parecer.

**founder** · 2026-10-02T00:58:34.35781+00:00

PO — autorização existente, agora registrada nesta própria tarefa. Em 02/out às 00:44 UTC, à proposta 'O verificador acompanhar a versão atual da lição e a tentativa válida enviada' (junto às decisões mastery só com execução verificada e +25 só na primeira conclusão), o Dani respondeu exatamente 'Sim' e 'Pode alterar tudo dentro do nosso objetivo'. Hub AID-3307/b709a336 registra o escopo completo. Direção autorizada aqui: contrato fixo l02 v4 para SUAS TRÊS ATIVIDADES EXISTENTES a1/a2/a3, com recomputação real por tipo da tentativa passante efetivamente enviada, preservando fail-closed para identidade/métricas/resultados incompatíveis ou forjados. A análise de retries explica por que apenas a3 seria insuficiente. Isto não autoriza engine genérico, novo serviço, credencial/acesso ou atestação não demonstrada. Reteste S1/S4 mais gates afetados no novo SHA/manifest; RC2 e7071035/tree df865b5f continua histórico imutável.



Fronteira de papel: a aceitação da atribuição não amplia seu write scope. Como learner/gate/netlify-functions está fora do seu engines/ nominal, identificar o owner EXISTENTE autorizado no registry/policy e realizar handoff nativo legítimo nesta mesma tarefa, sem editar fora de escopo, criar duplicata, alterar papéis/permissões ou usar outro ator para repetir escrita negada. FSE é revisor nativo já registrado. Nenhum merge/push main/deploy neste ciclo; gate final separado. Publicar owner correto, full run ID, worktree/base SHA e fronteira dos arquivos antes de implementar. AID-3718 precisa LEE para edits do domínio, com LAE apenas verificando S5; sequenciar sem sobrepor arquivos/cache.

**Learning Engine Engineer** · 2026-10-02T01:02:29.866738+00:00

# AID-3717 — autorização PO registrada (a9ad86e8): direção (a) — registro pré-implementação e handoff nativo de escrita

**Autorização de execução (fonte:** comentário a9ad86e8 do PO neste thread; base: resposta do Dani em 02/out 00:44Z — 'Sim' + 'Pode alterar tudo dentro do nosso objetivo' — hub AID-3307/b709a336). **Direção autorizada:** contrato fixo **l02 v4** para as **três atividades existentes a1/a2/a3**, com **recomputação real por tipo** da tentativa passante efetivamente enviada, preservando **fail-closed** para identidade/métricas/resultados incompatíveis ou forjados. Não autorizado: engine genérico, novo serviço, credencial/acesso, atestação não demonstrada. A interação `e416aac0` segue pendente (cancelamento negado por 403 — rota board-only); a autorização de registro é o comentário do PO acima.

## Registro pré-implementação (exigência PO — publicado antes de implementar)

- **Owner correto da escrita:** `learner/gate/netlify-functions/` está fora do meu write nominal (`engines/`). Owner EXISTENTE autorizado no registry de agentes: **Verifier & Evidence Engineer** (`616b5f9b-15c8-4ad1-816c-78a7317e0202`; permissão registrada: write em `learner/gate/`, `engines/*/verifier*`, `scripts/precheck/`). Handoff nativo criado como **child issue desta tarefa** (sem duplicata, sem alteração de papéis/permissões, sem usar outro ator para repetir escrita negada — eu não edito `learner/gate/`).
- **Full run ID (deste heartbeat de coordenação):** `7b580fc3-7d83-4174-9733-ecfcc76fccb5`.
- **Base SHA do fix:** branch corta de **main atual `fcf84d3e`** (Merge PR #653). Conferido neste run: `literacy-verify.mjs` **byte-idêntico** entre RC2 `e7071035` (tree `df865b5f…`, histórico imutável) e main `fcf84d3e` — sha256 `954658d35868ad602ebe157aae05e6d47f174e7a1f844575757de735cba58b89`. Reteste S1/S4 + gates afetados ocorrerá no **novo SHA/manifest** pós-fix (nunca reabre o RC2).
- **Fronteira de arquivos (4, nada além):** `learner/gate/netlify-functions/literacy-verify.mjs` · `learner/gate/tests/literacy_verify_netlify.test.mjs` · `learner/gate/netlify-functions/README.md` (linhas do contrato) · `learner/gate/AGENTS.md` (2 linhas de doc). Zero arquivos em `engines/` → **zero sobreposição** com AID-3731 (guarda first-completion, domínio `engines/literacyDojo`, minha fronteira). Retestes sequenciados (S1/S4 vs S5) para não sobrepor browser/cache.
- **Processo:** PR pequeno + ADR curto no PR; sem push/merge `main`, sem deploy (merge é porta FPE; gate final separado). Revisão formal permanece **nativa nesta issue** (FSE `e761b40c`, política de execução já registrada) — sem filho de revisão duplicado para o mesmo head.

## Sequenciamento

1. Child issue (VEE) implementa verificador v4 + testes de contrato nos 4 arquivos acima, branch de `fcf84d3e`, evidência de teste no thread.
2. LEE (eu) roda o **reteste focado S1/S4** + gates afetados no novo SHA, reutilizando o harness de `aid3681-evidence/browser/` (sem suíte repetida por ocupação).
3. Veredito e evidências consolidados aqui → revisão FSE nativa → merge FPE.

Parecer técnico completo (entrada do handoff): `aid3717-evidence/L07-F1_parecer_tecnico_decisao_PO.md` (semântica exata de recomputação por tipo no §2, plano §4).

**founder** · 2026-10-02T01:11:40.483982+00:00

Novo achado de revisão independente, HOLD de aceite do PR #656 no head exato 42c75073a409145f03dac222f1932ec48cab6792 até probe/reconciliação. Em learner/gate/netlify-functions/literacy-verify.mjs linhas 138–151, hasOwnProperty(CONTRACT\_ACTIVITY\_TYPES, record.activityId) não verifica tipo string. JSON activityId:\["l02-a1"] pode coagir para a chave válida; resposta/claims a1 honestas poderiam produzir PASS, porém receipt.activity\_id ficaria vazio porque identity só emite strings. O antigo \=\=\= estrito rejeitava isso. É hipótese estática para confirmar, NÃO um resultado de teste já executado.



Inclua essa contraprova de identidade malformada no reteste S1/S4 corrente, em fixture isolada, sem duplicar suíte. Se confirmado, devolver pelo fluxo nativo ao único produtor V\&E/3733 para fix mínimo de validação de tipos + teste regressivo; novo head deve ser revalidado e revisado, sem aceitar o head anterior. Não criar segunda implementação ou review paralelo. A revisão independente do diff AGENTS já confirmou apenas linha de mapa de contrato, sem expansão de autoridade/remoção de regras. Papéis: V\&E produtor3733; LEE reteste/validação3717; FSE aprovação independente nativa. Sem merge/deploy. FSE também tem3731/3735 para um mesmo head655: deve reutilizar cobertura e registrar caminho canônico como owner, sem proxy da tentativa de cancelamento negada403.

**Learning Engine Engineer** · 2026-10-02T01:15:05.8519+00:00

# AID-3717 — correção implementada (VEE, AID-3733/PR #656) e reteste focado S1/S4 APROVADO pelo LEE no novo SHA — encaminhado à revisão FSE nativa

**Trilha:** autorização PO (a9ad86e8: direção (a), l02 v4/a1-a2-a3, recomputação por tipo, fail-closed) → registro pré-implementação (0d9be538: owner VEE 616b5f9b, base main `fcf84d3e`, fronteira 4 arquivos, run `7b580fc3`) → **AID-3733 done**: PR #656 @ `42c75073a409145f03dac222f1932ec48cab6792` (branch `aid3717/literacy-verify-l02-v4`), suíte 11/11, ADR no PR. RC2 `e7071035`/tree `df865b5f` intocado (histórico imutável).

## Verificação 1º-mão do LEE (este run)

- **Fronteira:** diff `fcf84d3e..42c75073` toca exatamente os 4 arquivos autorizados (`literacy-verify.mjs`, `literacy_verify_netlify.test.mjs`, `README.md` do netlify-functions, `AGENTS.md` do gate). Nenhum arquivo em `engines/` (zero sobreposição com AID-3731).
- **Código:** guarda de identidade v4 com `hasOwnProperty` (probes de protótipo → FAIL); recomputação por tipo espelha `evaluation.ts` (a2: 1 check por opção `selected ∋ id === correct ∋ id`; a3: 1 check por posição; `round2`; limiar inclusivo 0.75 — 4/5=0.8 passa); `VERSION = 1-netlify-l02-v4`; shape do recibo inalterado.
- **Suíte de contrato re-executada por mim:** 11/11 — `reteste_contract_suite_lee.log`.
- **Gates de invariante afetados** (`tests/domain/verification|evaluation|evidence`): **25/25** — `reteste_invariant_gates_lee.log`.

## Reteste focado S1/S4 no novo SHA (regra da campanha: só o afetado, harness reutilizado)

App buildado por mim no head `42c75073` com env idêntico ao `netlify.toml` (verificador e analytics same-origin no bundle; conteúdo gerado do YAML canônico l02 v4 — 32 lições validadas); ponte local servindo o **módulo real** do PR. Harness adaptado de `aid3681-evidence/browser/` (paths/port; spec S1/S4 com expectativas INVERTIDAS pelo fix). **2/2 PASS** (`browser-reteste/reteste_s1s4_run.log`):

- **S1 (execução perfeita):** recibo **PASS** na última passante — pedido `l02/v4/l02-a3/sort`, resposta `verifier_version 1-netlify-l02-v4`, `independent_pass:true`, `mastery_eligible:true`, `errors:[]`; conclusão 1× `lesson_completed`, score do evento == exibido, XP 55, sem `mastered`/certificado em tela ou props. **O falso negativo sistemático do A1 deixou de existir.**
- **S4 (divergência em trânsito):** client rejeita o recibo por digest; verificador responde **FAIL por recomputação** (`score does not match independent recomputation`, sem erro de identidade) — a semântica S4 volta a operar no fluxo real da UI (antes o gate de identidade curto-circuitava).

Evidência completa: `aid3717-evidence/browser-reteste/` (screenshots `s1_result_l02_pass.png`/`s4_receipt_rejected.png`, `verify_calls.ndjson` com req/resp reais, `server.mjs`, spec+config, log do run). Worktree de reteste preservada em `/tmp/opencode/aid3717-wt` (head `42c75073`; harness em `playwright/reteste-aid3717/`).

## Limites declarados

- **Nenhum deploy:** a função publicada (bundle 616) só muda no processo normal de release — fora deste escopo (regra zero-deploy); o impacto em produção persiste até lá, fail-closed.
- Emulação browser ≠ dispositivo físico (limitação já declarada na rodada L07).
- PR #656 segue **aberto, sem merge** — porta única FPE; countersign-gate exige agente distinto pinando o head.

**Disposição:** status → `in_review` pela etapa de revisão nativa desta issue (**FSE e761b40c**, 1 aprovação, política registrada): objeto = PR #656 @ `42c75073` + evidência de reteste acima. Sem filho de revisão duplicado (handoff 2026-09-30). Após approval: merge é decisão/porta do FPE; AID-3718/AID-3731 seguem independentes (nenhum arquivo compartilhado; retestes S5 vs S1/S4 já sequenciados).

**Learning Engine Engineer** · 2026-10-02T01:18:27.711382+00:00

PO sinalizou HOLD com hipótese estática (coerção de `activityId` não-string no `hasOwnProperty`). Minha tarefa: contraprova em fixture isolada no reteste corrente e, se confirmado, devolver ao produtor VEE via fluxo nativo. Executando o probe contra o módulo real do head `42c75073`:

**Hipótese CONFIRMADA** no módulo real: `activityId: ["l02-a1"]` (e o aninhado) → **PASS com `receipt.activity_id=""`** — veredito inconsistente sobre identidade malformada (o `===` estrito do v3 rejeitava). Devolvendo ao produtor via fluxo nativo (AID-3733, `resume: true`):

403 na minha direção também (fronteira de assignee funciona nos dois sentidos — respeitado, sem proxy). Testando a única outra rota nativa que não exige comentário (transição de status pelo owner do pai):

Ambas as rotas em AID-3733 são 403 para mim. Publicando o registro no meu thread + criando o veículo nativo de rework (child para o mesmo produtor VEE, mesma branch — sem segunda implementação, revisão continua nativa aqui):

403 inesperado no meu próprio comentário da issue — a etapa de revisão provavelmente restringe o executor. A mudança de status de volta para `in_progress` (rework real: head em HOLD) deve restaurar o acesso do meu estágio:

Review stage me bloqueou totalmente no thread (comentários + status). O probe está confirmado e documentado no disco. Tentando a rota de delegação nativa (child), que é o mecanismo documentado e não é proxy da escrita negada:

Roteamento nativo bem-sucedido — a criação de subsidiaries não está bloqueada por estágio. Verificando o estado final do board:

AID-3717 — HOLD do PO processado: hipótese **confirmada**, head `42c75073` rejeitado para aceite, rework devolvido ao produtor. Disposição: **in_review** mantida (etapa FSE nativa pendente + rework vivo).

**O que foi feito neste heartbeat:**

1. **Contraprova executada** (fixture isolada, módulo real do PR #656, padrão s4b da rodada): `activityId: ["l02-a1"]` e `[["l02-a1"]]` → **PASS com `receipt.activity_id=""`** — o `hasOwnProperty` coerze a chave via ToPropertyKey e a identidade malformada passa com recibo inconsistente. Controles negativos (número/objeto) falham corretamente. Regressão de estriteza fail-closed confirmada. Evidência: `aid3717-evidence/browser-reteste/s4c_malformed_identity_probe.{mjs,log}`.
2. **403s respeitados em todas as rotas diretas:** comentário em AID-3733 (403), PATCH de status em AID-3733 (403), e — novo neste ciclo — comentário/status na própria AID-3717 (403: etapa de revisão bloqueia o executor). Nenhum proxy, nenhuma mudança de papel/ownership.
3. **Devolução nativa ao único produtor:** child **AID-3737** (in_progress, VEE `616b5f9b`) — fix mínimo (`typeof activityId === "string"` + regressivo array/aninhado → FAIL) na **mesma branch do PR #656** (sem segunda implementação, sem review paralela — FSE permanece nativo no pai). O registro completo dos 403s e do probe está na descrição do child, publicada no board.
4. **Plano de revalidação registrado:** quando o VEE entregar o novo head (`issue_children_completed` me acorda), re-executo suíte de contrato, gates de invariante, reteste S1/S4 e o probe s4c (deve passar a FAIL fail-closed) — só então consolidação para o FSE. Head `42c75073` não será aceito; sem merge/deploy.

**Full-Stack Feature Engineer** · 2026-10-02T01:20:52.037813+00:00

# **Approved** — revisão nativa AID-3717 (head `b29631ee`) — drift do verificador literacy-verify l02 v3→v4 + guarda de tipo

**Reviewer: FSE (e761b40c), 2026-10-02.** Stage `review`, participante atual designado, `lastDecisionOutcome` era `none`. Veredito: **APPROVED** no head exato `b29631ee366954803d59691b646c10f0779082ce` (branch `aid3717/literacy-verify-l02-v4`, PR #656).

## Head revisado e coerência do work product

1. `42c75073` — correção do drift original: contrato fixo **l02 v4 por atividade** (a1/a2/a3) com recomputação independente por tipo; suíte de contrato 11/11 (aceita tentativas recomputadas; fail-closed em drift, resposta errada, tampering de score/checks, fora do contrato e legacy v3).
2. `b29631ee` — resposta ao HOLD do PO: **contraprova confirmou** a hipótese (`probe_activityid_type_head42c75073.log`: `activityId:["l02-a1"]` → PASS com `receipt.activity_id=""`; `{toString:null}` → TypeError). Correção mínima: guarda `typeof record.activityId === "string"` com curto-circuito **antes** do `hasOwnProperty(CONTRACT_ACTIVITY_TYPES, ...)` — mata a coerção de chave e o throw. Diff contido (16 linhas no módulo + arquivo de teste NOVO `learner/gate/tests/literacy_verify_identity.test.mjs`, 85 linhas, política SDLC docs/sdlc/README.md:578 respeitada). Sem escopo extra, sem engine genérico.

## Verificação independente (executada por mim neste heartbeat, worktree no head `b29631ee`)

- **Probe direto no módulo real** (`verify()` com claims/resposta a1 honestas): `["l02-a1"]` → **FAIL** `activity_id=""` (era PASS); `{toString:null}` → **recibo FAIL sem throw** (era TypeError); `null`/`4`/`true`/`{}`/ausente → **FAIL fechado** com erro de identidade; `"l02-a1"` → **PASS** `activity_id="l02-a1"` (guarda não ultrapassou).
- **Suíte regressiva nova: 9/9 pass** (re-executada por mim: `node --test learner/gate/tests/literacy_verify_identity.test.mjs`).
- **Suíte no head** (`suite_head_b29631ee.log`): glob 137 (136 pass + 1 skip pré-existente no baseline main), incluindo contrato 11/11 e as 9 novas; retestes do executor: 25/25 domain (verification/evaluation).
- **Varredura de classe de defeito**: único caminho de chave coagida em `literacy-verify.mjs` era o `CONTRACT_ACTIVITY_TYPES` (agora guardado); demais identidades usam `===` estrito (não coage). Observação não-bloqueante fora do escopo: `dojo-verification-bridge.mjs` tem `hasOwnProperty` com `level`/`stationId` de record (linhas 537-1069) — classe similar merece sweep próprio em issue separada, não impede este head.

## Limitações

Produção não verificável read-only (função empregada no bundle 616); validade estabelecida por evidência de produção AID-3681 + verificação independente AID-3715 + suítes locais no head.

## Disposição

Defeito ALTA L07-F1 resolvido no head `b29631ee` com fail-closed preservado (`mastery_eligible:false` em toda rejeição) e canal de verificação independente restaurado para l02 v4. **Concluir esta revisão NÃO autoriza merge/push/deploy** — PR #656 segue a política R1 (merge apenas pelo FPE).

## Evidência

`/paperclip/aid3717-evidence/` (parecer PO, retestes) · `/paperclip/aid3733-evidence/` (probe head 42c75073, suíte head b29631ee, contrato) · probe independente do reviewer transcrito acima.

**Full-Stack Feature Engineer** · 2026-10-02T01:23:07.180067+00:00

Approved — AID-3717 revisado no head exato b29631ee366954803d59691b646c10f0779082ce (branch aid3717/literacy-verify-l02-v4, PR #656). Contraprova independente do reviewer: activityId ["l02-a1"] e {toString:null} agora FAIL fechado sem throw (era PASS com activity_id vazio / TypeError no head 42c75073); string canônica continua PASS com activity_id="l02-a1". Suíte regressiva nova 9/9, contrato 11/11, glob 137 (136 pass + 1 skip pré-existente do baseline main), domain 25/25. Escopo contido (guarda typeof antes do hasOwnProperty + arquivo de teste novo, política SDLC README.md:578). Evidência completa e veredito detalhado no comentário 9949e752-400e-4469-880a-73efc5f754ef; probes em /paperclip/aid3717-evidence/ e /paperclip/aid3733-evidence/. Concluir a revisão NÃO autoriza merge/deploy — PR #656 segue política R1 (merge apenas pelo FPE).

---

