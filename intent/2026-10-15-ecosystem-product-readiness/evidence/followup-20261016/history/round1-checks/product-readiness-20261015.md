# Prontidão dos 14 engines — implementação

Task: intent/2026-10-15-ecosystem-product-readiness/plan.md

Profile: light (default; no declaration in applicable AGENTS). Handoff: on, budget 150k reading tokens per batch.
Base: 0a2e2dbeda5e41b00642a5280e40a0d8102d1102. Local implementation authorized by Daniel's direct invocation of heropa:sdlc-implement; no push/deploy/production write authorization inferred.

Sources:

- `intent/2026-10-15-ecosystem-product-readiness/plan.md` — sole task, 34 criteria, order #657 → #656 → all14 → claims/acceptance.
- `intent/2026-10-15-ecosystem-product-readiness/spec.md` — canonical artifact chain and flagged prerequisites.
- `intent/2026-10-15-ecosystem-product-readiness/design.md` — **binding for Journey/Shape/Boundary**, existing UI/copy; no new screens.
- `intent/2026-10-15-ecosystem-product-readiness/qualification-matrix.md` — per-engine commands, declared variants and isolation.
- `intent/2026-10-15-ecosystem-product-readiness/evidence/manifest.json`, `planning-evidence.json` — historical probes vs planning snapshot; not runtime qualification.
- PR657 head817b9872 and PR656 headb29631ee, full diffs and comments — reuse implementation, not approval of this integrated candidate.
- `owner-approval-pr656.json` — direct human approval, exact protected-test diff sha2566356f5b8a33f50506ec49ec09e54455d33defa95270744471f7caa2d937940e6. PR657 pre-existing approval/trailer preserved, no expanded override.
- learner/gate/{canonical_gate.py,verifier_receipt.py,evidence_io.py}, substrate/gate.py, Literacy canonical l02v4/evaluation/verification; REGRANT-RUNBOOK, CLI/observations loader, ci.yml, AGENTS/REVIEW — existing contracts and authority.

## Out of scope

All plan Out of scope clauses remain binding: no new journeys/platform/identity merge/autonomy, no RC662 claim on main, no production data or real-channel cron. Newly observed bugs get own intent. External PR publication, push, deploy, merge and human pilot acceptance remain distinct proofs/actions.

## Landing

Reuse the actual PR657 and PR656 code and tests, existing gate/receipt/NDJSON seams, existing engine runtimes and readiness authority. New tests/probes/observation scripts are those explicitly authorized in discovery Shape/Adds; names below for new files are planned proofs, not claimed existing tests. Build them from the numbered task before applying the production fix and retain their failing-first result where applicable.

| One-way door | Literal shape | Alternative rejected |
|---|---|---|
| New game promotion | separated confined digest-bound isolated receipt at canonical decision seam; old valid history remains valid | trusting producer metrics permits forged mastery; retroactive re-adjudication changes historical data |
| Public literacy contract | l02v4, ordered skillIds entender/avaliar, exact activity/type, receipt1-netlify-l02-v4 with identity/digest and producer_writes_mastered:false | forcing v3 or only a3 breaks current content/last-passing selection |

Nothing else in this change is hard to reverse. Existing README contracts are the durable log; no new ADR or authority is introduced.

Initial Status lines are extraction state; live results are recorded in the implementation report and independent verified report. Checks and proofs are frozen before product edits.

## Checks

### S1 — Gate de jogos recusa promoção sem verificador — PR #657 · 40 input files · 359891 bytes · ~89973 reading tokens

**C1** — Dado um aprendiz temporário em `evaluating` e evidência GATEKEEPER ou Pixel com `pass:true` e métricas autoconsistentes, quando falta recibo independente, a decisão é inelegível (`ok=false`, `passed=false`, sem receipt): zero transição, zero review e zero consumo de `evidence_ts`; o estado permanece byte a byte igual.
Proof: `python -m pytest learner/gate/tests/test_gate.py::TestCheckEvidence::test_game_pass_without_verifier_receipt_is_not_eligible learner/gate/tests/test_gate.py::TestDecide::test_forged_pass_without_receipt_never_decides_passed learner/gate/tests/test_readiness_plan_contract.py::test_no_receipt_preserves_state -vv`
Status: unverified.

