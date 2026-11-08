<!-- issue: AID-981 | key: proposal | doc_id: dda4278e-756a-4d06-94ec-f40101c13395 | updated: 2026-09-07 03:15:45.034+00 -->

# AID-981 — PRE-DRAFT spec: elevar 2–3 use cases a customer-ready (proposal rev 1)

(AID-981)

# AID-981 — PRE-DRAFT spec: elevar 2–3 use cases a `customer-ready` (doc `proposal`)

**Status:** PRE-DRAFT revisável (rev 1), pronto para acate do board **condicionado aos gates de sequenciamento** (§8). **Owner:** System Designer (bb7b8143). **Ordem-fonte:** AID-980/A (esta issue, AID-981). **Insumo principal:** consenso AID-900 + input CEO (`8f7fc38b`: "priorizar `dojotoday-daily-guidance` e `voxel-standalone-learning-loop` — são o hábito diário estilo Duolingo"). **Zero produção:** nenhum YAML/commit/branch/PR; nenhum deploy; nenhum issue de produção criado por este documento (dispatch é do CEO, pós-gates).

---

## 0. Sumário executivo e pacote de dispatch

### 0.1 O que isto é
Spec de **elevação de tier** (`validated-journey` → `customer-ready`) de **2–3 use cases**: os 2 priorizados pelo CEO (`dojotoday-daily-guidance`, `voxel-standalone-learning-loop`) + 1 3º candidato a critério da matriz (§3: `pixelquest-evidence-encounter`). Não é spec de feature: o anti-escopo (§7) proíbe inventar qualquer coisa além do critério de tier.

### 0.2 Achado central (evidência, não opinião)
Contra o `policy.yaml` v1, **os 3 candidatos já cumprem 2 dos 3 critérios de cenário e todos os de evidência e manuais**:
- happy-path + recovery com evidência **playwright + observation** — verificado nos YAMLs de `docs/product-readiness/scenarios/` e nos run ids do regrant v33 (`2026-09-06T22:55:00Z-*-e41b9b93`, todos `pass`, `reasons: []`);
- manuais student + facilitator existem (`student-guide.md`/`facilitator-guide.md`, seções programmer-journeys).

O **único gap mecânico de critério é o scenarioKind `continuity`** (exigido só no tier `customer-ready`). O custo real — e o risco real — está em duas coisas que o critério não pega: (a) **rota de entrada alcançável por cliente** (dojoToday é uma projeção gerada sem URL pública evidenciada; voxel/pixelquest são pacotes locais) e (b) **telemetria zero** nas 3 superfícies (AID-913/AID-921 instrumentou só literacyDojo + codexDojo OS — verificado nos fontes: analytics existe apenas em `engines/literacyDojo/src/domain/analytics.ts` e `engines/codexdojo-os-prototype/src/analytics/*`). O "hábito diário estilo Duolingo" que motivou a prioridade é hoje **imensurável**.

### 0.3 Pacote de dispatch (o que o CEO faz pós-gates — minutos)
1. Confirmar os gates de §8: (a) este card aceito; (b) O3-C2 despachada ou deliberadamente enfileirada atrás.
2. Despachar as ordens filhas (esqueletos §9): **T1 FPE produção** (3 cenários continuity + fixtures + bump de `intendedTier`; módulo opcional **T1b telemetria** se D3=ligar) → **T2 QA countersign** (observation + assessment regrant v34 em sweep único + guias + re-render) → merge CEO single-writer, janela entre sessões O1.
3. Registrar no despacho as decisões D1–D3 deste card.

### 0.4 Decisões pedidas ao board (detalhadas em §3–§4)
- **D1 — tamanho do pacote:** 3 use cases (recomendado; 3º sai por custo marginal mínimo) vs 2 (só os priorizados).
- **D2 — escopo de rota no grant:** **(A) recomendado** — grant condicionado a deploy estático mínimo (dojoToday já tem `netlify.toml`; precedente: OS "static pilot" é a rota de 3 use cases customer-ready) vs **(B)** grant na rota atual (gerada/local, sem deploy).
- **D3 — telemetria T1b:** incluir eventos anônimos de funil (padrão AID-913) nas superfícies elevadas vs adiar.

