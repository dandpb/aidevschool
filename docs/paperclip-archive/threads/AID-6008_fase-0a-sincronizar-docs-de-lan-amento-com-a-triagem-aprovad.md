# AID-6008: Fase 0A — Sincronizar docs de lançamento com a triagem aprovada (2 URLs)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Docs & Readiness Engineer | **Created:** 2026-11-01T10:30:05.431275+00:00 | **Updated:** 2026-11-01T16:48:36.771+00:00
- **ID:** `cadd3749-02d1-48d3-99be-545f669169cb`

## Description

## Contexto

AID-6005 (pai): triagem das superfícies públicas APROVADA pelo founder (Opção A, aceite 2026-11-01T10:28:05Z). Lançamento passa a ter **2 URLs**: codexDojo OS (https://aidevschool-codexdojo-os.netlify.app) + LiteracyDojo (https://aidevschool-literacydojo.netlify.app). dojoToday vira **secundária** (rota declarada, fora do marketing). **Retirar do público** (engines permanecem): voxel-avulso https://aidevschool-voxel-warehouse.netlify.app, PixelQuest https://aidevschool-pixelquest.netlify.app, miniTown https://aidevschool-minitown.netlify.app, dashboard codexDojo https://aidevschool-codexdojo.netlify.app. Documento `plan` na AID-6005 tem a triagem completa.

**Gate de publicação (regra nova, registrar em docs):** nenhuma URL pública sem (1) use case customer-ready no `docs/product-readiness/inventory.yaml` apontando a rota pública, (2) binding deploy↔pin promovido com recibo, (3) título/copy voltado ao aluno (não à engine), (4) dono nomeado. Sem isso, fica local.

## Entrega (child A — docs)

Sincronizar a documentação de produto com a triagem aprovada, num único PR:

1. `docs/product-readiness/inventory.yaml` — entradas `voxel-standalone-learning-loop`, `pixelquest-evidence-encounter` e `minitown-explore-only`: rota pública sai do ar como entrada; declarar execução local (app local/rota local), mantendo o tier evidenciado. Entrada `dojotoday-daily-guidance`: marcar como superfície secundária/companion (não entrada de lançamento).
2. `docs/product-readiness/student-guide.md` — remoção das URLs retiradas do caminho do aluno; lançamento = OS + LiteracyDojo; dojoToday como rota secundária declarada.
3. `README.md` e `docs/VISION.md` — seção de lançamento refletindo 2 URLs públicas (+ dojoToday secundária).
4. Registrar o **gate de publicação** acima em `docs/product-readiness/policy.yaml` (ou arquivo apropriado de política).
5. `engines/codexDojo/ecosystem/MANIFEST.md` se tocar prompts/roadmap/entregas.

## Aceite

- PR único pela porta `scripts/merge_pr.sh` com countersign de agente distinto (regra da casa).
- `grep` pós-change: nenhuma das 4 URLs retiradas aparece como rota de entrada nos docs de lançamento (referências históricas/evidência podem permanecer, marcadas como retiradas).
- Recibo na child com: comando, hash do merge e verificação.

## Document `Continuation Summary` (2026-11-01)

# Continuation Summary

- Issue: AID-6008 — Fase 0A — Sincronizar docs de lançamento com a triagem aprovada (2 URLs)
- Status: blocked
- Priority: high
- Current mode: implementation
- Last updated by run: dcc77104-47fe-4068-b5b2-fea1cd34f59d
- Agent: Docs & Readiness Engineer (opencode_local)

## Objective

## Contexto

AID-6005 (pai): triagem das superfícies públicas APROVADA pelo founder (Opção A, aceite 2026-11-01T10:28:05Z). Lançamento passa a ter **2 URLs**: codexDojo OS (https://aidevschool-codexdojo-os.netlify.app) + LiteracyDojo (https://aidevschool-literacydojo.netlify.app). dojoToday vira **secundária** (rota declarada, fora do marketing). **Retirar do público** (engines permanecem): voxel-avulso https://aidevschool-voxel-warehouse.netlify.app, PixelQuest https://aidevschool-pixelquest.netlify.app, miniTown https://aidevschool-minitown.netlify.app, dashboard codexDojo https://aidevschool-codexdojo.netlify.app. Documento `plan` na AID-6005 tem a triagem completa.

**Gate de publicação (regra nova, registrar em docs):** nenhuma URL pública sem (1) use case customer-ready no `docs/product-readiness/inventory.yaml` apontando a rota pública, (2) binding deploy↔pin promovido com recibo, (3) título/copy voltado ao aluno (não à engine), (4) dono nomeado. Sem isso, fica local.

## Entrega (child A — docs)

Sincronizar a documentação de produto com a triagem aprovada, num único PR:

1. `docs/product-readiness/inventory.yaml` — entradas `voxel-standalone-learning-lo
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `dcc77104-47fe-4068-b5b2-fea1cd34f59d` finished with status `succeeded` at 2026-11-01T15:12:45.761Z.
- Monitor disparou (15:10Z). Verificando o estado do caminho de revisão — veredito QA (AID-6013), merge do PR #760 e thread:

PR aberto, sem merge; AID-6013 `todo` com 0 comentários (~4.5h). Verificando o estado do agente QA e novos comentários no PR:

QA Lead e FPE estão **paused** (pausa manual) — o revisor não pode agir. Caminho: ping no thread + `blocked` com unblock owner nomeado. Verificando como blockers são registrados:

Sem mecanismo de link inspecionável — o blocker real já é first-class (AID-6013 todo, revisor pausado). Aplico: ping no thread, tentativa de ping no canal do QA (respeitando 403), monitor rearmado:

Monitor rearmado foi recusado silenciosamente com a issue `blocked` (comportamento do serviço — blocked aguarda unblock, não auto-wake). Estado final é coerente. Resumo:

**Leitura do monitor 15:10Z:**
- PR #760: `OPEN`, head `db6e296e` preservado, sem veredito — única falha do gate segue sendo countersign ausente (produção pronta desde 10:59Z)
- AID-6013 (countersign QA): `todo`, 0 comentários ~4,5h
- **QA Lead e FPE constados `paused`** (pausa manual) — revisor não pode acordar

**Ação tomada:**
- Ping em AID-6013 recusado por boundary (403)
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`
- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `dcc77104-47fe-4068-b5b2-fea1cd34f59d` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Wait for reviewer feedback or approval before continuing executor work.

## Comments (5)

**Docs & Readiness Engineer** · 2026-11-01T10:50:39.964485+00:00

# PR #760 aberto — docs sincronizados com a triagem aprovada (aguarda countersign QA → merge FPE)

## Entrega (child A — docs)
**PR #760** `docs/aid-6008-launch-triage-sync` → `main` · **head `db6e296eec4126fb438966fe7130a024922a04d1`** (2 commits, autor `Docs & Readiness Engineer <docs-readiness@aidevschool.local>`)
https://github.com/dandpb/aidevschool/pull/760

1. **`inventory.yaml`** — `voxel-standalone-learning-loop`, `pixelquest-evidence-encounter`, `minitown-explore-only`: route pública sai como entrada; execução local declarada (app local/rota local) com nota de retirada (AID-6005, 2026-11-01); **tier evidenciado mantido** (customer-ready ×2, experimental ×1). `dojotoday-daily-guidance`: surface marcada `dojoToday (secondary companion surface, not a launch entry)` + route anotada como secundária. Matriz regenerada (`cli.py render`).
2. **`policy.yaml` v2** — **gate de publicação registrado** (4 requisitos aprovados: use case CR apontando a rota pública · binding deploy↔pin promovido com recibo · título/copy voltado ao aluno · dono nomeado). `schemas/policy.schema.json` + `tools/load.py` + `tools/models.py` estendidos mantendo closed-schema (fail-closed em campos desconhecidos — coberto por teste).
3. **`student-guide.md`** — URLs retiradas fora do caminho do aluno; lançamento = **OS + LiteracyDojo**; dojoToday rota secundária declarada; itens 6–8 como CR local/secondária.
4. **`README.md` + `docs/VISION.md`** — seção de lançamento refletindo **2 URLs públicas** (+ dojoToday secundária); "miniTown público" em decisões pendentes atualizado pós-triagem.
5. **`MANIFEST.md`** — **sem mudança** (nada de prompts/roadmap/entregas tocado; grep confirma que o manifest não referencia rotas públicas de lançamento).
6. **`facilitator-guide.md`** — sincronizado (mesmo domínio product-readiness; consistência aluno/facilitador).

## Verificação (comandos + resultado)
- `python3 docs/product-readiness/tools/cli.py render` + `cli.py check` → **"valid and in sync"**
- `python3 -m pytest docs/product-readiness/tests/ -q` → **58 passed, 2 skipped** (novo `test_policy_publication_gate.py` incl.)
- `bash scripts/sdlc_guard_check.sh --base origin/main` → **clean** (protect-tests respeitado: teste novo em arquivo ADDED; `test_load.py` net zero)
- **Grep de aceite**: `git grep -nE "aidevschool-(voxel-warehouse|pixelquest|minitown|codexdojo)\.netlify" -- . ':(exclude)intent/'` → **0 ocorrências**. Única menção restante: `intent/AID-987-t1-customer-ready-elevation/spec.md` (registro SDLC histórico congelado, datado — não é doc de lançamento).
- **CI head db6e296e**: **43 pass / 1 fail** — a única falha é `countersign-gate` (estado esperado pré-veredito; ausência de countersign também é fail por design). `product readiness (claims)` ✅ · `SDLC guardrails (diff)` ✅.

## Caminho para merge (single-writer FPE)
- **Countersign atribuído pela porta** `scripts/countersign_assign.sh` → **AID-6013** (QA Lead `ca6a3f95`), pinando `db6e296e…`, parent AID-6005. AID-6012 (pin do head anterior `625e2d4a`, morto após fix commit do guard) está com o QA para fechar por supersede — meu comentário/fechamento lá foi recusado por boundary (403 respeitado; nota de supersede registrada no body da AID-6013).
- Após veredito QA (`Countersign: … head=db6e296e…`), **merge pela porta única** `scripts/merge_pr.sh 760` — **FPE** (single-writer até R1; meu papel não mergeia em main).
- Recibo final com **hash do merge** será postado nesta child pelo caminho acima (merge ainda não ocorreu — nenhum hash para citar ainda).

## Disposição
`in_review` — reviewer: **QA Lead (AID-6013, countersign)** → merge: **FPE**. Sem blockers do lado docs.

Provenance: agent=docs-readiness task=AID-6008 parent=AID-6005 pr=760 run=93733380-0f8d-454d-8084-30869cc9784d

**founder** · 2026-11-01T10:54:33.064919+00:00

Na checagem de 2026-11-01 às 10:52 UTC, o gate do PR #760 falhou por producer unattributed, não apenas por countersign ausente: [https://github.com/dandpb/aidevschool/actions/runs/41298668807](https://github.com/dandpb/aidevschool/actions/runs/41298668807) . Corrija somente a proveniência do seu próprio PR, usando o trailer exigido pelo gate e os identificadores reais verificados do produtor: run 93733380-0f8d-454d-8084-30869cc9784d, session ses\_e6956f9aeffeDYRU9X4famISJt, agent Docs & Readiness Engineer (7b5e31ea-b7cf-4832-854f-346b13fdeb3f), task AID-6008. Confira-os nos seus registros e não fabrique identificadores. Preserve head db6e296eec4126fb438966fe7130a024922a04d1 e evidências existentes. Registre o link/recibo da correção e a leitura do resultado; não repita a suíte inalterada. Este pedido não autoriza countersign próprio, retomar ou substituir QA Lead/AID-6013 manualmente pausado, mexer em AID-6012 após o 403, merge, publicação ou teardown. Se houver negativa de permissão, pare e registre sem proxy. A revisão independente permanece pendente.

**Docs & Readiness Engineer** · 2026-11-01T11:01:06.901021+00:00

# Provenance do PR #760 corrigida — `producer unattributed` eliminado (10:59:58Z)

ACK ao comentário d8e7e940. Correção aplicada **somente na proveniência**, conforme o escopo pedido.

## O que estava errado
O trailer do body do PR (`agent=docs-readiness task=AID-6008 parent=AID-6005`) não casava a gramática exigida pelo gate (`agent=… task=… run=… session=…` — §5, fail-closed AID-2768) → `producer unattributed` (run 41298668807, 10:52Z).

## Correção
- **Body do PR #760** editado via REST (PATCH /repos/…/pulls/760): trailer canônico
  `Provenance: agent=docs-readiness-7b5e31ea task=AID-6008 run=93733380-0f8d-454d-8084-30869cc9784d session=ses_e6956f9aeffeDYRU9X4famISJt`
- **Comentário de correção no PR** (registro + verificação): https://github.com/dandpb/aidevschool/pull/760#issuecomment-6557031412 (disparou o re-run do gate via `issue_comment`)
- **Head preservado**: `db6e296eec4126fb438966fe7130a024922a04d1` (nenhum commit; evidências intactas; suíte não re-rodada)

## Identificadores verificados first-hand (nada fabricado)
| ID | Verificação |
|---|---|
| run `93733380-0f8d-454d-8084-30869cc9784d` | run registry (GET /api/heartbeat-runs/…): status `succeeded`, agent `7b5e31ea-…`; é o `executionRunId` da AID-6008 |
| session `ses_e6956f9aeffeDYRU9X4famISJt` | registry `sessionIdAfter` do run 93733380 **e** run-log em disco (`…/7b5e31ea…/93733380….ndjson`, `step_start` 10:30:27Z) |
| agent `docs-readiness-7b5e31ea` | Docs & Readiness Engineer (7b5e31ea-b7cf-4832-854f-346b13fdeb3f) — dono da AID-6008 |
| task `AID-6008` | este PR (child A da AID-6005) |

## Leitura do resultado pós-correção
- Gate **CI** (run 41299875022, 10:59:58Z): `countersign-gate FAIL (AID-2768): no 'Countersign: <AID|GH>-<n> verdict <ref>' line found in any PR comment (§1)` — **a falha de producer unattributed desapareceu**; o único pendente é o countersign independente (esperado pré-veredito).
- Gate **local** antes do comentário (`python3 scripts/countersign_gate_check.py --pr 760`): mesma leitura (passa de §5 para §1).

## Limites respeitados
Sem countersign próprio; AID-6013 (QA Lead) e AID-6012 intocadas; sem merge/publicação/teardown; sem proxy. **Revisão independente segue pendente** — caminho inalterado: veredito QA (AID-6013, pin `db6e296e…`) → merge FPE pela porta (`scripts/merge_pr.sh 760`) → recibo com hash aqui.

Provenance: agent=docs-readiness-7b5e31ea task=AID-6008 run=93733380-0f8d-454d-8084-30869cc9784d session=ses_e6956f9aeffeDYRU9X4famISJt

**Docs & Readiness Engineer** · 2026-11-01T15:12:25.339296+00:00

# Monitor 15:10Z — veredito QA pendente; bloqueio: revisor pausado (ping CEO)

## Leitura do monitor (wake_owner 15:10Z)
- **PR #760**: `OPEN`, sem merge, head `db6e296eec4126fb438966fe7130a024922a04d1` preservado; nenhum comentário novo desde a correção de provenance (10:59Z, [issuecomment-6557031412](https://github.com/dandpb/aidevschool/pull/760#issuecomment-6557031412)).
- **AID-6013** (countersign QA, pin `db6e296e`): `todo`, **0 comentários** ~4,5h após a atribuição (10:43Z).
- **Gate**: única falha remanescente é countersign ausente (§1) — produção pronta para veredito desde 10:59Z.

## Bloqueio (first-class)
- **QA Lead** (reviewer designado) está **`paused`** (pausa manual) — não pode acordar para AID-6013.
- **FPE** (merge single-writer) também **`paused`**.
- Ping em AID-6013 recusado por boundary (403) — respeitado, registrado aqui; produtor não retoma/substitui revisor (founder d8e7e940).

## Unblock owner/action
**CEO** (idle) — 1 clique: **retomar o QA Lead** (ele encontra a AID-6013 pronta: escopo + comandos + linha canônica do veredito no body) **ou** nomear countersigner independente alternativo para a AID-6013. Depois do veredito, **retomar o FPE** para o merge pela porta (`scripts/merge_pr.sh 760`) — recibo com hash do merge segue aqui.

Issue marcada **`blocked`** (unblock: CEO). Monitor rearmado (17:15Z) para re-checar veredito/merge e fechar com recibo.

Provenance: agent=docs-readiness-7b5e31ea task=AID-6008 run=3d022f49-223e-41ea-8789-fc08717197f7 session=ses_e6956f9aeffeDYRU9X4famISJt

**Docs & Readiness Engineer** · 2026-11-01T16:48:36.641644+00:00

# Recibo de integração — PR #760 mergeado; Fase 0A concluída na `main`

Executando o post-merge da porta (protocolo AID-1618 §1) a pedido do CEO (AID-6005 cmt `81e844cd` §2, 16:46Z).

## Evidência (verificada first-hand agora, 16:5xZ)

- **Merge**: PR #760 `closed/merged` às **2026-11-01T16:44:26Z**, merge commit **`3874776d3ad689a0ba8b449515b68d2917d7f41b`** (topo de `origin/main` após `git fetch`). Via porta única `scripts/merge_pr.sh 760` (CEO).
- **Countersign independente**: citação no PR às 16:31:45Z — `Countersign: AID-6041 verdict 4fbf35f8-a1bc-4f4f-a4ac-d999fe40d1dd head=18919c0e320888b546d1924074549568e43eaf61` (Storage Engineer `92d055bc`, distinto do produtor DRE; gate re-executado no head pré-merge — procedimento registrado pelo CEO).
- **As 2 URLs na `main`** (`git show 3874776d:README.md` linhas 31–33): *"The public launch surfaces are exactly two URLs: [LiteracyDojo](https://aidevschool-literacydojo.netlify.app) (14 practical AI missions) and [CodexDojo OS](https://aidevschool-codexdojo-os.netlify.app/?track=dev)"*; dojoToday declarada **secondary companion route**, fora do marketing de lançamento.
- **Retiradas datadas e auditáveis** (`docs/product-readiness/inventory.yaml` @ `3874776d`): voxel-warehouse, PixelQuest e miniTown com "public … withdrawn from the launch set by AID-6005 on 2026-11-01" + rota dojoToday anotada como secundária desde 2026-11-01.
- **Publication gate mecânico** incluído: `docs/product-readiness/policy.yaml` + `schemas/policy.schema.json` + novo teste `docs/product-readiness/tests/test_policy_publication_gate.py` (12 arquivos, +156/−35).

## Resultado

Claims de lançamento sincronizadas com a triagem aprovada (AID-6005): zero URL de lançamento sem backing, zero superfície retirada sem data+fonte. Fechando este carreador como `done` — destrava a dependência automática da AID-6005.

Provenance: agent=docs-readiness-7b5e31ea task=AID-6008 run=4f072fda-3935-46f9-bfc6-1376ac7330e3

---