**C2** — Dado recibo com digest de outro registro, caminho fora de `learner/verifier_receipts`, contexto não isolado ou bloco `verifier` embutido pelo produtor, a tentativa não promove `mastered`; cada rejeição conserva o estado e identifica a violação do vínculo existente.
Proof: `python -m pytest learner/gate/tests/test_gate.py::TestCheckEvidence::test_embedded_verifier_cannot_override_producer_judgment learner/gate/tests/test_gate_multirecord_receipt_binding.py::TestMultirecordEndToEnd::test_multirecord_receipt_for_other_unit_record_is_not_eligible learner/gate/tests/test_readiness_plan_contract.py::test_invalid_receipt_preserves_state -vv`
Status: unverified.

**C3** — Dada a mesma tentativa com recibo separado, confinado e digest-bound, `context_isolated=true`, PASS e scores nos thresholds configurados, o gate produz `pass_first_try`/`mastered`; após retry legítimo produz `pass_retried`, registrando a fonte do verificador no review.
Proof: `python -m pytest learner/gate/tests/test_gate.py::TestDecide::test_pass_first_try learner/gate/tests/test_gate.py::TestDecide::test_pass_after_retry learner/gate/tests/test_gate.py::TestEndToEnd::test_pixelquest_pass_with_digest_bound_receipt_masters learner/gate/tests/test_readiness_plan_contract.py::test_retry_receipt_persists_source -vv`
Status: unverified.

**C4** — Uma tentativa legítima `pass:false` continua elegível para resultado `fail`: o aprendiz permanece `evaluating`, `retry_count` aumenta em 1 e o retry documentado continua possível; a exigência de recibo para um pass não converte todo insucesso pedagógico em erro de integridade.
Proof: `python -m pytest learner/gate/tests/test_gate.py::TestDecide::test_failed_run_gates_to_fail learner/gate/tests/test_gate.py::TestApplyGate::test_fail_increments_retry_and_keeps_evaluating -vv`
Status: unverified.

**C5** — Um NDJSON legítimo seleciona o último registro da unidade ativa e vincula o recibo a esse registro; outras unidades não o substituem. Após commit no repositório temporário, `load_and_validate` aceita o backing. Sem registro correspondente, o CLI retorna `NOTHING TO GRADE`/exit 0 sem escrever; linha corrompida ou não objeto é recusada.
Proof: `python -m pytest learner/gate/tests/test_gate_multirecord_receipt_binding.py::TestMultirecordEndToEnd::test_gates_latest_matching_record_with_receipt learner/gate/tests/test_gate_multirecord_receipt_binding.py::TestMultirecordEndToEnd::test_persisted_multirecord_state_revalidates learner/gate/tests/test_gate.py::TestLoadEvidenceNdjson::test_malformed_line_rejects_whole_file learner/gate/tests/test_gate.py::TestLoadEvidenceNdjson::test_non_object_line_rejected learner/gate/tests/test_readiness_plan_contract.py::test_nothing_to_grade_cli_does_not_write -vv`
Status: unverified.

**C6** — Um estado histórico válido com `mastered` anterior à exigência de recibo continua validando sem reescrita de reviews ou migração retroativa; não se altera `standards.py` ou flags de rubrica para contornar a correção no seam de decisão.
Proof: `python -m pytest learner/gate/tests/test_gate.py::TestEndToEnd::test_historical_mastered_without_receipt_still_validates -vv`
Proof: `git diff 0a2e2dbeda5e41b00642a5280e40a0d8102d1102 -- learner/gate/standards.py learner/gate/evidence_rubrics.yaml learner/learning_state.yaml`
Status: unverified.

