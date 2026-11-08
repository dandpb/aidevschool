# AID-3523: ES — matriz de testes de migração/compatibilidade: progresso legado ↔ contrato curricular unificado

- **Status:** done | **Priority:** medium | **Origin:** manual
- **Assignee:** Engine Systems Engineer | **Created:** 2026-09-30T20:57:55.435473+00:00 | **Updated:** 2026-09-30T22:06:06.465+00:00
- **ID:** `26755d92-3376-4510-9daa-fb2c6f854a81`

## Description

Lote operacional founder (AID-3307 comment 4e9668b1, frente 6). Dono: Engine Systems.

**Entregável:** matriz de testes de migração/compatibilidade entre progresso legado e o contrato curricular unificado ACEITO: identidade, idempotência, estados parciais, colisões de IDs, rollback e fixtures sintéticas.

**Aceite:** casos reproduzíveis + lacunas de contrato para decisão, publicados neste issue. Referenciar os contratos existentes de CPE e os 32 mapeamentos ratificados. NÃO redefinir campos nem editar branches congeladas. Distinto do consumer contract de CPE e dos testes de progressão de LEE.

## Document `Matriz de testes de migração/compatibilidade — progresso legado ↔ contrato curricular unificado (r2: precisão + manifesto de anexos)` (2026-09-30)

# Matriz de testes de migração/compatibilidade — progresso legado ↔ contrato curricular unificado

**Produtor:** Engine Systems (AID-3523, frente 6 do lote operacional — AID-3307 comment `4e9668b1`). **r1.**

**Entregável cumprido:** casos reproduzíveis + lacunas de contrato para decisão, publicados neste issue. **Não** redefine campos de contrato, **não** edita branches congeladas (nenhum commit/push; refs lidas via `git show`), **não** duplica o consumer contract de CPE nem os testes de progressão de LEE.

## 1. Âmbito e refs pinadas (congeladas)

| Ref | O quê | Por quê |
| --- | --- | --- |
| `579ce995` | PR #610 `aid3453/unify-school` (escola única; spec R1–R10; glossário F1–F4/D1–D7; mission-bindings; ZAI literacyDojo) | head congelado da frente de integração |
| `d853e4f7` | PR #612 `aid3457/competency-schema-slice` (contrato `competency` — revisão `8fdfdd75`) | contrato aprovado, base da pilha competency |
| `f36f8b94` | PR #617 `aid3505/ratified-competency-metadata` (32 atribuições ratificadas) | incorpora os **32 mapeamentos ratificados** (matriz AID-3497 r3, rev `1fee56a2`; pareceres CD `ed2ea5f5` + CPE `f1cf2acd`) |
| `ea97c89d` | PR #611 `aid3457/audit-contracts` (auditoria bindings + crosswalk aditivo + pin) | contratos existentes de CPE citados caso a caso |

