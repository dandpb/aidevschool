# AID-3457: Mapear currículo e progresso compartilhados

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Curriculum Platform Engineer | **Created:** 2026-09-30T12:05:24.830301+00:00 | **Updated:** 2026-11-01T14:12:36.773+00:00
- **ID:** `ba3e53ab-e3d2-4a0a-83c2-53a99a6c19f7`

## Description

Filha da frente de integração de AID-3453. Base: PR #610 (draft) — spec R6 e plan.md (fatia vertical 1). Pré-requisito: plano aprovado (request\_confirmation na issue pai). A parte bindings l25–l32 pode adiantar; fusões de conteúdo dependem da matriz r2 da frente CCE (AID-3456).

## Entregas

1. `engines/codexdojo-os-prototype/config/mission-bindings.yaml`: bindings l25–l32 no track `ai-pratica` (hoje 41 bindings cobrem só l01–l24) mantendo contrato atual (runtime literacyDojo, evidence literacy-evidence v1, verifierRequired).
2. Campo `competency:` opcional (F/D ids da spec) em catalog.yaml/mission-bindings + propagação em `learner/substrate/mission_catalog*.py` com teste novo (schema v1 não quebra; read models regenerados com `python3 -m learner.substrate`).
3. Se contratos produto-facing mudarem: atualizar `engines/codexDojo/ecosystem/MANIFEST.md` no mesmo change.
4. PR draft próprio (branch limpa/isolada), revisão independente; merge só pela porta única `scripts/merge_pr.sh` com countersign.

## Prova (critério de pronto)

* `python3 -m learner.substrate` valida e views regeneradas sem erro (missões 41→49).
* `python3 -m pytest learner/substrate/tests -q` verde.
* `cd engines/literacyDojo && npm run gen:content && npm run lint && npm run test && npm run build` verde.
* Validate do YAML canônico de curriculum/ai-literacy verde com campo novo.

## Limites

Não mover o filtro `ia_pratica` para o compilador (decisão AID-3453: continua no adaptador literacyDojo). Não tocar estado learner/mastered. Não editar read models gerados à mão. IDs e progresso preservados.

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3457 — Mapear currículo e progresso compartilhados
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 2d9cab4a-e0c3-4006-beef-7d89407cc509
- Agent: Curriculum Platform Engineer (opencode_local)

## Objective

Filha da frente de integração de AID-3453. Base: PR #610 (draft) — spec R6 e plan.md (fatia vertical 1). Pré-requisito: plano aprovado (request\_confirmation na issue pai). A parte bindings l25–l32 pode adiantar; fusões de conteúdo dependem da matriz r2 da frente CCE (AID-3456).

## Entregas

1. `engines/codexdojo-os-prototype/config/mission-bindings.yaml`: bindings l25–l32 no track `ai-pratica` (hoje 41 bindings cobrem só l01–l24) mantendo contrato atual (runtime literacyDojo, evidence literacy-evidence v1, verifierRequired).
2. Campo `competency:` opcional (F/D ids da spec) em catalog.yaml/mission-bindings + propagação em `learner/substrate/mission_catalog*.py` com teste novo (schema v1 não quebra; read models regenerados com `python3 -m learner.substrate`).
3. Se contratos produto-facing mudarem: atualizar `engines/codexDojo/ecosystem/MANIFEST.md` no mesmo change.
4. PR draft próprio (branch limpa/isolada), revisão independente; merge só pela porta única `scripts/merge_pr.sh` com countersign.

## Prova (critério de pronto)

* `python3 -m learner.substrate` valida e views regeneradas sem erro (missões 41→49).
* `python3 -m pytest learner/substrate/tests -q` ve
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `2d9cab4a-e0c3-4006-beef-7d89407cc509` finished with status `succeeded` at 2026-10-17T16:15:18.766Z.
- Wake acknowledged: AID-3457 is `done` — crosswalk + 40 bindings (23 ai-pratica + 17 dev) merged via PR #657. Verifying first-hand and checking my open PRs for residual coherence before the final ack:

PR #611 (audit+crosswalk) **merged**, #623 and #659 merged; but PR #657 is the mastery-F1 fix, not bindings. Verifying main's actual binding count and my pin tests' coherence first-hand:

Verified first-hand: main = **40 bindings (23 ai-pratica + 17 dev)** and my pin test was consciously updated to `40` on main — coherent. Posting the final acknowledgment:

Heartbeat complete. Final disposition: **done** (AID-3457, confirmed).

**Completion verified first-hand:**
- Main: **40 bindings = 23 ai-pratica + 17 dev**, with my pin tests consciously updated to `40` on main — audit trail coherent.
- This front's slices all landed: #611 (audit + crosswalk + 13 pins) merged, #623 (read contract r2) merged, #659 (`competency-map.ts`) merged, #612 (schema) merged earlier; #634/#613 preserved as superseded/historical records.
- One minor trail note posted: the closing comment cites PR #657 for the bindings, but #657 is the mastery-F1 fix — the bindings landed via #611's merge +
[truncated]

## Files / Routes Touched

- `scripts/merge_pr.sh`

## Commands Run

- Heartbeat run `2d9cab4a-e0c3-4006-beef-7d89407cc509` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Interaction [request_confirmation]  (expired)

## Comments (31)

**founder** · 2026-09-30T12:09:10.223767+00:00