**C7** — Depois de consumir uma evidência, sua repetição continua recusada pelo guard existente de timestamp/digest/identidade da tentativa, sem segundo review. `--dry-run` mantém zero escrita tanto no caso positivo quanto no negativo.
Proof: `python -m pytest learner/gate/tests/test_gate.py::TestGateIntegrity::test_same_payload_with_bumped_timestamp_is_rejected_by_digest learner/gate/tests/test_gate.py::TestGateIntegrity::test_ignored_producer_nonce_cannot_bypass_consumed_evidence learner/gate/tests/test_gate.py::TestGateIntegrity::test_same_run_id_with_changed_payload_is_rejected learner/gate/tests/test_gate.py::TestCli::test_dry_run_writes_nothing learner/gate/tests/test_readiness_plan_contract.py::test_replay_preserves_consumed_state -vv`
Status: unverified.

### S2 — Literacy verifica as três atividades v4 — PR #656 · 11 input files · 293192 bytes · ~73298 reading tokens

**C8** — Um registro honesto l02 v4 de cada atividade `l02-a1/output_comparison`, `l02-a2/choice` e `l02-a3/sort`, com resposta aprovada pelo avaliador atual, recebe recibo `PASS`, `independent_pass:true` e `verifier_version:"1-netlify-l02-v4"`, vinculado ao digest e à identidade exatos da tentativa.
Proof: `node --test --test-name-pattern="plan: complete v4 receipt binding" learner/gate/tests/literacy_verify_readiness_plan.test.mjs`
Status: unverified.

**C9** — O verificador recompõe os checks, score e pass a partir de `answer`, conforme as regras atuais transcritas em Proof. Alterar somente `deterministicChecks`, `score` ou `pass` gera `FAIL` com o erro de divergência correspondente e `mastery_eligible:false`; uma resposta honestamente incorreta gera `FAIL` pedagógico e pode ter `errors:[]`.
Proof: `node --test --test-name-pattern="plan: independent tamper rejection" learner/gate/tests/literacy_verify_readiness_plan.test.mjs`
Status: unverified.

**C10** — v3 legado, identidade/tipo/skillIds incompatíveis ou `activityId` ausente, null, numérico, booleano, array ou objeto recebem recibo `FAIL`, sem coerção para uma atividade válida e sem exception. A mudança não exige reescrever recibos históricos aceitos pelo cliente agnóstico à versão.
Proof: `node --test learner/gate/tests/literacy_verify_identity.test.mjs`
Proof: `node --test --test-name-pattern="plan: invalid identity and legacy contract" learner/gate/tests/literacy_verify_readiness_plan.test.mjs`
Proof: `(cwd engines/literacyDojo) npm run test -- tests/domain/verification.test.ts`
Status: unverified.

**C11** — Na lição real, a última evidência passante selecionada por `LessonScreen` chega a `ResultScreen` e recebe recibo válido correspondente, seja a1, a2 ou a3. O resultado continua progresso local; zero escrita de `mastered` no aprendiz canônico.
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs literacyDojo last-passing-evidence`
Status: unverified.

**C12** — Com o transporte de verificação indisponível/rejeitado, a tela de resultado preserva progresso/evidência e oferece retry; após restaurar o endpoint, uma nova tentativa de verificar recebe recibo vinculado. Mock de HTTP ou fallback sozinho não encerra esse critério.
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs literacyDojo verifier-outage-retry`
Status: unverified.

**C13** — Se o piloto oferecer o verificador publicado, a prova registra URL/origem, deploy ID, source SHA e `verifier_version`, com positivos a1/a2/a3 e negativos de identidade/adulteração executados no endpoint real; merge ou E2E do Vite não substitui essa prova.
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs literacyDojo deployed-verifier`
Status: unverified.

### S3 — Os reparos têm prova no candidato que será integrado · 6 input files · 178264 bytes · ~44566 reading tokens

**C14** — Cada PR, após sincronizar com main e incorporar os ajustes necessários, tem diff completo revisto, provas funcionais discriminantes, revisão independente e checks requeridos `success` no head/merge-ref correspondente. O #657 obtém novos resultados para os três checks cancelados; o #656 resolve proteção de testes com aceite rastreável do owner e registra produtor real antes do countersign. O corpo de cada PR passa a refletir seu escopo real, sem declarar aprovações inexistentes.
Proof: `gh pr checks 657 --repo dandpb/aidevschool --required`
Proof: `gh pr checks 656 --repo dandpb/aidevschool --required`
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py delivery-heads`
Status: unverified.