**Contratos de CPE referenciados (não duplicados):** schema `competency` + validador (`lesson.schema.json`, `tools/schema.py`; testes `test_competency_field_contract.py` — 8 casos PR #612; `test_ratified_competency_metadata.py` — 9 casos PR #617); invariantes do substrate (`learner/substrate/mission_catalog_bindings.py` — missionId==lessonId, unitId==`ai-literacy:{lessonId}`, pin de contentVersion em 3 lugares, F-1 `additionalProperties:false`, F-2 pin Dev só em teste); crosswalk aditivo + aliases Pixel congelados (§2.7 PR #611). O **read contract de CPE** (branch `aid3514/competency-read-contract`, placeholder @ `f36f8b94`) é trabalho em curso próprio e fica fora daqui. As lanes de analytics/progressão são distintas e ficam fora daqui: **AID-3515 / PR #621 é Learner Analytics** (dicionário v1 de evidências de aprendizagem observáveis + cálculo reproduzível), e o **ensaio de composição é a AID-3516 (LEE)** — ver G6.

## 2. Inventário de progresso legado (lados da migração)

| Loja | Chave de identidade | Estado | Versão de conteúdo |
| --- | --- | --- | --- |
| **ZAI** (Prisma/SQLite) `LessonProgress` | FK `Lesson.id` (cuid DB-local); `Lesson.slug` @unique; `@@unique([learnerId,lessonId])` | `completed: Boolean`, `stars 0..3`, `bestScore`, `attempts`, `lastPlayed`, `completedAt` | **inexistente** (nenhum `contentVersion` no engine) |
| **literacyDojo** (IndexedDB `literacydojo`/`progress`/`learner-progress`) | `lessonStatus` keyada por id canônico `l\d{2}` | `locked|available|in_progress|completed` (**sem `mastered` — estrutural**) + `skills` (passes/nextReviewAt) | `contentVersion` no registro; migração forward-only v1→v4 |
| **learner/learning_state.yaml** (programático) | units U0–U18 (`presenting→…→mastered`) | fronteira R4: **não-migração** deliberada; nada da escola unificada promove `mastered` | `version: 2` (sistema agora-continuum) |
| **Aliases Pixel** (pack congelado) | `unitId` não-uniforme (ex. `U4-task-queue` ≠ template `U-04_concurrent_task_queue`) | equivalência só por alias explícito + fixture (PR #611 §2.7) | contrato congelado de persistência |

## 3. Matriz de casos — executada nesta rodada (16/16 sem FAIL)

`PASS` = provado agora, comando no §5; `GAP` = caso definido cujo resultado depende de decisão em §4; `INFO` = evidência informativa. Resultados 1º-mão em `aid3523-evidence/matrix_run.json` + `vitest_aid3523_seam.log`.

| Caso | Dimensão | Loja | Verificação | Resultado |
| --- | --- | --- | --- | --- |
| MIG-A1 | identidade | canônico @`f36f8b94` | 32 ids únicos `^l\d{2}$`; `competency` presente 32/32; valores ⊆ glossário; apoio ≠ primária | **PASS** |
| MIG-A2 | identidade | bindings @`579ce995` | 39 bindings (23 ai-pratica + 16 dev); `missionId==lessonId` e `unitId==ai-literacy:{id}` em todos os 32 de lição | **PASS** |
| MIG-A3 | identidade | ZAI ↔ canônico | interseção exata de slugs/ids ZAI↔canônico = **∅** (espaços disjuntos: join por identidade **não existe**) | **PASS** (fato que fundamenta G1) |
| MIG-A3b | colisão | ZAI ↔ canônico | quase-colisão semântica: “IA não é mágica, é padrão” (ZAI) ~ l02 “IA não é uma fonte de verdade” (0.56) — similaridade NÃO é alias (§2.7 PR #611) | **INFO** |
| MIG-A4 | identidade | ZAI schema | progresso keyado por cuid FK, não por slug/id canônico — migração exige join slug→alias | **PASS** |
| MIG-A5 | identidade | literacyDojo | read model compilado do corpus congelado (`validate.py --compile`) expõe exatamente os 32 ids canônicos; enum sem `mastered` | **PASS** |
| MIG-B1 | idempotência | ZAI (sqlite sintético) | upsert-por-slug executado 2×: progresso intacto e idêntico entre execuções; slug novo entra sem delete | **PASS** |
| MIG-B2 | idempotência | ZAI seed.ts | `deleteMany` do seed destrói todo o progresso — reproduz o perigo; R8: seed **somente** em banco efêmero | **PASS** (negativo) |
| MIG-B3 | idempotência | literacyDojo | `migrate(migrate(v1))==migrate(v1)` (ponto-fixo); re-run com mesma `contentVersion` não re-força revisão | **PASS** (6/6 vitest) |
| MIG-C1 | estados parciais | ZAI | linha `completed=0, attempts=3, bestScore=55` sobrevive intacta a update de conteúdo (R9: completed E in_progress preservados) | **PASS** |
| MIG-C2 | estados parciais | literacyDojo | mix `locked/available/in_progress/completed` + `currentLessonId` sobrevive ao bump; `in_progress` não vira `completed`; nada vira `mastered` | **PASS** (6/6 vitest) |
| MIG-C3 | estados parciais | cross-store | mesma lição canônica `completed` no ZAI e `in_progress` no literacyDojo: **sem contrato de resolução** | **GAP-G4** (caso definido, decisão pendente) |
| MIG-D1 | colisão de IDs | ZAI | 2ª Lesson com slug existente rejeitada por UNIQUE | **PASS** |
| MIG-D2 | colisão de IDs | ZAI | slug retirado e reusado por conteúdo novo: FK re-atrela, mas join slug→`l\d{2}` ligaria progresso à lição **errada**; “renomear slug = novo ID, nunca reusar” (R9) **não tem enforcement** | **GAP-G1/G2** |
| MIG-D3 | colisão de IDs | ZAI | duplicata `(learnerId, lessonId)` rejeitada por `@@unique` | **PASS** |
| MIG-E1 | rollback | ZAI | backup de arquivo + restore após destruição devolve progresso idêntico (recuperação documentada exigida por R9) | **PASS** |
| MIG-E2 | rollback | literacyDojo | `schemaVersion` futuro (99) e forma corrompida → `UnmigratableProgressError` (fail-closed; recovery = descartar e recomeçar — nunca migração parcial silenciosa) | **PASS** (6/6 vitest) |
| MIG-E3 | rollback | literacyDojo | export/import JSON com `capLessonStatus('mastered')→'completed'` — **coberto** por `progressBackup.test.ts` (referenciado, não duplicado) | **PASS** (refer.) |
| MIG-F1/F2 | fixtures | ZAI | 3 learners sintéticos (empty / partial / full-24) gravados e validados: `completed ∈ {0,1}` sem `mastered`; `completedAt` sse completed; slugs fora do espaço canônico | **PASS** |
| MIG-G1 | identidade/versão | PR #610 | catálogo `2026-09-30.1` == bindings (tracks + runtime) — consistente **dentro** da pilha | **PASS** |
| MIG-G2 | identidade/versão | pilhas congeladas | PR #610 (catálogo `2026-09-30.1`) vs pilha competency PR #612/#617 (base main `1975e2c7`, catálogo `2026-09-10.2`): ao integrar ambas, `validate_tracks` **rejeita** track ai-pratica divergente — integração exige bump único reconciliado; **evidência de receita compatível (r2):** o ensaio isolado AID-3516 (LEE) demonstrou a composição 610@`579ce995` → 612@`d853e4f7` → 617@`f36f8b94` no candidato `3c6bce57`, com revisão FSE aprovada (comentário `38d997ad-563b-4481-80fd-ec85ac183227`, Approved `5faeea8d-44ed-4d1f-a8d9-f8eed421d834`) — citado como reportado; `3c6bce57` não é resolvível neste checkout e **os PRs NÃO foram integrados** | **GAP-G6** |

## 4. Lacunas de contrato para decisão (não decididas aqui)

| # | Lacuna | Evidência | Decisão necessária / dono sugerido |
| --- | --- | --- | --- |
| **G1** | **Sem tabela de alias ratificada** entre slugs legados ZAI (24 módulos + lições) e ids canônicos `l\d{2}`; espaços disjuntos (MIG-A3) e similaridade de título não é alias (MIG-A3b, §2.7 PR #611) | MIG-A3/A3b/D2 | CD/CCE propõem alias por lição **ou** declaram ZAI legado fora da escola unificada (read model futuro, decisão já prevista na spec R6 “ZAI curriculum-data.ts é candidato a read model”); migração de progresso ZAI→unificado fica **bloqueada** até isso |
| **G2** | **Enforcement do “renomear slug = novo ID, nunca reusar”** não existe no lado ZAI (UNIQUE de slug aceita reuso após retirada — MIG-D2) e o corpus canônico não tem registro de slugs aposentados | MIG-D2 | Dono do futuro PR de migração (Engine Systems) incluir tabela de slugs aposentados + validador; CPE decide se vive no schema ou no crosswalk |
| **G3** | **Projeção progresso→competência indefinida**: `competency` é inerte no compilador (read model byte-idêntico — PR #617); nenhum contrato diz se conclusão de l02 credita F1 (primária) e F4 (apoio) e com que peso | testes de inertude PR #617 | Distinção com LEE: LEE mede evidência de aprendizagem; a lacuna aqui é só o **crédito migratório** (o que uma linha `completed` legada significa por competência). Dono: CD + CPE (semântica), consumidor final LEE/analytics |
| **G4** | **Resolução cross-store ausente**: mesmo learner com `completed` no ZAI e `in_progress` no literacyDojo para a mesma lição canônica (após G1) não tem regra de merge (max? fonte autoritativa? data?) | MIG-C3 | Decisão de produto: qual loja é autoritativa por jornada (ZAI é prática opcional; literacyDojo é a superfície das lições) — sugerido: literacyDojo autoritativo para `l\d{2}`, ZAI nunca rebaixa |
| **G5** | **ZAI sem `contentVersion`**: impossível detectar progresso legado desatualizado vs corpus (literacyDojo tem bump+re-review; ZAI não tem nada equivalente) | grep `contentVersion` em zai-duolingo-like = ∅ | Futuro PR de migração ZAI deve carregar versão; CPE decide formato (campo em Lesson? tabela meta?) |
| **G6** | **Divergência de `contentVersion` entre pilhas congeladas** (PR #610 `2026-09-30.1` vs PR #612/#617 `2026-09-10.2`): integração direta quebra `validate_tracks` (ai-pratica) | MIG-G2 | Frente de integração/coordenação: bump único reconciliado no PR de integração (ordem já prevista: #612 → #617 → rebase em #610 ou bump na integração) . **r2:** a composição já foi demonstrada como receita compatível pelo ensaio isolado AID-3516 (candidato `3c6bce57`, FSE Approved `5faeea8d` via comentário `38d997ad`) — sem integração real dos PRs; a lacuna permanece para a integração futura |

## 5. Reprodução (comandos exatos)

```bash
# Lado literacyDojo (seam): 6 casos B3/C2/E2 — rodados contra código byte-idêntico ao ref congelado
# (verificado: git -C /paperclip/repo diff --stat 579ce995 aid3515/observable-learning-evidence \
#   -- engines/literacyDojo/src/domain/migration.ts engines/literacyDojo/src/domain/progress.ts \
#   engines/literacyDojo/src/data/generated/lessons.ts  => vazio)
cd /paperclip/repo/engines/literacyDojo
# spec temporário (criado, rodado, removido pós-run; NÃO re-rodado no complemento r2):
#   fonte arquivada como anexo b11a645c (restaurada verbatim do transcript do run; a cópia
#   executada original foi deletada — os 6 nomes de teste conferem com o log anexo c7d34c1f;
#   ver PROVENANCE.md, anexo 60503519). Receita pinada: restaurar o arquivo em
#   engines/literacyDojo/tests/domain/aid3523_matrix_seam.test.ts e rodar:
NODE_ENV=development npx vitest run tests/domain/aid3523_matrix_seam.test.ts
# 6/6 passed no run 4c88c212 — log: anexo c7d34c1f (cópia local aid3523-evidence/)

# Lado corpus/bindings/ZAI (sqlite sintético schema-fiel ao Prisma; efêmero em /tmp):
python3 /paperclip/aid3523-evidence/run_matrix.py   # 16 casos -> matrix_run.json
```

Fixtures sintéticas reutilizáveis pelo futuro PR de migração (R9 exige fixtures antes/depois): `aid3523-evidence/synthetic_fixtures.json` (learners empty/partial/full-24; estados sem `mastered`; `completedAt` sse `completed`).

## 7. Manifesto de anexos duráveis (complemento r2 — comentário `776b4df2`)

Todos com SHA-256 computado localmente e conferido pelo hash do próprio attachment da issue (fixtures **sintéticas** apenas; sem dados de aprendizes reais, tokens, ambiente ou segredos).

| Anexo (id) | Arquivo | SHA-256 | Papel | Refs exatas |
| --- | --- | --- | --- | --- |
| `c617bb34` | `run_matrix.py` | `04cdae5c92bf28f36d2c1d1b1dd63716f12ae4e57ac424352197100c208b650c` | runner dos 16 casos A/B/C/D/E/F/G (sqlite sintético schema-fiel ao Prisma; efêmero em /tmp; refs lidas via `git show`) | corpus/bindings/ZAI @ `579ce995`; corpus ratificado @ `f36f8b94` (base `d853e4f7`/`1975e2c7`) |
| `140a2be2` | `matrix_run.json` | `d9ae79086aaba609c1800f1fe91652840c7085ff85978715c0e925ee2a9561cd` | resultado 1º-mão dos 16 casos (13 PASS · 1 INFO · 2 GAP · 0 FAIL) | saída do run `4c88c212` |
| `eafccede` | `synthetic_fixtures.json` | `9feb35148f995d845333d1877a0aa86e1ce40dcda3a6e01cc056e4db10afee10` | fixtures sintéticas reutilizáveis (R9): learners `synth-empty/partial/full-24` | espaço canônico `l\d{2}` @ `f36f8b94` |
| `c7d34c1f` | `vitest_aid3523_seam.log` | `7a8dfd5914b144b09d3d9e4f41519264a686e628c9768d675c7ac5d5c07938a6` | log vitest 6/6 (B3/C2/E2) rodado contra código byte-idêntico ao congelado (diff verificado) | `engines/literacyDojo/src/domain/{migration,progress}.ts` @ `579ce995` ≡ checkout do run |
| `b11a645c` | `vitest_spec_aid3523_matrix_seam.test.ts` | `9b7bd7001a0aec65d2ef37188b85b6928c7215923ba05753ba4a99a8be6255cf` | fonte do spec temporário — **restaurada verbatim do transcript do run** (cópia executada removida pós-run; 6 nomes de teste conferem com o log) | idem log `c7d34c1f` |
| `60503519` | `PROVENANCE.md` | `1ed8b750aabcbd872b03f6239319631e985433a5aab9620578c96e048693a153` | nota de proveniência da restauração e do não-re-run | run `4c88c212`; comentários `8b048a6f`/`776b4df2` |

Caminho local original (efêmero): `/paperclip/aid3523-evidence/`. Reprodutibilidade **completa** do lado vitest depende da restauração do spec a partir do anexo `b11a645c` (a cópia executada não existe mais em disco); os demais 4 artefatos são cópias byte-a-byte do que rodou/foi produzido no run.

## 6. Aceite (auto-verificação)

- Casos reproduzíveis publicados neste issue com resultado observado e comando. ✔
- Lacunas de contrato para decisão (6) com evidência e dono sugerido, **sem decidir** nenhuma. ✔
- Contratos existentes de CPE e os 32 mapeamentos ratificados referenciados (§1). ✔
- Nenhum campo redefinido; branches congeladas intocadas (0 commits, 0 push; árvore de trabalho limpa). ✔
- Distinto do consumer contract de CPE e dos testes de progressão de LEE (§1, G3). ✔
- Complemento r2: anexos duráveis + manifesto §7; lanes corrigidas (3515 = Learner Analytics, 3516 = ensaio LEE); G6 com evidência de receita compatível do ensaio 3516 (PRs não integrados); sem re-run, sem commit/push/PR, sem filho novo. ✔

## Document `Continuation Summary` (2026-09-30)

# Continuation Summary

- Issue: AID-3523 — ES — matriz de testes de migração/compatibilidade: progresso legado ↔ contrato curricular unificado
- Status: done
- Priority: medium
- Current mode: review
- Last updated by run: 8eb4b864-d265-48bc-9ffc-a480e375ab34
- Agent: Engine Systems Engineer (opencode_local)

## Objective

Lote operacional founder (AID-3307 comment 4e9668b1, frente 6). Dono: Engine Systems.

**Entregável:** matriz de testes de migração/compatibilidade entre progresso legado e o contrato curricular unificado ACEITO: identidade, idempotência, estados parciais, colisões de IDs, rollback e fixtures sintéticas.

**Aceite:** casos reproduzíveis + lacunas de contrato para decisão, publicados neste issue. Referenciar os contratos existentes de CPE e os 32 mapeamentos ratificados. NÃO redefinir campos nem editar branches congeladas. Distinto do consumer contract de CPE e dos testes de progressão de LEE.

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `8eb4b864-d265-48bc-9ffc-a480e375ab34` finished with status `succeeded` at 2026-09-30T22:06:13.174Z.
- Restoring the temp spec source verbatim from the run transcript (executed copy was deleted post-run, as documented):

Uploading the artifacts as durable attachments to the issue:

Attachments verified server-side (API SHA-256s match local). Now updating the document with surgical precision fixes (lanes, G6 rehearsal evidence, spec provenance) + manifest section, as an r2 revision:

r2 published. Posting the short receipt and closing:

Complement delivered — **done** (documentary scope).

**Attachments** (6, hashes verified against server-side SHA-256): `run_matrix.py` `04cdae5c…`, `matrix_run.json` `d9ae7908…`, `synthetic_fixtures.json` `9feb3514…`, `vitest_aid3523_seam.log` `7a8dfd59…`, spec source `9b7bd700…`, `PROVENANCE.md` `1ed8b750…` — all synthetic, no real learner data/secrets.

**Honesty on the spec source**: the executed copy was deleted post-run; the attachment is the verbatim source restored from the run transcript (6 test names match the archived log; provenance documented in `PROVENANCE.md` and doc §5).

**Document corrected (r2)**: manifest §7 added; lanes fixed (AID-3515 = Learner Analytics, AID-3516 = LEE rehearsal); G6 now records the compatibl
[truncated]

## Files / Routes Touched

- No file or route paths were detected in the captured run summary.

## Commands Run

- Heartbeat run `8eb4b864-d265-48bc-9ffc-a480e375ab34` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (3)

**Engine Systems Engineer** · 2026-09-30T21:17:33.752476+00:00

# AID-3523 — entregável publicado: matriz de testes de migração/compatibilidade (r1)

**Documento:** `matriz-migracao-compat-r1` (id `463f46c4`) neste issue — 21 linhas de casos, 16 executados agora (**13 PASS · 1 INFO · 2 GAP-por-design · 0 FAIL**), 6 lacunas de contrato para decisão, comandos de reprodução exatos.

**Refs congeladas pinadas:** PR #610 `579ce995` · PR #612 `d853e4f7` · PR #617 `f36f8b94` (32 mapeamentos ratificados, AID-3497 r3) · PR #611 `ea97c89d` (auditoria/crosswalk CPE). Zero commits/push; branches congeladas intocadas; nenhum campo redefinido; distinto do consumer contract de CPE (aid3514) e dos testes de progressão de LEE (PR #621).

## Executado nesta rodada (1º-mão)
- **Identidade:** 32 ids canônicos únicos `^l\d{2}$` com `competency` ⊆ glossário (PR #617); 39 bindings (23 ai-pratica + 16 dev) com `missionId==lessonId`/`unitId==ai-literacy:{id}`; read model literacyDojo compilado do corpus congelado expõe exatamente os 32 ids; **espaços de identidade ZAI↔canônico são disjuntos** (interseção exata = ∅).
- **Idempotência:** upsert-por-slug 2× em sqlite sintético schema-fiel (progresso intacto); perigo do `seed.ts` ZAI (`deleteMany`) reproduzido mecanicamente (R8); ponto-fixo da cadeia forward-only do literacyDojo (`migrate∘migrate == migrate`) — 6/6 vitest.
- **Estados parciais:** linha `completed=0/attempts=3` ZAI e mix `locked/available/in_progress/completed` literacyDojo sobrevivem intactos; `in_progress` não vira `completed`; nada vira `mastered`.
- **Colisões de IDs:** UNIQUE de slug e `@@unique([learnerId,lessonId])` rejeitam duplicatas; **reuso de slug aposentado re-atrela progresso à lição errada sem enforcement** (→ G1/G2).
- **Rollback:** backup/restore file-level ZAI devolve progresso idêntico (R9); `schemaVersion` futuro/corrompido no literacyDojo → `UnmigratableProgressError` fail-closed (recovery = descartar, nunca migração parcial silenciosa).
- **Fixtures sintéticas:** 3 learners (empty/partial/full-24) gravados em `aid3523-evidence/synthetic_fixtures.json`, validados sem `mastered` — reutilizáveis pelo futuro PR de migração (R9).

## Lacunas para decisão (detalhe no doc §4; nada decidido aqui)
- **G1** alias ZAI→`l\d{2}` inexistente (migração de progresso ZAI bloqueada até ratificação — CD/CCE) · **G2** registro de slugs aposentados sem enforcement · **G3** crédito migratório progresso→competência indefinido (CD+CPE; distinto de LEE) · **G4** resolução cross-store completed/in_progress sem regra (sugerido: literacyDojo autoritativo para `l\d{2}`) · **G5** ZAI sem `contentVersion` · **G6** **divergência de contentVersion entre pilhas congeladas** (PR #610 `2026-09-30.1` vs PR #612/#617 `2026-09-10.2` — integração direta quebra `validate_tracks`; bump único reconciliado necessário) — frente de integração/coordenação.

## Evidência
`/paperclip/aid3523-evidence/`: `run_matrix.py` (runner, rerun estável) · `matrix_run.json` (16 resultados) · `vitest_aid3523_seam.log` (6/6) · `synthetic_fixtures.json`. Árvore de trabalho limpa (spec temporário do vitest removido após a execução; código rodado byte-idêntico ao ref congelado, diff verificado).

Aceite do issue cumprido (casos reproduzíveis + lacunas publicados neste issue). Marcando **done**.

**founder** · 2026-09-30T22:03:43.852215+00:00

Complemento delimitado de reprodutibilidade do entregável já aceito nesta issue: a matriz aponta para arquivos locais efêmeros em /paperclip/aid3523-evidence. Preserve os artefatos existentes como anexos duráveis desta mesma issue, com um manifesto de nome, SHA-256, papel e refs exatas: run\_matrix.py, synthetic\_fixtures.json, matrix\_run.json, vitest\_aid3523\_seam.log e o fonte do spec temporário se ainda estiver arquivado como declarado. Use só fixtures sintéticas; não inclua dados de aprendizes reais, tokens, ambiente, logs não relacionados ou segredos. Não fabrique arquivo ausente nem alegue reprodutibilidade completa se algum material não existir.



Não rode novamente as suites e não transforme isso em mudança de produto/teste protegido: nenhum commit/push/PR, nenhum schema/runtime, nenhuma migração real e nenhum filho novo. O objetivo é tornar reproduzível o que já foi executado, com receita e evidência recuperáveis fora do path temporário.



Atualize apenas a precisão do doc: G6 continua relevante para uma integração real futura, mas o ensaio isolado 3516 já demonstrou a composição 610@579ce995 → 612@d853e4f7 → 617@f36f8b94 no candidato 3c6bce57, revisado por FSE no comentário 38d997ad-563b-4481-80fd-ec85ac183227 (Approved 5faeea8d-44ed-4d1f-a8d9-f8eed421d834). Registre isso como evidência de receita compatível nos pins, sem dizer que os PRs foram integrados e sem repetir o ensaio. Corrija também a atribuição: 3515 é Learner Analytics, 3516 é o ensaio LEE; não confundir as lanes. G1–G5 permanecem decisões delimitadas, sem aliases inventados ou crédito automático de competência.



Aceite deste complemento: links dos anexos + hashes + receita pinada + documento corrigido; um recibo curto e Done no escopo documental. Respeite 403/409/422 e propriedade do estágio, sem reversão de papel para conseguir escrita.

**Engine Systems Engineer** · 2026-09-30T22:06:06.395184+00:00

Recibo do complemento (comment 776b4df2) — escopo documental, nada re-executado, zero commit/push/PR, zero filho:

**Anexos duráveis publicados nesta issue** (SHA-256 conferido: hash local == hash do attachment):
- `c617bb34` run_matrix.py — `04cdae5c…650c` · `140a2be2` matrix_run.json — `d9ae7908…61cd` · `eafccede` synthetic_fixtures.json — `9feb3514…ee10` · `c7d34c1f` vitest_aid3523_seam.log — `7a8dfd59…38a6` · `b11a645c` vitest_spec_aid3523_matrix_seam.test.ts — `9b7bd700…55cf` · `60503519` PROVENANCE.md — `1ed8b750…a153`
- Conteúdo recuperável via `/api/attachments/{id}/content`. Apenas fixtures sintéticas (`synth-*`); sem dados reais, tokens, ambiente ou segredos.

**Fonte do spec temporário — honestidade:** a cópia executada foi removida pós-run (como documentado); o anexo `b11a645c` é a fonte **restaurada verbatim do transcript do run 4c88c212**, com os 6 nomes de teste conferindo com o log `c7d34c1f`; proveniência em `60503519`. Reprodutibilidade do lado vitex depende dessa restauração (receita pinada no doc §5) — os demais 4 artefatos são cópias byte-a-byte do que rodou.

**Documento corrigido (r2, mesma chave `matriz-migracao-compat-r1`, base `cbe87717`):** manifesto §7 (nome/SHA-256/papel/refs); **lanes corrigidas** — AID-3515/PR #621 = **Learner Analytics**, ensaio de composição = **AID-3516 (LEE)**; **G6** agora registra a **receita compatível demonstrada** pelo ensaio 3516 (composição 610@`579ce995` → 612@`d853e4f7` → 617@`f36f8b94` no candidato `3c6bce57`; revisão FSE comentário `38d997ad`, Approved `5faeea8d`) — citado como reportado (o commit não é resolvível neste checkout) e **os PRs seguem NÃO integrados**; G1–G5 inalterados, sem aliases inventados, sem crédito automático de competência.

Done no escopo documental do complemento.

---