CORREÇÃO BLOQUEANTE DA PREMISSA: suspender implementação de novos bindings l25–l32 e meta 41→49. A revisão independente na mesma base 1975e2c confirma 39 bindings existentes (23 IA + 16 Dev), incluindo l25–l32; l27–l29 são Dev. O título/descrição anteriores não autorizam duplicá-los. Primeiro entregar auditoria dos contratos atuais e crosswalk aditivo competência/lição/IDs/progresso, proposta mínima e testes de compatibilidade. Só implementar depois de matriz CCE compatível e plano corrigido revisado.

Reutilizar AID-2115, compilador atual 32 lições, mission-bindings.yaml + learner/substrate/mission\_catalog.py e @aidevschool/evidence. O filtro Dev é listModules ia\_pratica no adaptador generatedContentRepository.ts; não criar compilador/schema novo. verify\_and\_gate\_no\_code já existe em learner/gate/no\_code.py. Separar bound/visible/guided/readiness.

Não igualar completed/pass/simulação a mastered. Nunca executar seed ZAI em instância existente: prisma/seed.ts contém lessonProgress.deleteMany(). Sem sobrescrever progresso; preservar IDs/retomada; usar worktree limpa. Nenhum merge/deploy/restart/segredo/acesso/compra/deleção. Auditoria e proposta podem começar agora, sem pedir aprovação redundante ao founder; implementação aguarda correção técnica real.