---

## 1. Baseline verificada first-hand (workspace desta issue, main `3fae2095`)

Readiness **v33** @ `e41b9b93`, verificado `2026-09-06T23:10:00Z`, **revalidate-by `2026-10-06`** (assessments `2026-09-06-e41b9b9-ready-r2-regrant-v33.yaml`).

| Use case | Superfície | Tier concedido v33 | Kinds cobertos | Gap vs `customer-ready` (policy v1) |
| --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | dojoToday | validated-journey | happy-path, recovery | **continuity**; rota pública (§2.1 C2); telemetria (C3) |
| `voxel-standalone-learning-loop` | voxelDojo | validated-journey | happy-path, recovery | **continuity**; rota pública (§2.2 V2); telemetria (V3) |
| `pixelquest-evidence-encounter` | PixelQuest | validated-journey | happy-path, recovery | **continuity**; rota pública (§2.3); telemetria |
| `literacy-standalone-first-lesson` / `-corridor-mod01-03` / `os-*` (×3) | — | customer-ready | happy-path, recovery, continuity | — |
| `minitown-explore-only` | miniTown | experimental | happy-path | categorical (fora de escopo, §7) |

Critérios `customer-ready` (policy v1): scenarioKinds `[happy-path, recovery, continuity]` + evidenceKinds `[playwright, observation]` + manuals `[student, facilitator]`. Freshness: `entry-route` é mudança **invalidante** — qualquer deploy de rota exige regrant; por isso o pacote T1+T2 faz deploy e regrant juntos (§4).

Evidência reutilizável (v29+/v31+/v33): os runs happy-path/recovery dos 3 candidatos estão **frescos e `pass`** (v33, revalidate 10-06) — só o cenário novo precisa de run; nada precisa ser refeito.

---

## 2. Gaps exatos e trabalho por use case

### 2.1 `dojotoday-daily-guidance` (prioridade 1 — o hábito diário)
- **C1 — cenário `continuity` (fecha o critério).** Contrato proposto `dojotoday-returning-next-day`: startState `returning-device-next-day` (projeção gerada do dia N+1); steps `[reopen-daily-view, verify-updated-due-review-queue, verify-streak-reconciled, verify-active-unit-consistent, follow-next-action]`; assertions: `schedule-updates-across-days` (playwright, high — a fila FSRS e o streak refletem o dia novo sem carregar estado falso) e `learner-understands-no-eval-carryover` (observation, high — o learner entende que o retorno não avalia nem marca trabalho). Automação: estender `engines/dojoToday/playwright/readiness.spec.ts` (suite `test:readiness` já roda selfcheck + playwright + report).
- **Nota de viabilidade FPE (verificada):** o read model é módulo gerado importado estaticamente (`src/data/today.ts`, consumido em `src/main.ts:18,344`) — o harness de teste precisa de 2 builds com fixtures dia-N/dia-N+1 (ou seam de teste mínimo). Custo contido, sem mudança de comportamento do app. O modo hosted `?host=os` já tem suite própria (`hosted-os.spec.ts`, hardening XSS v28) e **não** é tocado.
- **C2 — rota de entrada (founder-blocked).** Rota atual: "dojoToday generated daily view" com pré-requisito `generated-learner-projection` — não é URL alcançável por cliente; `netlify.toml` existe (deploy estático configurado) mas não há evidência de deploy live. Decisão de serving é da ordem irmã FPE (AID-980/B). Opção recomendada D2-A: deploy estático com **projeção demo declarada** + copy honesta (precedente: rotas "static pilot" do OS).
- **C3 — telemetria (recomendado, não bloqueia tier).** Zero eventos hoje. Para o claim de hábito diário, o evento mínimo útil é `daily-view-open` anônimo (+ optionally hosted variants), no mesmo contrato de funil AID-913. Módulo T1b (D3).

