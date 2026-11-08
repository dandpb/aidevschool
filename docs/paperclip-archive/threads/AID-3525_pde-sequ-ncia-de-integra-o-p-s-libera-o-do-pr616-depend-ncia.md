# AID-3525: PDE — sequência de integração pós-liberação do PR616: dependências, paralelismo, gates e rollback por etapa

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Product Delivery Engineer | **Created:** 2026-09-30T20:57:56.196237+00:00 | **Updated:** 2026-09-30T21:57:38.895+00:00
- **ID:** `6aec9608-3c03-4c6d-ad16-3eae6b87b556`

## Description

Lote operacional founder (AID-3307 comment 4e9668b1, frente 9). Dono: Product Delivery Engineer.

**Entregável:** sequência de integração APÓS a liberação do #616: dependências dos artefatos aceitos, o que pode correr em paralelo, handoffs, gates e rollback por etapa. Ordem verificável + próximos passos por dono, distinguindo laboratório opcional de jornada principal.

**Proibido:** duplicar release/preflight de FPE/PRE; liberar publicação (não é seu gate).

## Document `Sequência de integração pós-liberação PR #616 — dependências, paralelismo, gates e rollback (r2)` (2026-09-30)

# Sequência de integração pós-liberação do PR #616 (AID-3525, frente 9 do lote AID-3307/4e9668b1) — r2

**Produtor:** Product Delivery Engineer (0944e5c6). **Escopo:** ordem verificável do que acontece DEPOIS da liberação do #616 — dependências dos artefatos aceitos, paralelismo, handoffs, gates e rollback por etapa. **Fora do meu gate:** release/preflight de FPE/PRE e publicação (não duplico, não libero).

## Delta r1 → r2 (fonte: revisão documental do founder, comentário `1735b5bd` 21:56:09Z)

1. **Prontidão técnica ≠ autorização de integração/publicação.** A autorização explícita deste ciclo cobre APENAS a publicação do PR #616 na hospedagem existente. **Não** é autorização automática para promover os candidatos congelados **#617/#619**. S3/S4 e os próximos passos foram reescritos como **candidatos aguardando decisão ordinária de priorização/liberação do PO/CEO** — heads preservados, sem executar merge e sem acordar FPE para isso.
2. **Correção de atribuição de produtor do PR #618.** A revisão AID-3512 verificou o **patch externo** no head `7d2d6e6c…`, mas NÃO verificou que "Learner App" seja seu produtor. A r1 atribuía `d0dfd2b7` como produtor — **removido**. Proveniência real fica registrada como **requisito da porta existente**, não demonstrada; sem inventar sessão/trailer, sem contatar o autor.
3. Publicação do #616 segue **exclusivamente no carrier AID-3453 com FPE/PRE** (inalterado desde r1; reafirmado).

## 0. Estado verificado no pin (2026-09-30; estados r1 first-hand ~21:0xZ, delta de escopo 21:56Z)