Fonte na base: [https://github.com/dandpb/aidevschool/blob/1975e2c7967cbd4a8af817271de89bf0f70bd617/engines/codexdojo-os-prototype/config/mission-bindings.yaml](https://github.com/dandpb/aidevschool/blob/1975e2c7967cbd4a8af817271de89bf0f70bd617/engines/codexdojo-os-prototype/config/mission-bindings.yaml)

**founder** · 2026-09-30T12:15:50.537275+00:00

Complemento de compatibilidade: Pixel curriculumPack.ts:666 usa U0-sonda-rate-limiter-robustness no projeto 01, U4-task-queue no 04 e U-\<projectSlug> nos demais; :lab01 não é unit\_id do pack. Usar aliases explícitos e fixtures, nunca inferir equivalência com nomes Voxel. Nenhum engine inteiro foi provado seguro para excluir.

**Curriculum Platform Engineer** · 2026-09-30T12:16:29.916754+00:00

Entrega do primeiro pacote autorizado pela correção bloqueante (auditoria + crosswalk aditivo + proposta mínima + testes de compatibilidade) — **PR #611 (draft, sem merge)**: https://github.com/dandpb/aidevschool/pull/611

**Auditoria first-hand (base 1975e2c7, mesma da revisão independente):**
- Premissa corrigida confirmada pelos próprios arquivos + validador oficial: `validate.py` → `OK: 32 lições ready: 23 IA na Prática, 9 Dev`; mission-bindings = **39 = 23 ai-pratica + 16 dev** (9 lições mod-05 + 7 jogos voxel); **l25–l32 todos já vinculados; l27–l29 são dev**. A fatia "bindings l25–l32, 41→49" é vazia — duplicaria bindings e violaria a invariante de unicidade lição↔missão do substrate.
- **Achado F-1:** `lesson.schema.json` é `additionalProperties: false` → adicionar `competency:` exige **emenda de schema** (não basta "campo opcional no YAML"); proposta mínima corrigida no doc.
- **Achado F-2:** qualquer mudança de conteúdo exige bump único de `contentVersion` propagado em 3 lugares do mission-bindings (tracks + runtime dos 32 bindings de lição), senão o substrate rejeita.
- **Crosswalk aditivo [P]:** 32 lições + 7 jogos → F1–F4/D1–D7 com IDs/tracks/pré-requisitos/progresso preservados. Lacunas reais da escola unificada: **D2, D6, D7 (+evals D5) sem binding** — jornadas dev não-voxel, exatamente as fontes pendentes da matriz r2.
- **Testes de compatibilidade:** `test_os_bindings_crosswalk.py` (7 pins do estado live na suite compartilhada) — duplicar l25–l32, desalinhar track/journey, quebrar contrato de evidência ou contentVersion passa a falhar em CI. Zero mudança de comportamento; aprendiz não percebe nada.

**Verificação:** novo teste 7 passed; `curriculum/ai-literacy/tools/tests` 53 passed; `learner/substrate/tests` 221 passed/1 skipped; `validate.py` verde. Worktree limpa/isolada `aid3457/audit-contracts`.

**Estado/disposição:** em revisão — próximo passo é countersign independente no PR #611 (produtor ≠ verificador; merge só pela porta `scripts/merge_pr.sh`). **Implementação permanece suspensa** com donos de desbloqueio nomeados: (1) matriz r2 da frente CCE (AID-3456); (2) revisão do plano corrigido no PR #610 (pai AID-3453). Quando ambos fecharem, retomo aqui a proposta mínima (emenda de schema + campo opcional + bump de versão) já especificada no doc §4.

**Curriculum Platform Engineer** · 2026-09-30T12:21:43.663244+00:00

Complemento 696dc5d3 incorporado — obrigado, fecha exatamente a lacuna de IDs do crosswalk. PR #611 atualizado (head `d5910962`, draft): https://github.com/dandpb/aidevschool/pull/611#issuecomment-5911195405

**Verificação first-hand:** `curriculumPack.ts:666-674` confirma — `01_rate_limiter` → `U0-sonda-rate-limiter-robustness` (contrato de persistência congelado; única unit em `learning_state.yaml:85`), `04_concurrent_task_queue` → `U4-task-queue` (decisão CEO AID-1859 Option A / dispatch AID-1877; mesma identidade do catálogo voxelDojo, NÃO o default de template `U-04_concurrent_task_queue`), demais → `U-${project}`. `regionId` = `lab-${project}` é região, não unit_id.

**O que mudou no pacote:**
- Doc §2.7 novo com a tabela de aliases explícitos + regras (equivalência Pixel↔Voxel↔substrate só por alias explícito + fixture, nunca por semelhança de nome; nenhum engine inteiro provado seguro para excluir — registrado como restrição da matriz r2/AID-3456).
- +4 pins (`PixelPackUnitAliasAuditTest`): fixture canônica `PIXEL_UNIT_ALIASES`; branches congeladas no fonte; U0 persistido pelo substrate; bindings voxel nunca adotam defaults de template Pixel; nenhum unitId região-shaped (`:lab…`/`lab-…`).

**Verificação:** suite compartilhada 57 passed (53+4); `learner/substrate/tests` 221p/1s. Zero mudança de contrato — aprendiz não percebe nada.

**Disposição:** pacote autorizado (auditoria + crosswalk + proposta mínima + testes) **em revisão** no PR #611 — checklist de countersign postada no PR (produtor ≠ verificador; head pin `d5910962`; merge só via `scripts/merge_pr.sh`). Implementação continua suspensa com donos nomeados: (1) matriz r2 — frente CCE (AID-3456); (2) revisão do plano corrigido — PR #610 (pai AID-3453/FPE).

**founder** · 2026-09-30T12:22:41.813344+00:00

Revisão independente do PR #611 head d5910962411329833d3eca0919abdf346f3ac10c: escopo audit-only preservado, agora 11 testes. Corrigir afirmação da auditoria §2.4: validate\_tracks atualmente exige igualdade contentVersion apenas em ai-pratica, não em Dev. O teste novo acrescenta o pin de igualdade Dev. Distinguir proteção runtime existente da proteção adicionada pelo teste, sem ampliar runtime nesta onda. Registrar defaults de schema e testes negativos necessários antes de futuros consumidores usarem estados novos; implementação/fusões continuam dependentes da matriz r2. Retornar novo head, sem merge ou deploy.

**founder** · 2026-09-30T12:23:33.273741+00:00

CI independente verificado para PR #611: job 109882768049 testou merge 5c3a971 do head d5910962 sobre main 1975e2c7, com 847 passed/2 skipped. Countersign job 109882767323 falhou por trailer de proveniência do produtor ausente. Corrigir metadados pelo fluxo de proveniência já autorizado no repositório, com identidade/evidência reais; não fabricar trailer nem usar identidade emprestada. Confirmação do board não substitui essa prova. Preservar draft e ausência de merge; informar novo head para nova checagem.

**Curriculum Platform Engineer** · 2026-09-30T12:24:57.541522+00:00

Revisão 2aaaa93b atendida — **novo head `5943c295`** no PR #611 (sem merge/deploy): https://github.com/dandpb/aidevschool/pull/611#issuecomment-5911247880

- **§2.4 corrigido** (afirmação era imprecisa): runtime exige igualdade contentVersion só em ai-pratica (`mission_catalog_bindings.py:45`); dev aceita qualquer string não-vazia (`:44`); igualdade dev é pin de teste (CI), não runtime. Tabela lugar×proteção no doc; runtime não ampliado nesta onda.
- **+2 pins negativos** (`RuntimeVersionEnforcementAuditTest`, chamando `validate_tracks` direto): rejeita ai-pratica divergente / aceita dev divergente hoje (gap consciente, flip futuro com change conjunta do substrate).
- **§2.4.1 novo — registro de defaults** (first-hand): sem estado implícito — unknown field = erro (`additionalProperties:false`), `verifierRequired` deve ser literal `true` (`:75`), demais campos requeridos sem default; único default fraco = contentVersion dev. Testes negativos exigidos antes de consumidores de estados novos listados (5 itens, incl. pós-`competency`).
- Implementação/fusões seguem dependentes da matriz r2 (AID-3456).

Verificação: suite compartilhada **59 passed** (57+2); substrate 221p/1s. Escopo audit-only preservado.

Disposição: em revisão — novo pedido de countersign pendente para o head `5943c295` (suplanta o pin `d5910962`).

**founder** · 2026-09-30T12:26:16.252978+00:00

Consolidação: AID-3462 foi cancelada como duplicata recuperável desta frente, preservando descrição/histórico. Requisitos da CCE r2 no PR #610 @ f31f21e3, §12, ficam aqui como candidatos dependentes de revisão Content Designer + contratos compatíveis + QA, sem autorização automática de implementar: fontes Dev opcionais (workflows, curso-simples, SDLCQuest, projetos); 10 Voxel sem binding; competency primária/apoio e estados bound/visible/guided/readiness; fixtures/SHA dos quizzes 01/02 antes do reuso. Não iniciar mais frentes; encaminhar delegações pelo pai. Continuam sem merge/deploy e sem mudança de progresso.

Revisão final dos testes no head d5910962: test\_os\_bindings\_crosswalk.py linhas 179–195 só verifica substrings; trocar os branches U0/U4 ainda passaria. Testar unidades emitidas por projeto ou mapeamento completo, idealmente mutação. Linhas 203–214 só excluem strings não relacionadas: mudar U2-key-value-store para U-02\_key\_value\_store passaria; afirmar todos os sete pares missão→unit. São contraexemplos estáticos, não mutações executadas. Ajustar testes/claims e contagens do corpo do PR, mantendo audit-only; retornar head exato.

**Curriculum Platform Engineer** · 2026-09-30T12:27:11.671018+00:00

Revisão 8180d1a8 atendida — **novo head `f70882df3fe067816e8711ccbc19f1b0139eb79e`** (draft preservado, sem merge): https://github.com/dandpb/aidevschool/pull/611#issuecomment-5911283413

- **Proveniência corrigida pelo fluxo autorizado (AID-2493):** a conversa do PR não tinha trailer `Provenance:` → *producer unattributed* (contrato §5 do gate). Trailer canônico adicionado ao body do PR com identidade/evidência reais: `agent=curriculum-platform-engineer task=AID-3457 run=0864b532-523c-4d3b-be1d-375d231a6ae4 session=3cbab3d6-45a5-478c-9212-e1484aacbb04`. Sem trailer fabricado, sem identidade emprestada; o commit `f70882df` também carrega o trailer. Countersign válido agora exige agente distinto pinando o novo head.
- **CI independente registrado no doc §6:** job 109882768049, merge `5c3a971` (head `d5910962` sobre main `1975e2c7`) — 847 passed/2 skipped.
- Board confirmation não usada como substituto da prova do gate — novo head informado para nova checagem independente.

Verificação local: suite compartilhada 59 passed. Disposição: em revisão — pedido de countersign pendente atualizado para o head `f70882df` (suplanta o pin `5943c295`).

**Curriculum Platform Engineer** · 2026-09-30T12:30:48.761142+00:00

Revisão final 499ec177 atendida — **head exato `488996ac838efc9eb472bfb5d4339e8943cb934c`**: https://github.com/dandpb/aidevschool/pull/611#issuecomment-5911338793

- **Testes fortalecidos (contraexemplos estáticos eliminados):** mapeamento completo emitido por projeto (parse fail-closed da função `unitId` — branches ordenadas + fallback; trocar branch/string/template muda o mapa e falha) e pin dos **sete pares completos** missão→(projeto, unit) do track voxel. **Mutações executadas** na verificação e revertidas (nunca commitadas): swap do alias U0 → falha; `U2-key-value-store`→`U-02_key_value_store` → falha.
- **Claims/contagens do body do PR ajustados:** 13 pins / 13 passed / 59 passed na suite compartilhada.
- **Consolidação AID-3462 registrada (doc §7):** requisitos CCE r2 (PR #610 @ f31f21e3 §12) como candidatos dependentes de revisão Content Designer + contratos compatíveis + QA — sem autorização automática de implementar; delegações pelo pai (AID-3453); sem novas frentes; sem merge/deploy; sem mudança de progresso.

Verificação: suite compartilhada 59 passed; substrate 221p/1s. Disposição: em revisão — countersign pendente atualizado para o head `488996ac` (suplanta `f70882df`).

**founder** · 2026-09-30T12:31:16.864094+00:00

Revisão do plano PR610 @0481c8c0 libera somente implementação limitada de schema/defaults/scaffolding e testes de compatibilidade em draft. Fusão/atribuição de currículo e release ao aluno continuam retidos: mapeamentos r2 ainda têm l17 API→D5, l29 dependências→D3 e l20 fact-checking→F4 a corrigir. Preservar defaults reais, estados inválidos, testes negativos, produtor/consumidor antigo+novo, visibilidade, ordem, pré-requisitos, IDs e progresso. Não serializar linhas agrupadas como se prontas. Concluir correções do audit PR611 e manter proposta/implementação separadas com head explícito. Sem merge/deploy, secrets, exclusões ou novo ticket de coordenação.

**founder** · 2026-09-30T12:33:38.033337+00:00

Revisão independente do head488996ac: três achados originais e proveniência do produtor corrigidos. Countersign continua exigindo revisor independente genuíno. Um claim residual: parser Pixel chamado fail-closed ignora statements não reconhecidos. Um return incondicional U-wrong antes dos branches mudaria output sem mudar o mapa parseado. Contraexemplo estático, não executado pelo revisor. Corrigir para rejeitar corpo não consumido/testar função TypeScript real, OU limitar honestamente a alegação a pin parcial da forma do código, sem garantir mapeamento emitido. Aceite técnico retido até claim/cobertura coerentes; CI ainda em andamento. Não ampliar escopo nem merge/deploy.

**founder** · 2026-09-30T12:36:22.441039+00:00

Mapeamentos l17/l29/l20 ficam \[P], sem serializar até resolver semântica. Citar mesma versão do glossário canônico e objetivo observável: integração API IA, avaliação de dependências, fact-checking. Seus IDs divergiram dos usados pela revisão; não forçar nem votar labels. Content Designer decide primária/apoio com rationale, FPE ratifica contrato, CPE codifica depois. Corrigir drift entre documentos primeiro. Pode seguir schema/defaults/testes compatíveis desacoplados das atribuições; não promover conteúdo/glossário provisório ao learner.

**Curriculum Platform Engineer** · 2026-09-30T12:37:24.74399+00:00

Revisão f7be7295 atendida em duas frentes separadas, com heads explícitos:

**1) Correções do audit concluídas — PR #611, head `c85dd09e9524cf1cbea391c545e66d96d9dc3a66`:** mapeamentos [P] corrigidos para NÃO propagar os erros apontados na r2 — l17 API: D5→**D3 primária** (construção/integração; D5 secundária); l20 fact-checking: F4→**F2 primária** ("verifique antes de usar" = uso seguro; F4 secundária); l29 dependências: **D4 confirmada** (o D3 errado jamais esteve neste crosswalk). Contagens §3.4 atualizadas (F2=3, F4=10) + bloco de correções com raciocínio auditável. Suite compartilhada 59 passed.

**2) Fatia limitada implementada em PR SEPARADO (draft) — PR #612, head `c9f13a5b8e405c94520b3514e9cbf7c1c8871e75`:** emenda de schema `competency` opcional (`^[FD][0-9]+$`; ausência = "não mapeada", default registrado), compilador NÃO propaga (read model byte-idêntico), 6 testes de compatibilidade (produtor antigo 32 live / produtor novo F1–F4,D1–D7 / estados inválidos rejeitados / identidade+ordem+pré-requisitos+visibilidade+progresso preservados). Zero atribuição de dados; linhas agrupadas não serializadas como prontas; fusão/atribuição e release ao aluno seguem retidos. 52 passed + validate.py OK.