**C15** — A integração preserva o protocolo local: atualização de `MANIFEST.md` junto das mudanças de gate/contrato, countersign de agente distinto pinado ao head final e merge somente pela porta `scripts/merge_pr.sh`, quando autorizado. Quando o diff atingir specs/`sourcePaths` de claims publicadas, o lote só fecha com re-grant emparceirado completo e lane de claims de main verde. Um avanço de main que altere a fonte coberta exige nova âncora/prova.
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py merge-records`
Status: unverified.

### S4 — Cada engine tem resultado observável no uso que oferece · 54 input files · 195990 bytes · ~48998 reading tokens

**C16** — O pacote informativo contém exatamente os 14 `engineId` de Journey, sem duplicatas, e todos os campos de Shape/Adds: `declaredUse`, `entry`, `runtime`, `sourceCommit`, `sourceFingerprint`, `observedAt`, `producerContext`, `verifierContext`, `cases`, `evidenceRefs`, `limitations`, `linkedUseCases`, `status`. Cada caso obrigatório e variante oferecida tem fonte da promessa, resultado e prova com digest; contextos de produtor/verificador são distintos. `pass` exige todos os casos obrigatórios comprovados; falha comprovada gera `blocked`, prova ausente gera `unverified`; inaplicabilidade tem justificativa com fonte.
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py engine-packets`
Status: unverified.

**C17** — `aiDevschoolMvp`: no harness oferecido e em perfil isolado, tentativa representativa → gates G1–G4 → agendamento/recomputação → card/ledger próprios funciona, incluindo negativa pedagógica/retry/retorno. Script com exit não zero repassa o erro literalmente e para, conforme a SKILL; não se faz autoreparo ou retry improvisado. O registro identifica as variantes dos 24 conceitos e plataformas cobertas; G4 usa o caminho existente de julgamentos por digest. Ausência de julgamento live não é suprida com fixture apresentado como IA real; zero promoção canônica e zero entrega a canal real.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `python3 -m pytest engines/aiDevschoolMvp/tests/acceptance/test_acceptance_full.py::test_state_machine_eight_transitions_and_guards engines/aiDevschoolMvp/tests/acceptance/test_acceptance_full.py::test_scheduler_review_due_idempotency_and_quiet_hours engines/aiDevschoolMvp/tests/installer/test_install.py::test_check_is_read_only -vv`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs aiDevschoolMvp declared-use`
Status: unverified.

**C18** — `codexDojo`: dashboard lê a projeção, apresenta a próxima ação e permite copiar o prompt; a ponte OS configurada abre o destino correto e a configuração ausente mantém o comportamento documentado, sem escrita em `learner/`.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `pnpm exec playwright test playwright/smoke.spec.ts --grep "codexDojo dashboard mounts|linuxLab view stays"`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs codexDojo declared-use`
Status: unverified.

**C19** — `codexdojo-os-prototype`: primeira entrada → escolha de trilha → missão suportada → resultado → retorno no mesmo perfil funciona, incluindo falha de host/verificação e storage limpo. O conjunto oferecido de missões/adaptadores tem cobertura explícita; listagem de catálogo ou bundle não conta como missão executada. Progresso local e ações do Hub não promovem maestria.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `npx playwright test tests/release-journeys.smoke.spec.ts tests/readiness-recovery.smoke.spec.ts tests/chapter-continuity.smoke.spec.ts tests/renderer-fallback.smoke.spec.ts tests/engines.smoke.spec.ts`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs codexdojo-os-prototype declared-use`
Status: unverified.

**C20** — `dojoToday`: revisões, streak, unidade ativa e próxima ação correspondem à projeção; a prática inline oferecida do jogo 02 funciona e o limite somente leitura permanece observável. Sócrates offline e a configuração BYOK que for oferecida têm resultado/recovery honesto; chave não aparece nos artefatos e limpar configuração remove o dado local correspondente.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `npx playwright test playwright/readiness.spec.ts playwright/continuity.spec.ts playwright/hosted-os.spec.ts playwright/a11y-w3.spec.ts`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs dojoToday declared-use`
Status: unverified.