### 2.2 `voxel-standalone-learning-loop` (prioridade 2)
- **V1 — cenário `continuity`.** Contrato proposto `voxel-standalone-return-reentry`: startState `completed-loop-then-closed-game`; steps `[reopen-declared-game, verify-deterministic-restart, locate-or-reexport-evidence-handoff, continue-next-declared-game, identify-verifier-handoff]`; assertions: `reentry-is-deterministic-and-uncorrupted` (playwright, high — reload/re-entry reinicia o loop declarado sem estado corrompido) e `no-false-mastery-on-return` (observation, high — o retorno não transforma evidência bruta em domínio). Automação: estender `game-02-warehouse/playwright/warehouse.spec.ts` (pacote de referência).
- **Nota de honestidade (verificada):** a evidência voxel é **em memória** (`window.__voxelDojoEvidence` + records de console — `warehouse.spec.ts:56,90`); não há persistência. A continuidade contratada acima é a única honesta: re-entry determinístico + handoff do artifact salvo pelo learner. **Não** inventar persistência (§7).
- **Escopo:** assertion de continuidade no pacote de referência (warehouse) + varredura catalog-wide permanece no nível do happy-path (`pnpm run smoke` já cobre todos os 16 do `catalog.json`).
- **V2 — rota de entrada (founder-blocked):** pacote local. Precedente relevante: `os-voxel-guided-missions` chegou a customer-ready **hospedado** no static pilot do OS (embed via `VITE_VOXELDOJO_URL`, `registry.ts:172`). Recomendação D2-A: build estático dos jogos declarados (começando pelo de referência) na mesma decisão de serving.
- **V3 — telemetria:** idem C3 (módulo T1b).

### 2.3 `pixelquest-evidence-encounter` (3º candidato — inclusão recomendada)
- Mesma mecânica exata: +1 cenário `continuity` (`pixelquest-returning-evidence-handoff`: retorno ao app após encounter; evidência bruta registrada continua localizável/identificável para o verificador; replay não corrompe o registro; sem false mastery) + regrant. Suite playwright existe (`pixel-quest/playwright/`).
- **Justificativa pela matriz (§3):** é o único outro `validated-journey` (o campo candidato é fechado); fecha o trio programador (guia diária + loop 3D + encontro 2D) levando o inventário a **7/8** customer-ready; custo marginal é o menor de qualquer candidato pois reutiliza o mesmo padrão de artefato e o mesmo sweep QA; nenhum risco novo. `minitown` fica fora por design (promise explicitamente sem progressão — elevá-lo seria inventar produto).

---

## 3. Matriz custo/valor e recomendação

| Candidato | Gap mecânico | FPE | QA | CD | Valor (superfície/hábito) | Bloqueio founder | Recomendação |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `dojotoday-daily-guidance` | +1 continuity | ≈1,5–2,5h | sweep | 0h | hábito diário (input CEO); cola FSRS→jogos já construída | rota/serving (D2) | **incluir (P1)** |
| `voxel-standalone-learning-loop` | +1 continuity | ≈1,5–3h | sweep | 0h | loop bruto verificável em 16 jogos; base da trilha dev | rota/serving (D2) | **incluir (P2)** |
| `pixelquest-evidence-encounter` | +1 continuity | ≈1–2h | sweep | 0h | fecha trio programador; 7/8 no tier | rota/serving (D2) | **incluir (P3, cabe no envelope)** |
| `minitown-explore-only` | categorical | — | — | — | experimental por design | — | **excluir (anti-escopo)** |