| Objeto | Estado verificado | Fonte |
|---|---|---|
| main | `d9dbdd5c504ef76a42d3f7944392dccee3eb6351` = merge --no-ff do PR #616 @ `e95611da…`, 20:54:18Z; countersign-gate PASS na porta (QA `5917698300` 18:56:37Z + FSE `5370566447`) | GitHub API |
| Publicação #616 | staging+CI prontos no pin; deploy BLOQUEADO: `NETLIFY_AUTH_TOKEN` ausente; caminho definido em `59d0bf87` (PRE verifica sessão de deploy autenticada existente; sem procurar tokens). **Única autorização vigente: publicar #616 na hospedagem existente (20:44:56Z)** — carrier AID-3453, FPE/PRE | AID-3453 `a631ebec`/`59d0bf87`; founder `1735b5bd` |
| PR #617 (AID-3505 done) | **candidato congelado**: draft, head `f36f8b9455ccf5acecf463a89190773280d6f15c`, 33 arquivos (32 YAML + 1 teste), aditivo/inerto, mergeable=True sobre main atual; countersign QA GH `5919125318` @20:26:41Z válido no head (countersigner `ca6a3f95` ≠ produtor `ac0ec540`); pré-voo do gate PASS | GitHub + AID-3505 |
| PR #619 (AID-3506 done) | **candidato congelado**: draft, head `7259dbc5a9eb2347f54f7b4c63efef663c210ded`, 21 arquivos +1199/−0; Approved por Verifier & Evidence (`5858f65a` @20:15Z, provenance `session` corrigida e re-verificada) | GitHub + AID-3506 |
| PR #618 (dojoToday) | patch **externo** no head `7d2d6e6cf7f76e0a423daca57b6f9d8584429838`, 1 arquivo +6/−4 `engines/dojoToday/src/main.ts`; revisão a11y AID-3512 (verificou o patch, **não a autoria**) recomenda APPROVE (21:02Z); CI `36769289857` success 20:14:58Z; **proveniência real do produtor NÃO demonstrada** — requisito em aberto da porta existente (countersign check `36769289892`) | GitHub + AID-3512 + founder `1735b5bd` |
| Overlap #617 ∩ #619 | ∅ (files API) — textualmente independentes; ordem entre eles é pedagógica/de rastreabilidade, não técnica | files API |
| CPE | AID-3457 (mapear currículo/progresso) `in_review`; AID-3514 (especificar consumo do currículo compartilhado) `in_progress`, sem comentários ainda | API |
| QA | AID-3517 (aceite público #616) `in_progress` — casos prontos, executa 1x só com URL/build publicada real; AID-3459 (verificação por fatias) `blocked` | API |

## 1. Jornada principal — cadeia da escola única (ordem verificável)

> **Regra de leitura r2:** "Prontidão" = gates técnicos satisfeitos no head pinado. "Autorização" = decisão ordinária de priorização/liberação do PO/CEO. Nenhuma etapa de integração abaixo é auto-executável por prontidão; as que dependem de merge em main listam explicitamente a decisão pendente.

| Etapa | O quê | Dono | Gate de entrada | Gate de saída | Rollback da etapa |
|---|---|---|---|---|---|
| **S1. Publicar pin #616** | Deploy Netlify de `d9dbdd5c` em aidevschool-literacydojo.netlify.app/escola/ | **FPE** `fa8130d5` (onda AID-3453), apoio **PRE** `8c58cf6e` | Autorização founder 20:44:56Z (só #616, hospedagem existente, sem custos novos) ✅; staging+CI no pin ✅; bloqueio atual: auth Netlify (caminho `59d0bf87`) | URL pública servindo /escola/ no build do pin + recibo | Redeploy da versão anterior pela recuperação existente do site (pré-condição da autorização); staging preservado é o artefato de rollback |
| **S2. Aceite público QA** | Executar 1x a matriz executável de AID-3517 na superfície publicada | **QA** `ca6a3f95` | S1 concluída (URL/build real) — **hoje não** | Matriz executada com resultados + veredito | N/A (verificação, sem mutação) |
| **S3. [CANDIDATO] Merge #617 (metadados 32 lições)** | Quando autorizado: porta única out-of-draft → merge | Porta única **FPE**, **mediante decisão ordinária PO/CEO** (não acordar FPE antes disso); produção CPE `ac0ec540`; countersign QA `ca6a3f95` já publicado | Prontidão ✅ (mergeable=True; countersign @`f36f8b94`; se rebase/re-pin mudar o head, re-executar countersign no head final). **Autorização: PENDENTE** | merge commit pinado + gate re-verificado | Revert único do commit de merge: aditivo/inerte (+317/−0, só YAML + teste próprio `test_ratified_competency_metadata.py`), zero superfície runtime |
| **S4. [CANDIDATO] Merge #619 (práticas tp-c01/tp-d01)** | Quando autorizado: porta única, após S3 | Porta única **FPE mediante decisão PO/CEO**; produção CCE `93e26ea9`; approval V&E `616b5f9b` registrada | Prontidão: S3 merged (ordem pedagógica; sem dependência técnica — overlap ∅), out-of-draft, CI verde, provenance corrigida ✅. **Autorização: PENDENTE** | merge commit pinado + gate | Revert único: +1199/−0, só conteúdo novo em `curriculum/praticas-transferencia/` |
| **S5. [APÓS S3] Consumo do currículo** | Spec AID-3514 → implementação (scaffolding/schema opcional esboçado no draft #612) | **CPE** `ac0ec540`; revisão independente | S3 em main (contrato materializado) + spec aceita; compatibilidade: defaults de schema, **nunca rodar seed do ZAI em instâncias existentes** (`lessonProgress.deleteMany()` apaga progresso) | fatia compatível revisada + countersign | Campos opcionais/scaffolding → remoção limpa sem migração destrutiva |
| **S6. [APÓS S3] Decisão de mapeamento de progresso** | Fechar review AID-3457 (crosswalk l16/compat) | **CPE** + decisão CEO quando houver escolha de contrato | S3; insumo Engine Systems (frente 6) quando existir | decisão registrada com blockers nomeados | N/A (nível decisão) |
| **S7. [APÓS S3/S4] Verificação por fatias** | AID-3459 reavaliar por fatia caída em main | **QA** `ca6a3f95` | S3/S4 merged | veredito por fatia vs RC-1..RC-6 | N/A |

**Dependências duras (grafo mínimo):** `S1 → S2`; `S3 → S5, S6, S7(parcial)`; `S3 → S4` (ordem escolhida); `S4 → S7(parcial)`. S1 é independente de S3/S4 (deploy é do pin `d9dbdd5c`; metadados/práticas não são pré-requisito da publicação autorizada). **S3/S4 só abrem com decisão ordinária PO/CEO.**

## 2. Paralelismo real — o que pode correr JÁ (sem nova autorização)

1. **S1** (FPE/PRE, no carrier AID-3453): destravar auth Netlify pelo caminho `59d0bf87` — não bloqueia e não é bloqueado por S3/S4.
2. **AID-3514** (CPE): spec contra a matriz r3 ratificada (AID-3497) ANTES de qualquer merge; implementação depende de S3.
3. **AID-3517** (QA): preparar casos/resultado esperado agora; execução única só após S1.
4. **PR #618** (engine distinta, fora da cadeia da escola): pendência da porta = **proveniência real do produtor demonstrada** (countersign check `36769289892`); revisão a11y AID-3512 já recomenda approve. Sem atribuir autoria a papel, sem contatar autor.
5. **Candidatos #617/#619**: nada a executar agora — heads preservados; qualquer movimentação aguarda decisão ordinária de priorização/liberação do PO/CEO.

## 3. Laboratório opcional (paralelo, fora da jornada principal — não bloqueia entrega)

- **PR #618** (acima): paralelo seguro, mas entrega de engine separada — não é etapa da escola; merge também sujeito à porta existente com proveniência demonstrada.
- Matriz de testes de migração/compatibilidade progresso legado ↔ contrato unificado (Engine Systems, frente 6): consome S3; insumo de S6.
- AID-3278 Fase1 v2.1 docs-only (Platform & CI, frente 4); AID-2775 PLAN ONLY (Engine Hardening, frente 5); inventário storage (frente 7) — independentes da cadeia crítica.

## 4. Handoffs (quem entrega o quê para quem)

- **FPE → QA**: URL/build publicada do pin (destrava execução única de AID-3517).
- **PO/CEO → FPE (porta)**: decisão ordinária de priorização/liberação para #617 (e depois #619) — só então main recebe metadados e destrava implementação AID-3514 e fechamento AID-3457.
- **QA → Docs & Readiness** (`7b5e31ea`, frente 3): resultados do aceite público alimentam o guia operacional (itens marcados "depende de URL publicada").
- **Merges S3/S4 (quando autorizados) → Verifier & Evidence** (`616b5f9b`, frente 2): heads finais + merge commits entram no índice de proveniência (distinção local/draft/integrado/publicado).

## 5. Próximos passos por dono (verificáveis)

| Dono | Ação | Verificação de concluído |
|---|---|---|
| PO/CEO | Decisão ordinária de priorização/liberação dos candidatos #617/#619 (quando desejado) | decisão registrada no carrier ordinário |
| PRE `8c58cf6e` | Verificar existência de sessão/ferramenta de deploy legitimamente autenticada (site correto); se ausente em todos os caminhos autorizados, registrar login/intervenção exata + link oficial + checks pendentes | comentário em AID-3453 com o registro ou o deploy executado |
| FPE `fa8130d5` | Publicar pin S1 quando auth resolver (carrier AID-3453). S3/S4: **aguardar decisão PO/CEO**; quando autorizado, porta única com re-pin/countersign no head final se head mudar | URL publicada; (se autorizado) merge commits pinados + gate verde |
| QA `ca6a3f95` | AID-3517: casos prontos, executar 1x pós-URL; AID-3459: reavaliar após S3/S4 (se autorizados) | matriz executada + vereditos por fatia |
| CPE `ac0ec540` | AID-3514 spec vs matriz r3; AID-3457 fechar review; implementação só pós-S3 | spec aceita / decisão registrada |
| PR #618 (via porta existente) | Demonstrar proveniência real do produtor (countersign check `36769289892`); revisão a11y AID-3512 já recomenda approve. **Sem atribuir autoria a papel, sem inventar sessão/trailer, sem contatar o autor** | pendência resolvida no PR |
| Docs `7b5e31ea` | Guia operacional com marcadores de dependência de URL | texto utilizável + lacunas com dono |

## 6. Regras de rollback (resumo operacional — inalterado na substância)

- **main**: todo estágio entra por merge --no-ff pinado → rollback é sempre um revert único do merge commit correspondente (sem force-push, sem rebase de main).
- **Deploy**: recuperação da versão anterior pela ferramenta existente do site (pré-condição declarada da autorização); staging do pin preservado como artefato de retorno.
- **Conteúdo curricular (S3/S4)**: aditivo/inerte por construção — revert sem impacto runtime; teste próprio do #617 guarda a fidelidade 32/32.
- **Consumo (S5)**: campos opcionais/scaffolding; proibido seed em instâncias existentes (risco `deleteMany`); rollback = remoção limpa.

---
*r2 produzida no heartbeat de 2026-09-30 (~21:5xZ) em resposta à revisão documental do founder (comentário `1735b5bd`, 21:56:09Z): separação prontidão×autorização, candidatos #617/#619 congelados aguardando decisão ordinária PO/CEO, atribuição de produtor do #618 corrigida (proveniência real não demonstrada = requisito da porta existente). Estados técnicos da r1 verificados first-hand ~21:0xZ (GitHub API + Paperclip API). Sem novo filho, sem preflight, sem código/configuração; publicação #616 exclusivamente no carrier AID-3453 com FPE/PRE.*

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3525 — PDE — sequência de integração pós-liberação do PR616: dependências, paralelismo, gates e rollback por etapa
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: ff35945d-57c5-499c-a9d9-3246bcaaf3a4
- Agent: Product Delivery Engineer (opencode_local)

## Objective

Lote operacional founder (AID-3307 comment 4e9668b1, frente 9). Dono: Product Delivery Engineer.

**Entregável:** sequência de integração APÓS a liberação do #616: dependências dos artefatos aceitos, o que pode correr em paralelo, handoffs, gates e rollback por etapa. Ordem verificável + próximos passos por dono, distinguindo laboratório opcional de jornada principal.

**Proibido:** duplicar release/preflight de FPE/PRE; liberar publicação (não é seu gate).

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `ff35945d-57c5-499c-a9d9-3246bcaaf3a4` finished with status `succeeded` at 2026-09-30T21:57:44.757Z.
- Founder comment requires a documentary r2: separate technical readiness from release authorization for #617/#619, and fix PR#618 producer attribution. Updating the document now.

r2 entregue e AID-3525 re-fechada (`done`, 21:57Z).

**Delta aplicado ao documento `sequencia-integracao-pos-616`** (rev 21:57:26Z, mesma key):

1. **Prontidão × autorização separadas**: S3 (#617) e S4 (#619) marcados **[CANDIDATO]** — heads preservados (`f36f8b94`/`7259dbc5`), promoção condicionada à **decisão ordinária PO/CEO**; próximos passos do FPE reescritos para aguardar a decisão (não acordar FPE). Única autorização vigente: publicação do #616 (carrier AID-3453, FPE/PRE).
2. **PR #618**: atribuição de produtor "Learner App" removida; AID-3512 verificou o patch externo no head `7d2d6e6c`, não a autoria — **proveniência real não demonstrada** registrada como requisito da porta existente (`36769289892`); sem contatar autor, sem inventar sessão/trailer.
3. Sequência técnica, grafo de dependências e rollback por etapa mantidos intactos.

Recibo no comentário `c2660ea7` com fontes (`1735b5bd`). Sem novo filho, sem preflight, sem código/configuração.

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `ff35945d-57c5-499c-a9d9-3246bcaaf3a4` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (3)

**Product Delivery Engineer** · 2026-09-30T21:07:56.818516+00:00

# Entregável entregue — sequência de integração pós-liberação do PR #616 (r1)

Documento completo em **`sequencia-integracao-pos-616`** (rev 21:07:41Z) nesta issue, com todos os estados verificados first-hand (GitHub API + Paperclip API) no heartbeat de 2026-09-30 ~21:0xZ.

## Estado-base verificado

- **#616 mergeado**: main @ `d9dbdd5c50` (merge --no-ff de `e95611da`, 20:54:18Z), countersign-gate PASS na porta (QA `5917698300` + FSE `5370566447`).
- **Publicação BLOQUEADA** em `NETLIFY_AUTH_TOKEN` (staging+CI prontos no pin); caminho já definido pelo founder em `59d0bf87` (21:00Z): PRE checa sessão de deploy autenticada existente; sem procurar tokens; AID-3517 aguarda URL real.
- **#617** (metadados 32 lições, AID-3505 done): draft, head `f36f8b94`, mergeable=True, countersign QA `5919125318` válido no head atual.
- **#619** (práticas tp-c01/tp-d01, AID-3506 done): draft, head `7259dbc5`, Approved V&E (`5858f65a`), provenance corrigida.
- **#618** (dojoToday a11y): revisão AID-3512 recomenda approve; falta proveniência do countersign check `36769289892`.
- Overlap de arquivos #617∩#619 = **∅** (verificado) — ordem entre eles é pedagógica, não técnica.

## Sequência (jornada principal)

**S1** publicar pin (FPE/PRE) → **S2** aceite público QA (AID-3517, execução única pós-URL) ‖ **S3** merge #617 pela porta única (FPE; re-countersign se head mudar) → **S4** merge #619 → **S5** consumo do currículo (CPE AID-3514; implementação pós-S3, seed ZAI proibida em instâncias existentes) ‖ **S6** fechar AID-3457 (decisão) ‖ **S7** AID-3459 reavaliar por fatia.

**Paralelo imediato:** S1, S3, #618 (engine distinta), spec AID-3514 e casos de AID-3517 não esperam uns pelos outros. **Laboratório opcional** (fora da cadeia): #618, matriz de migração Engine Systems (frente 6), AID-3278 fase 1, AID-2775 plan-only, storage (frente 7).

**Rollback por etapa:** cada estágio entra por merge --no-ff pinado → revert único; deploy volta pela recuperação existente do site (pré-condição da autorização); S3/S4 são aditivos/inertes (revert sem impacto runtime); S5 é scaffolding removível.

## Papéis que ficam dependentes (motivo exato)

- **QA/AID-3517** — espera S1 (URL/build publicada real; instrução founder `59d0bf87`).
- **CPE/AID-3514 implementação + AID-3457 decisão final** — esperam S3 (metadados em main); a spec pode avançar agora.
- **QA/AID-3459** — reavaliação por fatia espera S3/S4.

Limites respeitados: não dupliquei release/preflight de FPE/PRE, não liberei publicação, não criei tarefa de publicação paralela, não toquei em PRs/branches (verificação somente leitura + documento). Disposição: **done** (entregável documental completo; atualizações futuras = nova revisão do doc com re-pin de heads).

**founder** · 2026-09-30T21:56:09.201153+00:00

Revisão documental delimitada do seu artefato sequencia-integracao-pos-616: antes de reuso, separar prontidão técnica de autorização de integração/publicação. A autorização explícita já confirmada neste ciclo cobre a publicação do PR616 na hospedagem existente; não é autorização automática para promover os candidatos congelados617/619. Preserve os heads e liste esses passos como candidatos aguardando a decisão ordinária de priorização/liberação do PO/CEO, sem executar merge ou despertar FPE para isso.



Corrija também a atribuição de produtor do PR618: nossa revisão3512 verificou o patch externo no head7d2d6e6cf7f76e0a423daca57b6f9d8584429838, mas não verificou que Learner App seja seu produtor. Não atribuir proveniência a esse papel, não inventar sessão/trailer e não contatar o autor. Registre a proveniência real ainda não demonstrada como requisito da porta existente.



Entregue uma revisão curta do mesmo documento, com delta e fontes; mantenha a sequência técnica útil, sem novo filho, sem novo preflight, sem código/configuração. Publicação616 segue exclusivamente no carrier3453 com FPE/PRE. Respeite403/409/422; não mude papel/owner para recuperar escrita negada.

**Product Delivery Engineer** · 2026-09-30T21:57:36.150684+00:00

# r2 entregue — revisão documental aplicada ao `sequencia-integracao-pos-616` (resposta ao comentário `1735b5bd`, 21:56:09Z)

## Delta r1 → r2 (com fontes)

1. **Prontidão técnica × autorização separadas** (fonte: `1735b5bd`): S3 (#617) e S4 (#619) agora marcados **[CANDIDATO]** — prontidão verificada (mergeable, countersign QA `5919125318`, approval V&E `5858f65a`) permanece registrada, mas a promoção depende de **decisão ordinária de priorização/liberação do PO/CEO**. Heads preservados (`f36f8b94…`/`7259dbc5…`); sem executar merge; **próximos passos do FPE reescritos para aguardar a decisão — não acordar FPE para isso**. A única autorização vigente segue sendo a publicação do #616 na hospedagem existente (20:44:56Z, carrier AID-3453).
2. **Produtor do PR #618 desatribuído** (fonte: `1735b5bd` + AID-3512): a revisão 3512 verificou o **patch externo** no head `7d2d6e6c…` e recomenda approve, mas **não verificou autoria**. Removi a atribuição "produtor Learner App `d0dfd2b7`" da r1; registrei **"proveniência real ainda não demonstrada"** como requisito em aberto da porta existente (countersign check `36769289892`). Sem inventar sessão/trailer, sem contatar o autor.
3. **Publicação #616**: reafirmado exclusiva do carrier AID-3453 com FPE/PRE (já estava assim na r1).

## Inalterado (a sequência técnica permanece útil)

Grafo de dependências (S1→S2; S3→S4/S5/S6/S7), paralelismo imediato (S1 no carrier 3453, spec AID-3514 vs matriz r3, casos AID-3517, pendência #618), rollback por etapa (revert único de merge --no-ff; recuperação de deploy pela ferramenta existente; S3/S4 aditivos/inertes; S5 scaffolding removível, seed ZAI proibida em instâncias existentes).

Sem novo filho, sem preflight, sem código/configuração. Documento atualizado na mesma key (rev 21:57:26Z). Disposição: **done**.

---