**C21** — `literacyDojo`: o percurso standalone oferecido de IA Prática cobre suas lições/atividades, feedback, retry, desafios, reviews e retomada local; Dev segue o CTA para OS. Reload no meio da atividade respeita o reinício documentado da lição e não reconstrói respostas transitórias. As três atividades v4 e a recuperação de verificação satisfazem 8–12.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `npx playwright test playwright/vertical-slice.spec.ts playwright/corridor.spec.ts playwright/backup-restore.spec.ts playwright/gamification.spec.ts playwright/escola-map-focus.pwa.spec.ts`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs literacyDojo declared-use`
Status: unverified.

**C22** — `miniMaxEvolutionEngine`: um ciclo supervisionado oferecido de cinco fases produz artefatos com produtor/verificador separados; interrupção → status/diagnóstico → recuperação explícita não redispara trabalho automaticamente. Somente se oferecida, a autonomia `spec → spec-done` é observada com seus controles atuais; fixture tracer ou `tick` sem execução de modelo não é prova dessa autonomia.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `python3 -m pytest engines/miniMaxEvolutionEngine/tests/test_supervisor_tracer.py::test_happy_path_autonomous_spec_tracer engines/miniMaxEvolutionEngine/tests/test_supervisor_tracer.py::test_learning_gate_is_read_only engines/miniMaxEvolutionEngine/tests/test_supervisor_tracer.py::test_restart_reconciles_authorized_advance_without_roles -vv`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs miniMaxEvolutionEngine declared-use`
Status: unverified.

**C23** — `miniTown`: entrada → exploração/dia-noite/HUD → saída/reabertura funciona no uso experimental; falha do renderer/rota segue a orientação existente de reload/saída. Não exigir persistência, lição, assessment ou maestria que o contrato exclui.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `pnpm exec playwright test playwright/mini-town.spec.ts --grep "loads the town and advances its public simulation"`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs miniTown declared-use`
Status: unverified.

**C24** — `minimaxDojo`: bootstrap no MiniMax Agent Team → tentativa → Prometor e Crítico em contextos separados → relatório/whiteboard/reflexão funciona, com erro/retry/retomada pelo Maestro. Teste do núcleo Python não substitui a execução da plataforma real, e o whiteboard local não vira autoridade global.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `python3 -m pytest engines/minimaxDojo/tests/test_learning_unit_e2e_contract.py::TestLearningUnitE2EContract::test_verifier_pass_is_the_only_path_to_dominado_and_is_audited engines/minimaxDojo/tests/test_learning_unit_e2e_contract.py::TestLearningUnitE2EContract::test_failed_gate_retries_then_blocks_without_mastery -vv`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs minimaxDojo declared-use`
Status: unverified.

**C25** — `openclaw`: em checkout descartável completo, preview é somente leitura; avanço simulate-grade por checklist e bloqueio por artefato/gate ausente correspondem ao pipeline observado, com retomada dentro do contrato. A CLI deriva a raiz do módulo, portanto zero execução de avanço na árvore compartilhada e zero alegação de IA/maestria empírica.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `python3 -m pytest engines/openclaw/tests/test_cli_preview.py::test_preview_reports_real_checklist_without_writing_canonical_state engines/openclaw/tests/test_cli_preview.py::test_preview_halt_returns_failure_and_reports_actual_source engines/openclaw/tests/test_scheduler.py::test_scheduler_respects_learning_gate engines/openclaw/tests/test_scheduler.py::test_missing_spec_halts -vv`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs openclaw declared-use`
Status: unverified.

**C26** — `pixelDojo`: cada lab oferecido do PixelQuest tem entrada, interação principal, retry/retorno aplicável e evidência NDJSON recuperável para verificador independente; o jogo mantém append-only e não escreve estado canônico. Seeds de brainstorm e a pasta reservada `games/` não entram como jogos lançados.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `pnpm exec playwright test playwright/pixel-quest.spec.ts playwright/encounter-evidence-dense.spec.ts playwright/error-path.spec.ts playwright/evidence-append-only.spec.ts playwright/returning.spec.ts`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs pixelDojo declared-use`
Status: unverified.