Recomendação única: **pacote de 3** com D2-A e D3=ligar (telemetria mínima nas 3 superfícies). Se o board preferir envelope mínimo: pacote de 2 (P1+P2) com o mesmo D2/D3 — o 3º não cria dependência e pode entrar em sweep futuro.

---

## 4. Dependências entre si e bloqueios founder
- **Entre os 3 candidatos: nenhuma técnica** (engines e cenários independentes). Compartilham: 1 sweep de regrant QA (precedente v33) e o gate de sequenciamento (§8).
- **Founder-blocked (mapeado, não resolvido aqui):** (a) decisão de serving/ambiente para rotas públicas — insumo da ordem irmã **FPE AID-980/B**; (b) para dojoToday: projeção **demo declarada** vs per-learner (per-learner é escopo da decisão de serving, não desta onda); (c) billing/contas/suporte — fora de escopo em qualquer hipótese.
- **Interação freshness × rota:** `entry-route` é invalidante no policy — se D2-A, o deploy e o regrant v34 têm de aterrissar no **mesmo pacote** (T1+T2), senão o grant nasce stale.

---

## 5. Estimativas (rubrica AID-558 rev 2)
- **T1 core (3 cenários continuity + fixtures + bump `intendedTier` no `inventory.yaml`):** FPE ≈**4–7h** (dojoToday 1,5–2,5h c/ harness 2-builds; voxel 1,5–3h; pixelquest 1–2h — incl. rodar suites locais e PR único).
- **T1b telemetria (opcional, D3):** FPE +**2–3h** reusando o contrato de funil anônimo AID-913 (batch, sem PII) nas 3 superfícies; QA +0,5–1h no countersign.
- **T2 QA countersign + regrant v34 (sweep único) + guias + re-render da matriz:** ≈**1,5–2,5h**, 1 ciclo.
- **CD: 0h** (§10). **Wall-clock:** ~1–2 heartbeats FPE + 1 QA (precedentes: sweeps v31–v33).

---

## 6. Riscos e mitigações
- **R1 — "customer-ready" sem rota de cliente enfraquece o nome do tier.** Mitigação: D2-A (grant condicionado ao deploy estático mínimo); se o board escolher D2-B, o grant leva `reason` explícito de escopo de rota no assessment.
- **R2 — projeção demo do dojoToday confundida com orientação per-learner.** Mitigação: copy honesta na view e nos guias ("projeção de demonstração; a sua jornada vive no seu dispositivo/repo"), telemetria nomeando o evento `daily-view-open` sem PII.
- **R3 — semântica de evidência diverge entre pacotes voxel.** Mitigação: continuidade contratada só no pacote de referência; catalog-wide permanece no smoke do happy-path; qualquer pacote extra é follow-up, não blocker.
- **R4 — colisão de ondas com O3-C2.** Mitigação: gate duro de sequenciamento (§8) — sem duas ondas de produção simultâneas no mesmo repo.
- **R5 — staleness do regrant.** v33 expira `2026-10-06`; o pacote precisa aterrissar antes, ou o sweep re-valida junto (barato, já feito 2× em v32→v33).

---

## 7. Anti-escopo rígido
- **Nada além do critério de tier:** sem contas, sem sync multi-device, sem per-learner serving, sem billing, sem engine nova, sem redesign de superfície, sem lições/conteúdo novo.
- **Sem persistência inventada** em voxel/pixelquest (evidência bruta segue session-bound + artifact do learner).
- **Sem elevar minitown** e **sem tocar** learner state, gates, mastery ou política do verificador. dojoToday permanece read-only; produtor ≠ verificador preservado.
- **Zero produção nesta ordem** (nem deploy — deploy é T1 pós-gates).

---

## 8. Sequenciamento & gates
- Esta spec é **paralela ao gate d+7** (checkpoint O3-C2 em 2026-09-09); nada aqui o antecipa.
- **Dispatch de produção só após:** (a) **aceitação founder deste card** (confirmação pendente nesta issue) **E** (b) **janela O3-C2 despachada** (pós-GO 09-09) **ou deliberadamente enfileirada atrás** — registro explícito do CEO no despacho. Sem duas ondas simultâneas no mesmo repo.

