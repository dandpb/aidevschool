<!-- issue: AID-3523 | key: matriz-migracao-compat-r1 | doc_id: 463f46c4-595c-4906-957c-a8032d4c51ee | updated: 2026-09-30 22:05:54.906+00 -->

# Matriz de testes de migração/compatibilidade — progresso legado ↔ contrato curricular unificado (r2: precisão + manifesto de anexos)

(AID-3523)

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
| `c617bb34` | `run_matrix.py` | `[REDACTED-HASH64]` | runner dos 16 casos A/B/C/D/E/F/G (sqlite sintético schema-fiel ao Prisma; efêmero em /tmp; refs lidas via `git show`) | corpus/bindings/ZAI @ `579ce995`; corpus ratificado @ `f36f8b94` (base `d853e4f7`/`1975e2c7`) |
| `140a2be2` | `matrix_run.json` | `[REDACTED-HASH64]` | resultado 1º-mão dos 16 casos (13 PASS · 1 INFO · 2 GAP · 0 FAIL) | saída do run `4c88c212` |
| `eafccede` | `synthetic_fixtures.json` | `[REDACTED-HASH64]` | fixtures sintéticas reutilizáveis (R9): learners `synth-empty/partial/full-24` | espaço canônico `l\d{2}` @ `f36f8b94` |
| `c7d34c1f` | `vitest_aid3523_seam.log` | `[REDACTED-HASH64]` | log vitest 6/6 (B3/C2/E2) rodado contra código byte-idêntico ao congelado (diff verificado) | `engines/literacyDojo/src/domain/{migration,progress}.ts` @ `579ce995` ≡ checkout do run |
| `b11a645c` | `vitest_spec_aid3523_matrix_seam.test.ts` | `[REDACTED-HASH64]` | fonte do spec temporário — **restaurada verbatim do transcript do run** (cópia executada removida pós-run; 6 nomes de teste conferem com o log) | idem log `c7d34c1f` |
| `60503519` | `PROVENANCE.md` | `[REDACTED-HASH64]` | nota de proveniência da restauração e do não-re-run | run `4c88c212`; comentários `8b048a6f`/`776b4df2` |

Caminho local original (efêmero): `/paperclip/aid3523-evidence/`. Reprodutibilidade **completa** do lado vitest depende da restauração do spec a partir do anexo `b11a645c` (a cópia executada não existe mais em disco); os demais 4 artefatos são cópias byte-a-byte do que rodou/foi produzido no run.

## 6. Aceite (auto-verificação)

- Casos reproduzíveis publicados neste issue com resultado observado e comando. ✔
- Lacunas de contrato para decisão (6) com evidência e dono sugerido, **sem decidir** nenhuma. ✔
- Contratos existentes de CPE e os 32 mapeamentos ratificados referenciados (§1). ✔
- Nenhum campo redefinido; branches congeladas intocadas (0 commits, 0 push; árvore de trabalho limpa). ✔
- Distinto do consumer contract de CPE e dos testes de progressão de LEE (§1, G3). ✔
- Complemento r2: anexos duráveis + manifesto §7; lanes corrigidas (3515 = Learner Analytics, 3516 = ensaio LEE); G6 com evidência de receita compatível do ensaio 3516 (PRs não integrados); sem re-run, sem commit/push/PR, sem filho novo. ✔