**C27** — `school-entry`: catálogo inicial desabilitado → indisponibilidade explícita; operador autenticado configura um destino confiável → checagem inicial → até 3 recomendações elegíveis → lançamento. Anônimo não libera engines. Chave ausente/erro/timeout segue o fallback existente; falha de storage não aparenta liberação bem-sucedida. Checker mantém restrições de rede e não concede prontidão ao destino.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `node --test tests/backend.test.mjs tests/health.test.mjs tests/model.test.mjs tests/browser.spec.mjs`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs school-entry declared-use`
Status: unverified.

**C28** — `sdlc-quest`: os modos oferecidos de campanha/workshop/lab e idiomas funcionam por HTTP e no standalone documentado, com salvar/retomar e export/import com preview. Mudança de origem e perda de aprovações do lab ao importar são explicadas. `set_content` com storage simulado não é prova de HTTP ou `file://` real.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `node --test tests/local-package.test.cjs tests/tlc.test.cjs tests/harness.test.cjs tests/i18n.test.cjs`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs sdlc-quest declared-use`
Status: unverified.

**C29** — `voxelDojo`: os jogos/variantes oferecidos no catálogo têm loop didático L1–L4, recuperação de renderer quando suportada e evidência bruta entregável ao verificador; localStorage sozinho não é prova. Cada jogo declarado recebe resultado próprio; um smoke do jogo 10 não aprova os demais.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `pnpm exec playwright test playwright/warehouse.spec.ts --grep "boots the warehouse|renders an actual WebGL canvas"`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs voxelDojo declared-use`
Status: unverified.

**C30** — `zai-duolingo-like`: as duas entradas de onboarding e o currículo local oferecido têm perfil → lição → progresso → prática/revisão e recuperação documentada, usando DBs de teste isolados. Chat configurado e provider ausente/falhando têm resultados honestos; identidade/progresso continuam próprios. Os modos Next e Bun oferecidos são identificados separadamente, sem reciclar servidor de outra instância.
Existing producer tests below are partial evidence only; full declared-use proof also requires the observation command and all frozen variants.
Proof: `npx playwright test e2e/smoke.spec.ts e2e/navigation.spec.ts e2e/lesson-flow.spec.ts e2e/playground.spec.ts e2e/meta.spec.ts`
Proof: `node intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/observe-engine.mjs zai-duolingo-like declared-use`
Status: unverified.

### S5 — Claims correspondem à fonte e à observação independente · 21 input files · 142630 bytes · ~35658 reading tokens

**C31** — Para os seis casos stale da discovery e quaisquer adicionais invalidados pelo candidato final, há novos fatos e assessments independentes aplicáveis à fonte oferecida; `check --require-current` retorna 0. Assessments e resultados históricos permanecem auditáveis, sem reescrever suas datas/digests para fazê-los parecer novos.
Proof: `python3 docs/product-readiness/tools/cli.py check --require-current`
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py canonical-assessments`
Status: unverified.

**C32** — O relatório dos 14 engines e `engine-qualification.json` permanecem informativos: nenhum `ReadinessTier` é concedido por eles. `aggregate --observations` recebe somente bundles no esquema existente (`observerContext:"independent-readiness-observer"`), nunca o JSON informativo de qualificação; não ocorre erro de shape nem inclusão de casos alheios que rebaixe claims por ausência de observação.
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py authority-separation`
Status: unverified.

**C33** — A árvore integrada prevista e o push-run pós-merge de main passam na lane de claims. `assess`/re-grant promovido inclui observação independente; proposta `pending-observation`/exit 3 e CI de produtor não encerram o lote. Se main avançar sob o fingerprint, a prova é renovada conforme o runbook single-writer.
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py main-claims`
Status: unverified.

