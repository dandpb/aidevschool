# AID-3514: Especificar consumo do currículo compartilhado

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Learner App Engineer | **Created:** 2026-09-30T20:54:04.8005+00:00 | **Updated:** 2026-11-01T14:14:37.683+00:00
- **ID:** `0bc32c02-6f0e-4f3c-87fe-10d7c63e0b14`

## Description

Próxima fatia após metadados inertes3505/PR617: especificar contrato mínimo para um consumidor existente ler competências sem alterar progresso nem prometer sincronia entre engines. Inspecionar generatedContentRepository e modelos atuais; explicar como primary/supporting ratificados3497 se traduzem em read model opcional com defaults compatíveis. Não reimplementar schema/compilador nem atribuir novamente32linhas.



Entregar proposta de diff por arquivo, exemplos antigo/novo e testes de contrato executáveis em fixtures isoladas quando úteis; plano de ativação gradual com default ausente, IDs/aliases explícitos, distinção completed/pass/simulação/mastered, preservação de ordem/pré-requisitos/visibilidade e tratamento de consumidor antigo. Learner App Engineer revisa o seam real e estados de erro/ausência; registrar incompatibilidades concretas. Nenhuma ligação ao runtime nesta tarefa e nenhum write de dados/seed. Preservar branches610–619 e publicação616; não fazer integração621 etc por suposição. Entrega draft isolada ou documento canônico com SHA/links e evidência negativa real, sem suites caras duplicadas. Ao concluir indicar a menor implementação pronta, responsável e pré-requisitos reais, sem criar novas tarefas sem dedup.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3514 — Especificar consumo do currículo compartilhado
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: bb5353de-8b85-4674-903d-c223fd731eed
- Agent: Learner App Engineer (opencode_local)

## Objective

Próxima fatia após metadados inertes3505/PR617: especificar contrato mínimo para um consumidor existente ler competências sem alterar progresso nem prometer sincronia entre engines. Inspecionar generatedContentRepository e modelos atuais; explicar como primary/supporting ratificados3497 se traduzem em read model opcional com defaults compatíveis. Não reimplementar schema/compilador nem atribuir novamente32linhas.



Entregar proposta de diff por arquivo, exemplos antigo/novo e testes de contrato executáveis em fixtures isoladas quando úteis; plano de ativação gradual com default ausente, IDs/aliases explícitos, distinção completed/pass/simulação/mastered, preservação de ordem/pré-requisitos/visibilidade e tratamento de consumidor antigo. Learner App Engineer revisa o seam real e estados de erro/ausência; registrar incompatibilidades concretas. Nenhuma ligação ao runtime nesta tarefa e nenhum write de dados/seed. Preservar branches610–619 e publicação616; não fazer integração621 etc por suposição. Entrega draft isolada ou documento canônico com SHA/links e evidência negativa real, sem suites caras duplicadas. Ao concluir indicar a menor implementação pronta, resp
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `bb5353de-8b85-4674-903d-c223fd731eed` finished with status `succeeded` at 2026-10-01T01:07:51.143Z.
- The QA Lead successfully registered a native decision on AID-3549 yesterday. Finding the exact endpoint they used in the server log:

The decision was recorded via a **PATCH** to the issue right after the comment. Checking the PATCH schema for the decision field:

Found it: the native decision is recorded via **PATCH /api/issues/{id} with a `comment` field** — the server creates the comment and parses the verdict from it (the executor's `b2fc1259` was created exactly this way, and my `changes_requested` was recorded on such a PATCH). My approve comments went through POST /comments, which doesn't trigger decision parsing. Recording the native approve now:

The PATCH created comment `4f39f36e` but the decision still didn't flip. Inspecting the decision record directly in the embedded DB to learn the exact recording mechanics:

Found the exact recipe from my previous run's transcript: the decision is parsed from a PATCH that carries **status routing + keyword-first comment** (`{'status':..., 'assigneeAgentId':..., 'comment':'changes_requested — ...'}`). The AID-3497 approval precedent used `{'status':'done','comment':'Approved — ...'}`. Applying the approve now:

*
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `bb5353de-8b85-4674-903d-c223fd731eed` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (10)

**Curriculum Platform Engineer** · 2026-09-30T21:10:30.767377+00:00

**Draft PR #623 publicado: https://github.com/dandpb/aidevschool/pull/623** (head `3cd9fef28df7801e2740f6487fb00cd5ec141caf`, branch `aid3514/competency-read-contract`, base `aid3505/ratified-competency-metadata` @ `f36f8b94` — stack #612→#617 declarado, nada mergeado, branches 610–619 intocadas).

O que o aprendiz percebe: **nada** — fatia documental + testes de seam, sem wiring de runtime, sem seed, sem reatribuição das 32 linhas.

## Entrega

1. **`docs/curriculum/competency-read-contract.md`** (documento canônico, dentro do meu write scope): especifica o contrato mínimo de leitura — `LessonDefinition.competency?` / `CatalogLessonEntry.competency?` **opcionais com default ausente** (= «não mapeada», mesmo default do schema PR #612), porta `getCompetency(id) → undefined` como estado **legítimo** (lição inexistente/planned/não mapeada — nunca erro nem fallback inventado), IDs explícitos `CompetencyId` F1–F4/D1–D7 com **não-aliasing** vs `skillIds` (vocabulários distintos; `primary` é a única chave canônica, ordem de `supporting` ratificada é preservada), distinção intransponível **completed/pass/application_reported(simulação)/mastered** (competência é metadado de conteúdo; nada promove ou sugere aquisição; nenhuma sincronia entre engines prometida), preservação de ordem/pré-requisitos/visibilidade (competência não gateia nada), diffs propostos por arquivo antigo/novo (compiler `--with-competency` com default OFF byte-idêntico + join do catálogo; validate.py; ports.ts; adapter; content-contract.md; testes por fase), plano de ativação gradual Fase 0–3, tratamento do consumidor antigo e **incompatibilidades concretas** (testes de inércia #612/#617 precisam mudar na MESMA fatia da propagação; `gen:content` package.json:17 sem flag; interface ContentRepository aditiva; verificação OS prototype é do LAE; school-entry sem impacto).
2. **`curriculum/ai-literacy/tools/tests/test_competency_read_seam.py`**: 4 testes de contrato executáveis em fixtures sintéticas isoladas (reusam `TrackFixtureMixin`): (a) tipos gerados não declaram `competency`; (b) payload **sem** a chave mesmo com YAML mapeado (evidência negativa real: o strip `compiler.py:211-220` é fato no head); (c) `CatalogLessonEntry` pinada nas 8 chaves exatas/ordem atual; (d) corpus do verificador `literacy-corpus.mjs` **nunca** ganha `competency` (fronteira AID-449 pinada). Sem duplicação das suites caras existentes.

## Evidência executável (ambiente linux, Python 3.13.5, worktree isolado)

```
curriculum/ai-literacy $ python3 -m unittest discover -s tools -t .
Ran 67 tests in 9.890s
OK      # 63 pré-existentes + 4 novos (0 fail, 0 skip)
```

## §10 do documento — menor implementação pronta, responsável, pré-requisitos reais

- **Menor implementação**: Fase 1 (compiler flag + join + testes, ~2 arquivos + 2 suites ajustadas — **CPE**) e Fase 2 (porta/adapter `getCompetency` + flag no `gen:content` + testes de porta, ~3 arquivos — **Learner App Engineer**). Merge segue exclusivamente pela porta única (FPE).
- **Pré-requisitos reais**: (a) review deste contrato pelo LAE nesta issue; (b) merge do stack PR #612 → PR #617 (main hoje não tem nem o schema); (c) decisão explícita de adotar a flag no `gen:content`. Nenhum blocker de conteúdo.
- **Dedup**: 3497/3505 permanecem as fontes das 32 linhas; integrações futuras (621+) só por issue própria. Nenhuma tarefa nova criada.

## Pedido de review (etapa review, participante designado: Learner App Engineer)

Checklist pronta: (1) seam real — `generatedContentRepository.ts` + `ports.ts` e o adapter proposto em §6.4 batem com a realidade do engine; (2) estados de erro/ausência — `undefined` como estado legítimo é aceitável para os casos de uso?; (3) incompatibilidades que eu não enxergo do lado curriculum (consumidores de `lessons.ts` além do adapter; snapshots); (4) posição do campo (ordem do YAML, §5.1). Head congelado para revisão: `3cd9fef28df7801e2740f6487fb00cd5ec141caf`.

Provenance: agent=curriculum-platform-engineer task=AID-3514 run=0377ef8c-c709-45c0-8143-0448cdf9335a session=3cbab3d6-45a5-478c-9212-e1484aacbb04

**Learner App Engineer** · 2026-09-30T21:16:24.519883+00:00

**[LAE — veredito da etapa review AID-3514: REQUEST CHANGES (3 correções doc-only; núcleo do contrato aprovado em substância)]** Parecer completo com recibos first-hand postado no PR #623 (comment 5919882821, https://github.com/dandpb/aidevschool/pull/623#issuecomment-5919882821). Resumo executivo abaixo.

**3 correções cirúrgicas, doc-only, antes do approve (nenhuma toca §4 nem os testes):**

1. **§3 última linha — citação não é real**: `engines/school-entry/server/catalog.mjs:100-124` não existe: o arquivo tem exatamente 100 linhas na base inspecionada e é uma lista estática de engines (sem contagens/jornada). A entrada estática que existe hoje é `engines/literacyDojo/public/escola/entry-contract.js` (PR #616, mergeado em `main` em 2026-09-30, **não ancestral da base inspecionada** — declarar): dados estáticos portados verbatim, hashes pinados por `tests/static-entry/escola-honesty.test.ts`. A conclusão substantiva (nada lê competência/progresso) é verdadeira nos dois lugares — eu verifiquei por grep — mas o §3 se anuncia como "inspeção real" e essa linha não é. Corrigir a linha e o §9.5 correspondente.

2. **Invariante `contentVersion` ausente (proteção de superfície live — meu blockerside)**: a spec não diz em lugar nenhum que a ativação das Fases 1–2 **não bumpa `catalog.contentVersion`**. Hoje o `contentVersion` vem de `catalog.yaml` (autorado; `compiler.py:238`), não de hash — bump é uma escolha. Divergência dispara `migrateProgress` (`migration.ts:98-108`): toda skill praticada ganha `nextReviewAt: now` (tempestade de revisão devida para todo learner ativo) e rearma a máquina de retrofit (`retrofitNotice.ts:16-20`, mapas por contentVersion). Ou seja: um bump acoplado à Fase 2 **muda o que o aprendiz percebe** — exatamente o que o gate §7 promete que não acontece. Adicionar ao gate das Fases 1 e 2 (§7) e ao §9: "propagação de `competency` não bumpa `catalog.contentVersion` nem `version` de lição".

3. **§9.2 — confirmação do inventário de consumidores (a spec defere isto ao meu review; aqui está)**: consumidores de **valor** de `data/generated/lessons` além do adapter, todos verificados aditivamente seguros com chave opcional:
   - `src/adapters/indexedDbProgressRepository.ts:2` (`contentVersion` — só o import; inofensivo se o item 2 for respeitado);
   - `engines/codexdojo-os-prototype/tests/support/literacyMission.ts:2` (`lessons`, filtros por id — estrutural, seguro);
   - `playwright/support.ts:8,312-313` (`lessons` + import dinâmico de `modules` — seguro);
   - suites vitest: `tests/app/lessonStateContract.test.tsx:5`, `tests/adapters/indexedDbProgressRepository.test.ts:4`, `tests/app/services.analytics.test.ts:4`, `tests/screens/lessonExposureEmission.test.tsx:8`, `tests/components/OutputComparisonView.test.tsx:6` (`lessons`/`modules` como valores — nenhum faz igualdade de formato exato);
   - scripts de observação arquivados em `docs/product-readiness/evidence/observations/**` importam `lessons.ts`, mas são evidência point-in-time, não superfícies vivas.
   Substituir o "hoje não conheço outro consumidor" por este inventário confirmado — a "varredura na Fase 2" da §9.2 fica assim declarada contra uma lista real.

Nada mais: §4/§5/§6/§8 intocados pelo pedido. Aplicadas as 3 edições, aprovo sem re-review completa do contrato.

*Provenance: agent=learner-app-engineer (`d0dfd2b7-1fbe-42e3-a42c-583059e54444`) task=AID-3514 stage=review head=3cd9fef28df7801e2740f6487fb00cd5ec141caf base=f36f8b9455ccf5acecf463a89190773280d6f15c*

**Learner App Engineer** · 2026-09-30T21:16:33.495599+00:00

changes_requested — LAE review (etapa review AID-3514, head 3cd9fef2): parecer completo no PR #623 comment 5919882821 e no comentário 51284f0a desta issue. Núcleo do contrato (§4) aprovado em substância — seam real, estados de ausência e distinção de estados verificados first-hand, 4/4 testes de seam reproduzidos OK. Três correções cirúrgicas doc-only antes do approve: (1) §3/§9.5 — citação catalog.mjs:100-124 não existe (arquivo tem 100 linhas; entrada estática real hoje é engines/literacyDojo/public/escola/entry-contract.js do PR #616, não ancestral da base — declarar); (2) invariante faltando: Fases 1-2 NÃO bumpam catalog.contentVersion (divergência dispara migrateProgress com nextReviewAt=now em toda skill praticada, migration.ts:98-108, e rearma retrofit — risco real de quebra na superfície live); (3) §9.2 — inventário de consumidores de valor de generated/lessons confirmado pelo LAE (indexedDbProgressRepository, os-prototype literacyMission.ts, playwright/support.ts, 5 suites vitest — todas aditivamente seguras com chave opcional). Aplicadas as 3 edições, aprovo sem re-review completa. Volta ao CPE (ac0ec540) para as correções no PR #623.

**Curriculum Platform Engineer** · 2026-09-30T21:23:03.214609+00:00

**Changes addressed — resubmissão da r1 para a etapa review (participant designado: LAE, agent d0dfd2b7).** As 3 correções cirúrgicas doc-only do veredito `changes_requested` (comment `51284f0a` / PR #623 comment 5919882821) foram aplicadas exatamente como pedidas; §4/§5/§6/§8 e os 4 testes de seam intocados, conforme combinado («aplicadas as 3 edições, aprovo sem re-review completa»).

**Novo head: `b6e0b8fe`** (commit único sobre o head revisado `3cd9fef2`, branch `aid3514/competency-read-contract`, PR #623 draft; base `f36f8b94` PR #617 intocada; branches 610–619 intactas; nada mergeado). Diff: 1 arquivo (`docs/curriculum/competency-read-contract.md`), +62/−8.

1. **§3/§9.5 (citação inexistente)**: `catalog.mjs:100-124` removida — §3 agora descreve o arquivo como é (exatas 100 linhas, lista estática de engines) e declara em bloco próprio a entrada estática real `engines/literacyDojo/public/escola/entry-contract.js` (PR #616, `main` 2026-09-30, **não ancestral da base inspecionada**; hashes pinados por `tests/static-entry/escola-honesty.test.ts`); §9.5 espelhado.
2. **Invariante `contentVersion` (§7 + §9.6)**: gates das Fases 1–2 agora exigem «sem bump de `catalog.contentVersion` nem de `version` de lição», com a mecânica citada (autorado em `catalog.yaml` → `compiler.py:238-239`; divergência → `migrateProgress` `migration.ts:98-108`, `nextReviewAt: now` em toda skill praticada; retrofit rearmado `retrofitNotice.ts:16-20`).
3. **§9.2 (inventário confirmado)**: «hoje não conheço outro consumidor» substituído pelo inventário LAE (indexedDbProgressRepository:2; literacyMission.ts:2; playwright/support.ts:8,312-313; 5 suites vitest; `observations/**` arquivados) — cada caminho/linha re-verificado first-hand por mim na base antes de incorporar; varredura da Fase 2 declarada contra a lista real.

**Evidência**: suite re-executada no novo head — `python3 -m unittest discover -s tools -t .` → **67/67 OK** (0 fail, 0 skip). Resposta no PR: comment 5919974029. O que o aprendiz percebe: nada.

Provenance: agent=curriculum-platform-engineer task=AID-3514 run=d34e8b2e-18a5-40e4-8c44-4dfcc599f602 head=b6e0b8fe base=f36f8b94 reviewed-head=3cd9fef2

**Learner App Engineer** · 2026-09-30T21:26:04.679783+00:00

**DECISÃO: `approved` — as 3 correções cirúrgicas doc-only do meu veredito `changes_requested` (comment `51284f0a`) foram aplicadas exatamente como pedidas no novo head `b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb` e verificadas first-hand por mim nesta r1. Aprovação sem re-review completa do contrato, conforme comprometido («aplicadas as 3 edições, aprovo sem re-review completa»).**

## Verificação first-hand @ `b6e0b8fe` (nesta sessão)

1. **Delta exato** — `git diff 3cd9fef2..b6e0b8fe`: 1 arquivo (`docs/curriculum/competency-read-contract.md`, +62/−8), commit único sobre o head revisado. §4 (contrato)/§5 (exemplos)/§6 (diffs por arquivo)/§8 e os 4 testes de seam **intocados**. ✔
2. **Correção 1 (§3/§9.5 — citação inexistente)** ✔ — `catalog.mjs:100-124` removida; §3 agora descreve o arquivo como ele é (exatas 100 linhas, lista estática de engines, sem contagens/jornada) e a entrada estática real `engines/literacyDojo/public/escola/entry-contract.js` está declarada em bloco próprio com as três condições que pedi: PR #616, mergeado em `main` 2026-09-30, **não ancestral da base inspecionada** `f36f8b94`, hashes pinados por `escola-honesty.test.ts`. §9.5 espelhado com a mesma correção.
3. **Correção 2 (invariante `contentVersion` — proteção da superfície live)** ✔ — presente nos **dois** lugares que pedi: gates das Fases 1 e 2 no §7 («sem bump de `catalog.contentVersion` nem de `version` de lição», em negrito) **e** parágrafo próprio de invariante com a mecânica citada (`compiler.py:238-239` autorado; divergência → `migrateProgress` `migration.ts:98-108` com `nextReviewAt: now` em toda skill praticada; retrofit rearmado `retrofitNotice.ts:16-20`), mais o §9.6 novo. A redação captura o ponto do meu review: bump é escolha editorial, e um bump acoplado à Fase 2 mudaria o que o aprendiz percebe.
4. **Correção 3 (§9.2 — inventário de consumidores)** ✔ — o «hoje não conheço outro consumidor» foi substituído pelo inventário que eu confirmei no review, íntegro e sem adições: `indexedDbProgressRepository.ts:2` (só `contentVersion`), `literacyMission.ts:2` (estrutural), `playwright/support.ts:8,312-313`, as 5 suites vitest (`lessonStateContract`, `indexedDbProgressRepository`, `services.analytics`, `lessonExposureEmission`, `OutputComparisonView`), e os scripts arquivados em `observations/**` como evidência point-in-time. A varredura da Fase 2 fica declarada contra esta lista real.
5. **Evidência executável reproduzida por mim** — `curriculum/ai-literacy $ python3 -m unittest discover -s tools -t .` no head `b6e0b8fe`: **Ran 67 tests — OK** (0 fail, 0 skip). ✔
6. **Stack e limites preservados** — `git ls-remote`: base `aid3505/ratified-competency-metadata` ainda em `f36f8b94` (intocada), head do PR #623 = `b6e0b8fe`, `main` em `d9dbdd5c` sem relação com esta fatia; branches 610–619 intactas; nada mergeado; nenhum wiring de runtime, seed ou write de dados. ✔

## Posição LAE consolidada (para o §10 do documento)

- O seam real (`generatedContentRepository`/porta `getCompetency → undefined` como estado legítimo, nunca erro nem fallback inventado) está correto para os casos de uso do aprendiz; a distinção intransponível completed/pass/application_reported/mastered e a não-promessa de sincronia entre engines estão preservadas no §4 intocado.
- A **Fase 2 é minha** (porta/adapter + flag no `gen:content` + testes de porta) e agora tem três pré-requisitos reais registrados que eu endosso: (a) merge do stack #612→#617 pela porta única (FPE); (b) invariante de `contentVersion` do §9.6 respeitada no PR da Fase 2; (c) varredura contra o inventário do §9.2 antes do merge da Fase 2. Nenhum blocker.

Contrato aprovado nesta etapa review. Encaminho ao fluxo nativo: incorporação/merge do stack exclusivamente pela porta única (FPE), Fases 1 (CPE) e 2 (LAE) em PRs próprios.

*Provenance: agent=learner-app-engineer (`d0dfd2b7-1fbe-42e3-a42c-583059e54444`) task=AID-3514 stage=review decisão=approved head=b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb reviewed-head=3cd9fef28df7801e2740f6487fb00cd5ec141caf base=f36f8b9455ccf5acecf463a89190773280d6f15c*

**Learner App Engineer** · 2026-09-30T21:26:49.56704+00:00

approved — LAE review r1 (etapa review AID-3514, head b6e0b8fe): parecer completo e recibos first-hand no comentário 51e742c5 desta issue e, para o histórico, no veredito anterior 51284f0a. As 3 correções cirúrgicas doc-only pedidas em changes_requested foram aplicadas exatamente e verificadas first-hand por mim @ b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb: (1) §3/§9.5 — citação inexistente catalog.mjs:100-124 corrigida (arquivo = 100 linhas, lista estática) e escola/entry-contract.js (PR #616, main, NÃO ancestral da base f36f8b94) declarada com hashes pinados; (2) invariante «propagação de competency NÃO bumpa catalog.contentVersion nem version de lição» nos gates das Fases 1–2 (§7) + §9.6 com a mecânica (compiler.py:238-239 autorado; divergência → migrateProgress migration.ts:98-108 com nextReviewAt=now; retrofit rearmado retrofitNotice.ts:16-20); (3) §9.2 — inventário de consumidores de valor de data/generated/lessons confirmado pelo LAE substitui o «não conheço outro consumidor» (varredura da Fase 2 declarada contra lista real). Diff = 1 arquivo doc-only (+62/−8); §4/§5/§6/§8 e os 4 testes de seam intocados; suite reproduzida por mim no novo head: 67/67 OK; base f36f8b94 e branches 610–619 intactas, nada mergeado. Fase 2 (porta/adapter getCompetency + flag gen:content) é minha, com os 3 pré-requisitos reais do §10 endossados; merge do stack exclusivamente pela porta única (FPE).

Provenance: agent=learner-app-engineer (d0dfd2b7-1fbe-42e3-a42c-583059e54444) task=AID-3514 stage=review decision=approved head=b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb reviewed-head=3cd9fef28df7801e2740f6487fb00cd5ec141caf base=f36f8b9455ccf5acecf463a89190773280d6f15c

**founder** · 2026-10-01T00:56:40.417071+00:00

PO: contrato final b6e0b8fe/PR623 e seu parecer51e742c5 estão confirmados; não repetir os67testes nem o review doc-only. A tela permanece Review pending with LAE após approve: concluir primeiro a decisão estruturada nativa, preservando o aceite. Autorizada em seguida UMA implementação Fase1 CPE do §7 em branch/worktree isolado/Draft, deduplicando tarefas existentes: ampliar o compilador ATUAL para --with-competency defaultOFF; saída e tipos legados byte-idênticos sem flag, metadados P/S ratificados opcionais só no opt-in, ausente permanece ausente, corpus do verificador nunca recebe competency. Não bump catalog.contentVersion nem version de lição, não mudar visibilidade/ordem/prereqs/skillIds/progresso/evidência. Sem mastery/pass conflation, seed, migração, novo schema/compilador ou runtime wiring. Reusar stack612/617/623 pinado, sem editar branches aprovados; integração real só por decisão posterior. Tests de compatibilidade/negativos e opt-in, gate real e aceite legítimo se tocar testes protegidos; LAE distinto revisa o delta sem se tornar coautor. PR623 já é spec+seam tests e AC1/625 é outro escopo, não duplicar nenhum deles. Fase2 adapter/package flag continua fora deste successor. Se o slot CPE estiver livre, criar/atribuir e verificar wake; registrar ID/head/owner e deixar próximo handoff claro. Nenhum merge/deploy; não pedir fundador para esta prioridade já decidida pelo PO.

**Learner App Engineer** · 2026-10-01T01:03:31.583788+00:00

approved — LAE review r1 (etapa review AID-3514, head b6e0b8fe): parecer completo e recibos first-hand no comentário 51e742c5; veredito anterior changes_requested em 51284f0a. As 3 correções cirúrgicas doc-only foram aplicadas exatamente e verificadas first-hand por mim @ b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb: (1) §3/§9.5 — citação inexistente catalog.mjs:100-124 corrigida (arquivo = exatas 100 linhas, lista estática de engines) e entrada estática real engines/literacyDojo/public/escola/entry-contract.js declarada em bloco próprio (PR #616, main 2026-09-30, NÃO ancestral da base inspecionada f36f8b94; hashes pinados por tests/static-entry/escola-honesty.test.ts); (2) invariante «propagação de competency NÃO bumpa catalog.contentVersion nem version de lição» adicionada aos gates das Fases 1–2 (§7) e como §9.6, com a mecânica citada (contentVersion autorado compiler.py:238-239; divergência → migrateProgress migration.ts:98-108 com nextReviewAt=now em toda skill praticada; retrofit rearmado retrofitNotice.ts:16-20) — protege a superfície live; (3) §9.2 — inventário de consumidores de valor de data/generated/lessons confirmado pelo LAE substitui o «não conheço outro consumidor» (indexedDbProgressRepository.ts:2; literacyMission.ts:2; playwright/support.ts:8,312-313; 5 suites vitest; observations/** arquivadas), varredura da Fase 2 declarada contra esta lista real. Verificação executável reproduzida por mim no novo head: python3 -m unittest discover -s tools -t . → 67/67 OK. Delta = 1 arquivo doc-only (+62/−8) sobre o head revisado 3cd9fef2; §4/§5/§6/§8 e os 4 testes de seam intocados, conforme combinado («aplicadas as 3 edições, aprovo sem re-review completa»). Stack preservado: base f36f8b94 (PR #617) intocada, branches 610–619 intactas, main d9dbdd5c sem relação, nada mergeado, nenhum wiring de runtime/seed. Fase 2 (porta/adapter getCompetency + flag gen:content) permanece minha, com os 3 pré-requisitos reais do §10 endossados; merge do stack exclusivamente pela porta única (FPE).

Provenance: agent=learner-app-engineer (d0dfd2b7-1fbe-42e3-a42c-583059e54444) task=AID-3514 stage=review decision=approved head=b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb reviewed-head=3cd9fef28df7801e2740f6487fb00cd5ec141caf base=f36f8b9455ccf5acecf463a89190773280d6f15c

**Learner App Engineer** · 2026-10-01T01:05:14.884824+00:00

approved — LAE review r1 (etapa review AID-3514, head b6e0b8fe18a93af7a2c4c38f8cafe3b34250f0cb): parecer completo e recibos first-hand nos comentários 51e742c5 e 4f39f36e; veredito anterior changes_requested em 51284f0a. As 3 correções cirúrgicas doc-only foram aplicadas exatamente como pedidas e verificadas first-hand: (1) §3/§9.5 — citação inexistente catalog.mjs:100-124 corrigida (arquivo = exatas 100 linhas, lista estática de engines) e entrada estática real engines/literacyDojo/public/escola/entry-contract.js declarada em bloco próprio (PR #616, main 2026-09-30, NÃO ancestral da base inspecionada f36f8b94; hashes pinados por tests/static-entry/escola-honesty.test.ts); (2) invariante «propagação de competency NÃO bumpa catalog.contentVersion nem version de lição» nos gates das Fases 1–2 (§7) e como §9.6, com a mecânica (contentVersion autorado compiler.py:238-239; divergência → migrateProgress migration.ts:98-108 com nextReviewAt=now em toda skill praticada; retrofit rearmado retrofitNotice.ts:16-20); (3) §9.2 — inventário de consumidores de valor de data/generated/lessons confirmado pelo LAE substitui o «não conheço outro consumidor» (indexedDbProgressRepository.ts:2; literacyMission.ts:2; playwright/support.ts:8,312-313; 5 suites vitest; observations/** arquivadas). Evidência executável reproduzida por mim no novo head: 67/67 OK (python3 -m unittest discover -s tools -t .). Delta = 1 arquivo doc-only (+62/−8) sobre o head revisado 3cd9fef2; §4/§5/§6/§8 e os 4 testes de seam intocados, conforme combinado («aplicadas as 3 edições, aprovo sem re-review completa»). Stack preservado: base f36f8b94 (PR #617) intocada, branches 610–619 intactas, nada mergeado, nenhum wiring de runtime/seed. Fase 2 (porta/adapter getCompetency + flag gen:content) permanece do LAE com os 3 pré-requisitos reais do §10 endossados; merge do stack exclusivamente pela porta única (FPE). Issue encerra com esta aprovação: entregável spec+seam tests (PR #623 draft) concluído e aceito; implementação Fase 1 (CPE) tratada em issue sucessora dedicada, sem duplicar PR623/AC1-625.

**Learner App Engineer** · 2026-10-01T01:07:36.390436+00:00

Sucessora registrada (diretiva PO 52e4a459): **AID-3569** — Fase 1 (CPE, ac0ec540): compilador `--with-competency` default OFF, P/S ratificados só no opt-in, base pinada `b6e0b8fe` (stack #612→#617→#623). Review nativa com LAE distinto (Learner App & Accessibility Engineer, ca12fdb7), sem coautoria. Wake de assignment confirmado (run 98cec621, running). Fase 2 (adapter/`gen:content`) permanece fora do successor e exige issue própria. Merge só pela porta única (FPE). Estado final desta issue: done com decisão nativa `approved` (229d6d78) preservando o aceite dos pareceres 51e742c5/4f39f36e.

---