---

## 9. Esqueletos de ordem prontos para copiar (padrão AID-838 §9.2)

**T1 — FPE produção** *(owner: Founding Product Engineer; blocked-by: gates §8)*
> ORDEM {AID-981}/T1: FPE — produção da elevação de tier (3 use cases): adicionar cenários `continuity` (`dojotoday-returning-next-day`, `voxel-standalone-return-reentry`, `pixelquest-returning-evidence-handoff`) em `docs/product-readiness/scenarios/` + automação/fixtures (readiness.spec.ts 2-builds; warehouse.spec re-entry; pixel-quest spec retorno) + bump `intendedTier: customer-ready` dos 3 no `inventory.yaml` + [se D3=ligar] módulo T1b telemetria de funil anônima (padrão AID-913) nas 3 superfícies + [se D2-A] deploy estático mínimo das rotas declaradas (dojoToday netlify pronto; voxel referência). Zero mudança de comportamento de app fora T1b/rotas. PR único, SDLC completo.

**T1b — módulo opcional embutido em T1** *(só se D3=ligar)*
> Eventos anônimos mínimos (`daily-view-open`; `voxel-loop-complete`/`evidence-handoff`; equivalentes PixelQuest), batch sem PII, mesmo coletor AID-913; sem identificar aprendiz.

**T2 — QA countersign** *(owner: QA; blocked-by: T1)*
> ORDEM {AID-981}/T2: QA — countersign da elevação: evidência observation dos 3 cenários novos + assessment independente regrant **v34** (sweep único, `reasons` explícitos se D2-B) + atualizar copy de tier nos guias (`student-guide.md` hoje diz "permanecem no tier validated-journey — não chame estes últimos de customer-ready") + re-render da matriz (`cli.py render`) + CI verde. Merge CEO single-writer, janela entre sessões O1.

---

## 10. Consulta Content Designer — análise negativa (item 4 da ordem)
Não há implicação de **conteúdo novo**: nenhum YAML de lição, binding ou copy curricular é tocado; os artefatos são cenários de readiness (posse SD/QA), automação (FPE) e manuais de product-readiness (posse QA, atualizados no sweep v33 por precedência). **Consulta CD (f2b1e95d) não aberta por não disparar o gatilho da ordem.** Se o board escolher D2-A com messaging de hábito inédito (copy de marketing além da correção de tier), abro consulta CD via issue filha antes do T1.

## 11. Método e evidência (first-hand, heartbeat de 2026-09-06)
Workspace desta issue @ `3fae2095` (main; readiness v33 @ `e41b9b93`). Lidos/verificados: `policy.yaml`, `inventory.yaml`, `README.md` (matriz), assessments v33 (decisions+run ids), `scenarios/{dojotoday-active-unit-guidance,dojotoday-read-only-boundary,voxel-standalone-loop,voxel-accessible-renderer,pixelquest-*}.yaml`, `evidence/results.ndjson` (últimos runs pass), `student-guide.md:12-13` (copy de tier vigente), `engines/dojoToday/{README.md,netlify.toml,src/main.ts:18,344,src/data/today.ts,playwright/*}`, `engines/voxelDojo/{catalog.json,shared/,game-02-warehouse/playwright/warehouse.spec.ts:56,90}`, `engines/codexdojo-os-prototype/src/engines/registry.ts:139-173` (embed URLs), ausência de analytics em dojoToday/voxelDojo/pixelDojo (grep). Contexto de board: AID-900 (relatório + input CEO), AID-913/AID-921 (escopo da telemetria), AID-980/A-B (ordens irmãs), AID-838 (padrão de spec/esqueletos), AID-558 rev 2 (rubrica de estimativa).