### S6 — A oferta tem conclusão fiel à evidência · 3 input files · 85714 bytes · ~21429 reading tokens

**C34** — O relatório final só afirma prontidão do conjunto quando há 14/14 `pass`, zero bloqueio crítico/alto aberto no escopo, claims correntes e provas dos ambientes efetivamente oferecidos; qualquer `blocked`/`unverified` mantém a conclusão global pendente. O resultado observado é apresentado a Daniel para aceite do piloto, separado da aprovação de código/merge.
Proof: `python3 intent/2026-10-15-ecosystem-product-readiness/evidence/scripts/assert-readiness-artifacts.py pilot-offer`
Status: unverified.

## Swept

- validation: C1–3,C5,C8–10,C16 — receipt/identity/structure and all record fields.
- failure modes: C4–5,C12,C17–30 — actual parsing, pedagogy, transport and runtime recovery.
- idempotency and retry: C4,C7,C12; existing replay guards must be re-read by verifier.
- authorization: C2,C14–15,C27; protected-test owner acceptance preserved; public endpoint gains no auth/rate-limit scope.
- concurrency and ordering: C15,C33; single-writer source anchor and private ports/servers/trees; no distributed lock feature.
- data lifecycle: C6,C16–17,C25,C28,C30–31; no history migration or real DB/reset.
- external-dependency failure: C12–13,C17,C20,C22,C24,C27,C30; harness/provider/deploy unavailable stays unverified.
- state transitions: C1,C3–4,C6–7,C31–34; keep completed/mastered/readiness distinct.
- observability: C16,C31–34; explicit argv/cwd/source/time/context/artifact/digest, not a statistically invented SLO.

## Sampling and proof gaps

Profile light: Coverage join/Test policy/fault injection are not added. Runtime-member gaps are still explicit: Pixel existing smoke covers6/18 records and dense5labs; Literacy corridor covers11/23; Zai E2E samples lessons, not27/27; Voxel L1 smoke does not cover all17×L1–L4; agent-core fixtures do not prove live harness. New observations must close these before C17–30 pass. No broad producer suite is substituted for a named assertion or live proof.

C13–15,C33–34 include external publication/deploy/merge/human acceptance not granted by this invocation. Missing access or authorization yields unverified/awaiting_prerequisite, never fabricated green. Source already carries these prerequisites; they do not prevent local code/test work.

Proof cwd: Python/Node observation scripts from repository root; per-engine producer commands from matrix engine cwd (Pixel inside pixel-quest, Voxel example inside game-02-warehouse). Prefix exact evidence commands with rtk proxy; lint retains RTK_DISABLED=1. Batch named proofs by runner with verbose/per-test output; verify names exist and ran. Node/Vitest/Playwright pattern with zero hits never passes a check.

## Handoff

Sizes measured from the retained per-slice input lists in `implementation-reading-size.json`, bytes/4 (floor, excludes iterations). S1=89,973; S2=73,298; S3=44,566; S4=48,998; S5=35,658; S6=21,429 tokens. No slice exceeds150k. Intended batches: B1=S1 (89,973); B2=S2+S3 (117,864); B3=S4+S5+S6 (106,085). Do not split a slice. Handoff only on green of its build proofs; external-go-live prerequisites remain tracked separately and do not become a producer self-report.

No batch has landed yet. Orchestrator owns all checks and dispatches a fresh-context Verifier after the last authorized build; build agents never spawn agents. Every long command is awaited in the same turn.

## Authorization and prerequisites

- Plan/spec/intent accepted for local execution by direct skill invocation. No new question about that accepted scope.
- PR656 protected test edit explicitly approved by Daniel, exact patch6356f5b8…; no other protected-test weakening authorized.
- If a proof contradicts the source or needs changing, stop that work and renegotiate; do not edit checks or weaken expected values. App/harness absence already named in Unresolved is a prerequisite, not an invented product failure.