Sem merge/deploy, sem secrets, sem exclusões, sem novo ticket de coordenação. Disposição: em revisão — countersign independente pendente para os dois heads (PR #611 audit + PR #612 implementação limitada).

**Curriculum Platform Engineer** · 2026-09-30T12:39:39.707914+00:00

Revisões 4d78c138 + 770b30e5 atendidas — **PR #611 head `0f307bf9e7225864e370e216110d577d93ea4192`**: https://github.com/dandpb/aidevschool/pull/611#issuecomment-5911475731

- **Parser (4d78c138):** corrigido pela via forte — rejeita statements não consumidos do corpo de `unitId`; o contraexemplo do `return` incondicional foi **executado localmente (revertido, nunca commitado) e o teste falha**; swap U0 continua pego. Claim e cobertura agora coerentes.
- **Divergências (770b30e5):** l17/l29/l20 reenquadrados como **[P] aberto, sem serializar** — objetivos observáveis citados (integração de API de IA, avaliação de dependências, fact-checking), leituras proposta×r2 lado a lado **sem votar labels**; decisão: Content Designer → FPE ratifica → CPE codifica. Glossário canônico citado por versão (spec R6, PR #610 @ `0481c8c0`); drift entre documentos corrigido; nada promovido ao learner.
- **PR #612 (head `c9f13a5b`) segue desacoplado das atribuições** — schema/defaults/testes compatíveis, zero dados, conforme autorizado.

Verificação: suite compartilhada 59 passed (3 mutações executadas, todas pegas). Sem merge/deploy, escopo não ampliado. Disposição: em revisão — countersign independente pendente (PR #611 @ `0f307bf9`; PR #612 @ `c9f13a5b`).

**founder** · 2026-09-30T12:45:39.217164+00:00

Revisão independente objetiva:

PR611 @0f307bf9 ainda ignora ordem do fallback reconhecido: mover o return template existente antes dos branches U0/U4 consome todos os tokens, mas runtime ignora aliases. Correção proporcional: exigir fallback após todos os branches e teste early-fallback, com claim explícito de pin restrito da forma da fonte, não verificador semântico TypeScript geral. Contraexemplo estático do revisor, não mutação executada. Não construir subsistema novo nem bloquear outras frentes.

PR612 @c9f13a5b: CI real job109888716418, merge f11d30e sobre1975e2c, 842 passed/2 skipped; negativos X9/f2 já cobertos, não refazer. Porém schema scalar competency diverge de spec R1/plan12–13 do PR610 que exigem primary+supporting\[]. Pattern permite F0/F5/D8/F01 fora do glossário atual. Corrigir contrato aditivo acordado e testar combinações/IDs válidos do glossário, preservando ausência/default e bytes antigos. Sem atribuir lições enquanto semântica estiver proposta.

Countersign precisa revisão independente genuína do head novo; nunca só editar a citação antiga. Manter drafts, sem merge/deploy.

**Curriculum Platform Engineer** · 2026-09-30T12:48:26.480548+00:00

Revisão 8fdfdd75 atendida nos dois PRs, com heads novos:

**PR #611 @ `ea97c89d572e4ecbaf852f68e5be953693b2c706`:** parser passa a **exigir fallback após todas as branches** — o contraexemplo do early-fallback foi **executado localmente (revertido, nunca commitado) e o teste falha**; claim reescrito como **pin restrito da forma da fonte** (statements consumidos + ordem), não verificador semântico TypeScript geral. Sem subsistema novo. 59 passed (4 mutações executadas, todas pegas).

**PR #612 @ `d853e4f77ce2a32444c730df4798c5779b03ff3f`:** contrato `competency` corrigido para o **aditivo acordado spec R1** — objeto com `primary` obrigatória (enum glossário atual F1–F4/D1–D7) + `supporting[]` uniqueItems; F0/F5/F01/D8/D09 rejeitados; validador ganha `uniqueItems`; 8 testes (IDs do glossário como primária, combinações, fora-do-glossário em ambos os papéis, malformados, ausência/default e bytes antigos preservados). **Zero atribuição de lições** (semântica [P]). 54 passed + validate.py OK.

CI real do #612 registrado (job 109888716418, merge f11d30e, 842p/2s). Countersign dos heads novos requer **revisão independente genuína** — citações antigas não são editadas. Drafts mantidos, sem merge/deploy.

Disposição: em revisão — novo pedido de countersign pendente pinando `#611@ea97c89d` + `#612@d853e4f7`.

**founder** · 2026-09-30T12:51:47.410089+00:00

Os findings direcionados estão resolvidos em PR611 ea97c89d e PR612 d853e4f. Congelar estes candidatos enquanto CI e revisão independente exata concluem; não gerar commits cosméticos que invalidem pins/reiniciem filas. Alinhar apenas texto do corpo PR611 de fail-closed genérico para pin restrito da forma da fonte, sem mudar head. QA/recovery está verificando contrato P/S atual, não reutilizando GO scalar antigo. Fusão/atribuições/runtime e release seguem retidos; nenhum merge/deploy autorizado.

**founder** · 2026-09-30T12:52:46.98568+00:00

PR612 execução schema-only verificada: recibo QA genuíno 5911652273 às12:50:40 pina d853e4f, agente distinto e provas8/54/32 + nove contra-checagens com controles válidos. Python CI do head exato:844 passed/2 skipped. Falha countersign aconteceu11 segundos antes do recibo e está stale, não falta revisão atual. Se não houver rerun automático, reexecutar SOMENTE esse gate stale pelo workflow normal; não mudar workflow/segurança nem head, não fabricar review. CI completa ainda em andamento; sem merge/deploy.

**Curriculum Platform Engineer** · 2026-09-30T12:52:50.016043+00:00

Congelamento 0d232548 confirmado e respeitado:

- **Heads congelados, sem commits cosméticos:** PR #611 @ `ea97c89d572e4ecbaf852f68e5be953693b2c706` e PR #612 @ `d853e4f77ce2a32444c730df4798c5779b03ff3f` — nenhum push nesta rodada; pins e filas de CI preservados.
- **Único ajuste feito (edição de body, sem mudar head):** texto do corpo do PR #611 alinhado de "parse fail-closed" genérico para **"pin restrito da forma da fonte"** (statements integralmente consumidos + ordem branches→fallback; não é verificador semântico TypeScript geral).
- QA/recovery verificando o contrato P/S atual (não reutilizando o GO scalar antigo) — ack; nenhum GO antigo citado por mim.
- Fusão/atribuições/runtime e release seguem retidos; nenhum merge/deploy.

Disposição: em revisão — countersign independente pendente sobre os heads congelados (`601ffd3f`); nenhum trabalho adicional iniciado até o veredito.

**Curriculum Platform Engineer** · 2026-09-30T12:54:59.761469+00:00

Gate stale do PR #612 reexecutado pelo workflow normal (ce5b4885):

- **Rerun padrão, nada alterado:** `POST /actions/runs/36717123605/rerun` (rerun do próprio run do `countersign-gate`) — sem mudar workflow, segurança ou head; sem review fabricado. Não houve rerun automático (check parado em failure desde antes do recibo QA).
- **Resultado:** `countersign-gate` = **success** no head `d853e4f77ce2a32444c730df4798c5779b03ff3f` — o recibo QA genuíno 5911652273 (12:50:40, agente distinto, provas 8/54/32 + nove contra-checagens) agora é a citação operativa; a falha anterior estava stale (11s antes do recibo), conforme a revisão.
- **PR #611 (head congelado `ea97c89d`):** gate em failure às 12:46:55Z (pré-freeze); a revisão independente exata continua em andamento — **não rerun unilateral meu** (fora do escopo autorizado); o gate re-dispara pelo trigger `issue_comment (created)` quando o recibo independente do #611 pousar.
- CI completa do #612 ainda em andamento (voxel/curriculum Node/zai queued); Python CI do head exato: 844 passed/2 skipped (confirmado pela revisão).
- **Sem merge/deploy**; heads congelados preservados (`#611@ea97c89d`, `#612@d853e4f7`).

Disposição: em revisão — confirmação pendente `601ffd3f` continua pinando os heads congelados.

**founder** · 2026-09-30T12:56:23.849893+00:00

Atualização verificada: PR612 live countersign run36717434368 passou às12:51:11 no d853e4f7 após recibo QA12:50:40. PR611 run36717272769 também passou. Não reexecutar gate já efetivo nem tratar notificações antigas como regressão de main. Manter heads congelados; falta acompanhar CI completa exata, sem merge/deploy.

**Curriculum Platform Engineer** · 2026-09-30T12:57:09.505623+00:00

Acompanhamento da CI completa exata (9e72c3c2) — snapshot first-hand agora, heads congelados, **nenhum gate reexecutado**:

**PR #611 @ `ea97c89d`:** 45 checks — 32 completos, 13 pendentes (12 voxel games + codexdojo-os, todos queued/in_progress), 0 falhas reais. O `countersign-gate` vermelho anexado ao evento de push (run 36717007447, 12:46:55) é **notificação antiga**: o run efetivo 36717272769 (12:49:18, disparado por comentário, avalia a conversa do PR) **passou** — tratado conforme a revisão, sem rerun e sem ler como regressão de main.

**PR #612 @ `d853e4f7`:** 45 checks — 35 completos, 10 pendentes (voxel games + codexdojo-os), **0 falhas**; countersign-gate efetivo verde (run 36717434368, 12:51:11, pós-recibo QA 12:50:40).

Todos os jobs não-voxel/os já verdes nos dois heads (Python, literacyDojo, dojoToday, factory, sdlc-quest, guardrails, etc.). Pendentes são todos da matriz voxel/codexdojo-os, que avançam sozinhos na fila — sem ação minha necessária nem autorizada.

**Sem merge/deploy; heads preservados.** Disposição: em revisão — confirmação pendente `601ffd3f` pinando os heads congelados; próximo marco é a CI completa fechar e o veredito da revisão independente exata.

**founder** · 2026-09-30T13:03:50.638178+00:00

Dependência concreta com FPE: PR610 head8be20045 integrou l16 critérios shape/runtime, mas CI real falhou l16/l16-a2/fail no bridge447 (producer deterministicChecks não coincide com recomputação independente). FPE já está reproduzindo; não tocar branch dele. Revisão também encontrou l16 version3 sem bump após mudança de critério; content-contract.md150–154 exige bump e preservação de completed. Apoiar FPE com contrato explícito de versão e compatibilidade de tentativas/progresso antigos, usando branch isolada ou análise, sem mudar/verificar menos. PR611/612 congelados não precisam commits cosméticos; este ajuste pertence à integração de conteúdo610 e deve manter IDs/estado do learner.

**Curriculum Platform Engineer** · 2026-09-30T13:06:02.479304+00:00

Apoio ao FPE entregue (f9571e42) — **PR #613 (draft, doc-only, branch isolada)**: https://github.com/dandpb/aidevschool/pull/613 — head `8b64bab05679e629e197c82a8a7996e3c859d8b5`

**Contrato explícito de versão/compatibilidade para a correção l16 do PR #610:**
- **First-hand confirmado:** patch do PR #610 muda critérios/vereditos de l16-a2 (`c-redact` → `c-redact-shape`+`c-redact-runtime`) **sem bump de `version`** (regra 3 do content-contract.md violada; lição em v3).
- **Contrato:** bump `version` 3→4 + `contentVersion` propagado (tracks + 32 runtime bindings) no mesmo change; **bridge exige produtor e corpus da mesma versão** — tentativas antigas verificáveis contra a versão gravada (v3/`c-redact`), novas contra v4; recomputar v3 contra critérios v4 é exatamente a classe do mismatch atual.
- **Preservado:** IDs imutáveis, `completed` v3 válido, evidências históricas não reprocessadas (trilha de auditoria), revisão espaçada aponta v4, migração forward-only, estado do learner intocado.
- **Branch do FPE intocada**; PRs #611/#612 congelados sem commits cosméticos; nada verificado a menos.

Disposição: em revisão — #611/#612 aguardando CI completa/veredito (confirmação `601ffd3f`); #613 disponível ao FPE como referência contratual para a correção.

**founder** · 2026-10-02T16:18:31.334301+00:00

[@Curriculum Platform Engineer](agent://ac0ec540-f683-4be0-88de-49430e95eeaa?i=file-code): decisão de produto/arquitetura S6, no escopo delegado pelo Dani. Selecionamos o competency-map.ts separado do PR #659 para o consumo opcional de competências. Preserve lessons.ts byte-idêntico, IDs, progresso, contentVersion/version, filtro PUBLIC\_JOURNEY no adaptador e a fronteira do corpus verificador. Sem seed, writes de progresso ou sincronia entre engines. A revisão independente LAE no head 3f636429 está no PR659, comentário 5956348434; novo head exige revisão/pin válidos.



Reconcilie, como dono legítimo, especificação e dependências do contrato #623 com essa decisão. Não integrar a alternativa in-band do PR #634. Primeiro confirme seu escopo redundante; então registre sua disposição como superseded pela estratégia #659, preservando branches, commits, provas e histórico. Se houver parte não redundante, delimite-a e reporte antes de fechar ou descartar conteúdo. Não integrar os dois mecanismos nem alterar testes existentes/proteções para fazer a decisão caber.



No contrato da Fase 2, explicite: versão de mapa desconhecida falha fechado; reconciliação entre undefined legado e mapping:null; distinção entre lição não mapeada e ausente/planned quando necessária; aplicação de PUBLIC\_JOURNEY pelo consumidor. A escolha do mecanismo não conclui automaticamente crosswalk/l16, E2E, UI/a11y ou conformidade integral da AID-3457.



Sequência: CPE reconcilia especificação/dependências e disposição; LAE revisa eventual mudança contratual; countersign independente no head final e FPE pela porta única somente após os gates técnicos vigentes. A autorização de testar e mergear se tudo estiver OK permanece condicionada a esses gates. Nenhum deploy/publicação autorizado, nenhuma ampliação de permissão ou aceite de proteção.



Este é um único wake autorizado, sem nova issue ou interrupção. Reutilize a continuação existente e evite dispatch duplicado. Na primeira negativa de autorização, pare e reporte, sem outro endpoint/ator ou filho-ponte. Retorne a reconciliação persistida, os heads atuais e o próximo passo efetivamente admitido.

**Curriculum Platform Engineer** · 2026-10-02T16:23:43.181536+00:00

Reconciliação S6 persistida (decisão `618a37b1`) — como dono legítimo do contrato:

**1) Contrato #623 reconciliado — novo head `86455d33722cd6a048fa4da59aaaade92edd1437`** (r2): mecanismo selecionado = `competency-map.ts` separado (#659); §6 reescrito com o in-band preservado como registro histórico em `<details>`; Fase 2 explícita em **§7.1**: (1) `mapVersion` desconhecida falha fechado; (2) `undefined` legado ≡ `mapping: null` ≡ «não mapeada»; (3) não-mapeada ≠ ausente/`planned`; (4) `PUBLIC_JOURNEY` aplicada pelo consumidor (projeção compila as duas jornadas, não pré-filtra). Não-conclusões declaradas (crosswalk/l16, E2E, UI/a11y, conformidade integral). Escopo não redundante delimitado e preservado: §3/§4/§5/§8/§9/§10 + testes de seam (67/67 OK). https://github.com/dandpb/aidevschool/pull/623#issuecomment-5956586806

**2) #634 registrado como superseded e fechado (não merged):** escopo confirmado redundante em nível de mecanismo; invariantes únicos cobertos de forma mais forte pelo #659 (byte-identidade incondicional); branch/commits/provas/histórico preservados; nada integrado, nenhum teste/proteção alterado. https://github.com/dandpb/aidevschool/pull/634#issuecomment-5956596565

**Heads atuais:** #611@`ea97c89d` (audit, aberto) · #612 merged · #613@`8b64bab0` (contrato l16, aberto) · #623@`86455d33` (contrato r2) · #634 closed@`b07b5b2f` (superseded) · #659@`3f636429` (selecionado; review LAE `5956348434`).

**Próximo passo efetivamente admitido:** review LAE da mudança contratual r2 no #623@`86455d33` → countersign independente no head final → FPE pela porta única (`scripts/merge_pr.sh`) somente após os gates vigentes. Nenhum deploy/publicação, nenhuma ampliação de permissão, nenhum aceite de proteção. (#612-schema já em main não é afetado: enum/estrutura intactos no #659.)

**founder** · 2026-10-02T16:28:33.952401+00:00

[@Curriculum Platform Engineer](agent://ac0ec540-f683-4be0-88de-49430e95eeaa?i=file-code): a decisão S6 e a sequência já estão autorizadas no comentário 618a37b1. O r2 do PR #623, head 86455d33722cd6a048fa4da59aaaade92edd1437, implementa a escolha aprovada; não aguarde nova confirmação do Board para essa prioridade de produto. A revisão técnica independente continua necessária.



Encaminhe a revisão real do r2 ao Learner App Engineer pela rotina nativa permitida da AID-3514, verificando antes se já existe continuação equivalente. Não reutilize o GO r1 do head b6e0b8fe como aprovação de r2, nem conte o request\_confirmation 80b9597b como revisão LAE. Esse formulário acorda o assignee CPE; preserve a pendência até a rotina legítima conciliá-la quando apropriado, sem autoaceite.



Sem novo filho/issue, relay para contornar 403, troca de dono, ampliação de permissão, handoff ou interrupção. Se a fronteira bloquear o encaminhamento, pare essa ação e escale ao responsável legítimo pelo seu canal normal, preservando a negativa. Um único wake CPE está autorizado para este encaminhamento; não duplique jobs. Retorne o recibo de entrega e a admissão real do revisor, ou o bloqueio exato. Nenhum deploy/publicação e nenhum relaxamento dos gates.

**Curriculum Platform Engineer** · 2026-10-02T16:30:35.797018+00:00

Encaminhamento da revisão r2 ao LAE (b06a27bd) — **recibo de entrega + bloqueio exato**:

**1) Entregue (persistido):** reconciliação r2 no PR #623 @ `86455d33` (§6/§7 reescritos, §7.1 explícito, histórico preservado), #634 superseded/fechado, checklist de review pública no PR #623 (comment `5956586806`) endereçada ao parecer LAE sobre §6/§7 e o contrato §7.1 da Fase 2. Sem aguardar nova confirmação do Board para a prioridade (autorização `618a37b1` vigente). Nenhum GO r1 (`b6e0b8fe`) reutilizado; o `request_confirmation` `80b9597b` permanece **pendente** (não é revisão LAE; sem autoaceite).

**2) Bloqueio exato do encaminhamento pela rotina nativa:** verifiquei antes que não existe continuação equivalente (AID-3514 `done`, sem filhos/livenessContinuation; nenhuma issue aberta rastreia a revisão r2). Tentei então a rotina nativa usada na r1 — comentário de resubmissão na etapa review da AID-3514 (com `resume: true`, participant designado LAE) — e a API negou com status de autorização:

> `{"error": "Issue is outside this actor's authorization boundary"}`

Conforme instruído: **parei na primeira negativa** — sem retry, sem outro endpoint/ator, sem filho-ponte, sem troca de dono, sem relay para contornar 403. A negativa está preservada acima.

**3) Escalação pelo canal normal (CPE → FPE):** dono do desbloqueio = **FPE** — reautorizar/rotear a rodada de review da r2 ao LAE (ou o LAE pode atuar diretamente a partir do PR #623 @ `86455d33`, thread pública com checklist pronta).

**Heads:** #611@`ea97c89d` · #613@`8b64bab0` · #623@`86455d33` · #634 closed@`b07b5b2f` · #659@`3f636429`.

**Próximo passo efetivamente admitido (aguardando desbloqueio de roteamento):** parecer LAE da r2 → countersign independente no head final → FPE pela porta única após os gates. Nenhum deploy/publicação, nenhum relaxamento de gates.

**founder** · 2026-10-17T16:12:03.396354+00:00

✅ Concluído: crosswalk e 40 bindings (`23 ai-pratica + 17 dev`) verificados e mergeados na `main` via PR #657.

**Curriculum Platform Engineer** · 2026-10-17T16:14:47.897499+00:00

Verificado first-hand e coerente com o encerramento — obrigado:

- **Main**: 40 bindings = **23 ai-pratica + 17 dev** (missão a mais em `dev` incorporada com os pins de compatibilidade conscientemente atualizados — `test_os_bindings_crosswalk.py` na main já pina `40`; trilha de auditoria íntegra).
- **Fatias desta frente em main**: PR #611 (auditoria + crosswalk + 13 pins) **merged**; PR #623 (contrato de leitura r2, reconciliado com a decisão S6) **merged**; PR #659 (`competency-map.ts`, mecanismo selecionado) **merged**; #612 (schema `competency` R1) merged anteriormente.
- **Registro preservado**: PR #634 (in-band) fechado como superseded; PR #613 (contrato l16 de apoio ao FPE) fechado sem merge — histórico retido.

Nota menor para a trilha: o comentário de encerramento cita o PR #657 para os 40 bindings, mas #657 é o fix AID-3710/3736 (mastery exige recibo); a incorporação dos bindings está no merge do #611 e subsequente atualização de pins — sem impacto no resultado (contagem confirmada direto na main).

Encerramento reconhecido pelo CPE. Nenhuma ação residual desta parte.

---

