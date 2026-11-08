<!-- issue: AID-1859 | key: l2-proposta | doc_id: 24473286-0573-426f-9073-09d195a412e5 | updated: 2026-09-14 14:19:59.885+00 -->

# L2 — Proposta de decisão de produto: produtor para o projeto 04 (recomendação: Opção A TASK FORGE)

(AID-1859)

# L2 — Proposta de decisão de produto: projeto 04 sem jogo/produtor

**Issue:** AID-1859 (CCE) · **Mandato:** despacho CEO AID-1853 (2026-09-14) · **Baseline:** `origin/main` = `00789fe6` (2026-09-14) · **Sem código neste passo** — análise + recomendação; decisão é do CEO.

**Recomendação (sumário): OPÇÃO A — construir o produtor voxelDojo TASK FORGE + avaliador independente (2–3 PRs), despachado na próxima janela de planejamento, com prazo suave = antes de a jornada chegar em U4 (ETA ~fim de nov/2026). Manter o pin até o PR do avaliador.**

---

## 1. Caracterização do projeto 04 (`04_concurrent_task_queue`)

| Dimensão | Estado (evidência) |
|---|---|
| Trilha/nível | Level 2 — Concurrency and Performance; dependências: projetos 01–03 (`curriculum/catalog.md`, seção 04) |
| Objetivo pedagógico | "Orquestrar jobs concorrentes com prioridades e retry" — worker pools, job scheduling, backpressure, priorities, timeouts, retry policies, dead-letter queues, idempotency (catalog.md; `docs/spec.md:15-18`) |
| Contrato do projeto | Spec completa RF-001..014 + RNF-001..008: fila bornada com prioridade+FIFO, `worker_count` cap, `scheduled_for`, retry com backoff exponencial+jitter, DLQ (poison/exausto), idempotency key, backpressure 429, shutdown gracioso, clock injetável (`curriculum/04_concurrent_task_queue/docs/spec.md`, 262 linhas) |
| Payload/código | `node-impl/` com testes Vitest verdes no CI ("curriculum Node (18 projects)", run 34724009871); status interno "cycle-complete" do scaffold; backlog: "scaffolded — catalog verification is pending" (`docs/status.md`; `curriculum/BACKLOG_STATUS.md:13`) |
| Entrega do aluno | Implementar o serviço de fila na linguagem da trilha E uma tentativa de aprendizagem com evidência executável independente (regra de ouro do repositório: `mastered` só com tentativa + evidência verificada) |
| Estado do gate | **Lacuna L2 (P2)**: sem jogo produtor no voxelDojo (catálogo pula 04 — vai de `game-03` a `game-05`), sem avaliador em `GAME_SPECS`, pinado em `ALLOWED_PROJECTS_WITHOUT_GAME` com comentário "no producer planned yet" (`learner/gate/tests/test_gate_game_coverage.py:52-58`; `engines/voxelDojo/catalog.json`; verifier-map AID-1582 §4/§6) |

### 1.1 Dois ativos parciais já existem (mudam o custo da decisão)

1. **Plano completo não executado para o jogo 3D:** `engines/pixelDojo/docs/plans/04_concurrent_task_queue.md` — plano "TASK FORGE" Shape B (`game-04-task-queue`, porta 5204, unit `U4-task-queue`) com mapeamento conceito→mecânica (hopper = fila bornada; N braços = worker pool; rack de recozimento = retry/backoff; calha de sucata = DLQ; sigilo = idempotency), níveis L1–L4, contrato de evidência NDJSON congelado no plano, regra de passagem e marcos M0–M6. Nunca foi implementado.
2. **Produtor 2D parcial no pixelDojo:** lab-04 "Worker Queue" (`pixel-quest/src/game/encounters/taskQueue.ts`) jogável e coberto no CI — o spec Playwright joga a onda (13 jobs: 10 legítimos/3 poison, admit/dead-letter) e **asserta um registro de evidência `pixelquest-task-queue` PASS** (`playwright/pixel-quest.spec.ts:236-275`). Porém ensina só admit/reject: **não** exercita prioridade+FIFO, `scheduled_for`, classificação retry-vs-DLQ nem idempotency (5 dos 8 conceitos da linha do catálogo ficam de fora). Nota: a entrada antiga em `docs/loops/threejs-dojo-coverage/memory.md:76` ("nenhum spec emite evidência") está **desatualizada** — a emissão existe; a lacuna real é o avaliador independente + entrada no catálogo voxelDojo.

### 1.2 Landmine de identidade (insumo obrigatório da decisão, qualquer opção)

O lab-04 emite `unit_id: "U-04_concurrent_task_queue"` (derivado de `U-${project}`, `curriculumPack.ts:662-667`), mas o convenção do substrato/catálogo voxelDojo é `UN-slug` (ex.: `U2-key-value-store`; plano TASK FORGE propõe `U4-task-queue`). O gate valida identidade registro×unidade ativa (verifier-map L4, classe `canonical_gate.py:152-161`). O **unit id canônico do U4 precisa ser pinado uma vez** e os emissores alinhados, senão a primeira tentativa de gate em U4 será rejeitada por identidade — mesmo tipo de drift do L4 (game-10 `U9-distributed-cache`).

---

## 2. Comparação com os projetos que TÊM produtor (padrão dos jogos existentes)

Caminho de ouro (02–09, 11, 12 — 10 de 19): **jogo voxelDojo = superfície de tentativa** (sim headless determinística + RNG com seed + cena 3D + emissor de evidência NDJSON; nunca escreve `mastered`) **+ avaliador independente** em `learner/gate/` que re-julga as *observações rejogadas* contra tabelas-verdade do nível (ex.: `STATIONS` em `relay_evaluator.py:7-33`) + receipt SHA-256 + gate via `commit_gate_transition`. Jogo novo entra no CI automaticamente pela matrix `catalog.json` (`ci.yml:508+`).

**O que um produtor do 04 precisaria validar** (critérios de aceite da spec → mecânica, já mapeados no plano TASK FORGE §3/§6):

| Requisito da spec | O que o avaliador confere |
|---|---|
| RF-005/RF-006 worker pool | invariante `running ≤ worker_count` a cada tick; pausa ≠ quebra |
| RF-007/RF-008 prioridade+FIFO+scheduled | predição de próxima despachada ≥ 0.80 (recall ativo) |
| RF-009/RF-010 retry vs DLQ | classificação correta: transitório < `max_retries` → retry; poison/exausto → DLQ; `poison_requeued == 0` |
| RNF-003 backpressure | rejeitar (429) na capacidade; `queue_overflowed == false` |
| RF-003 idempotency | dedup de chave ativa; duplicatas enfileiradas == 0 |

**Custo de referência (benchmarks recentes):** pacote de jogo ≈ 1.509–1.599 LOC TS (game-11/12, adicionados em commits únicos); avaliador ≈ 227–256 LOC + 241–261 LOC de testes (AIR TRAFFIC/MISSION CONTROL, batchados num único PR — commit `a96aa783`, AID-1594 PR2). O tripwire exige que o unpin de `ALLOWED_PROJECTS_WITHOUT_GAME` aconteça **no mesmo PR** do avaliador (regra same-PR do `test_gate_game_coverage.py`).

---

## 3. Opções (custo/benefício)

### Opção A — Construir o produtor completo (TASK FORGE + avaliador) — **RECOMENDADA**
- **Escopo:** PR-A1 `game-04-task-queue` (sim core `queue.ts` headless + Vitest; cena; níveis L1–L4; emissor de evidência; smoke Playwright; entrada em `catalog.json`; reviewSlice) seguindo o plano existente; PR-A2 `learner/gate/task_queue_evaluator.py` + entrada em `GAME_SPECS` + testes dedicados + **unpin do 04 no mesmo PR**. Total **2–3 PRs** (~1.600 LOC TS + ~500 LOC Python), jogo e avaliador paralelizáveis entre dois owners (jogo: Curriculum Platform/Learning Engine; avaliador: VEE, dentro do write-scope do verifier-map §7).
- **Benefício:** U4 passa a ter o mesmo caminho de ouro das outras unidades de programação; catálogo 02–18 fica contíguo; L2 fechado por completo e o pin sai honestamente; risco reduzido pelo plano detalhado já escrito (contrato de evidência congelado nele).
- **Risco:** WebGL no smoke Playwright (risco G6 compartilhado por todos os jogos voxelDojo — sim core headless não afetada); prioridade de agenda — precisa aterrissar antes da jornada chegar em U4 (próxima unidade é U3, que já tem jogo+avaliador; cadência observada ~6 semanas/unidade ⇒ gate U4 ≈ fim de nov/2026 — janela confortável se despachado no próximo ciclo).

### Opção B — Manter isenção documentada (pin permanente)
- **Escopo:** ~1 PR de 1 linha (reescrita do comentário do pin para "exempt by decision AID-1859") + nota pedagógica.
- **Argumento possível:** o cerne comparativo de linguagens já é servido pela implementação + benchmarks do próprio projeto.
- **Por que é fraco:** (i) `game-12-mission-control` ensina eleição de líder + DAG de dependências, **não** worker-pool bornado/backpressure/DLQ/idempotency — a sobreposição com 04 é só superficial ("jobs"); (ii) viola a regra de ouro para unidade de programação (evidência executável independente p/ `mastered`) ou força U4 a aceitar evidência mais fraca; (iii) cria precedente perigoso para os 7 jogos ainda sem avaliador (13–18) pedirem a mesma isenção; (iv) o pin eterno é um mau-cheiro que o tripwire foi desenhado para eliminar.

### Opção C — Alternativa leve: promover o lab-04 pixelDojo a produtor oficial do U4
- **Escopo:** avaliador para o kind `pixelquest-task-queue` + ligação no caminho do gate (a ponte `GAME_SPECS` é voxel-shape; exigiria extensão da ponte ou fluxo de receipt p/ pixel) + fix do `unit_id` + unpin. **1–2 PRs**, sem trabalho 3D.
- **Benefício:** caminho de ouro mais barato e rápido; produtor já existe e é testado em CI.
- **Por que é inferior à A:** pedagogicamente mais fino — só admit/dead-letter (3 dos 8 conceitos; sem predição de despacho, retry/backoff, idempotency, `scheduled_for`); o próprio plano argumenta que o encounter 2D colapsa o sistema multi-stage em admit/reject (§2 why-3D); e o avaliador validaria *métricas computadas pelo produtor* em vez de *observações rejogadas do jogador* — anti-gaming mais fraco.

---

## 4. Recomendação e insumos de decisão para o CEO

**Recomendar: OPÇÃO A.** Opção C é o fallback legítimo se a capacidade apertar (compra o caminho de ouro pelos 3 conceitos centrais a ~metade do custo). Opção B não é recomendada.

Decisões que o CEO precisa tomar:
1. **Escolha da opção:** A (recomendada) / B / C.
2. **Pin do unit id canônico do U4:** `U4-task-queue` (como no plano) vs `U4-concurrent-task-queue`; em qualquer caso alinhar o emissor pixel lab-04 (`U-04_concurrent_task_queue`) — 1 linha + teste (evita rejeição de identidade no primeiro gate de U4; mesma classe do L4).
3. **Owners + janela:** jogo (Curriculum Platform Engineer / Learning Engine) e avaliador (VEE) em paralelo; despacho na próxima janela de planejamento, com prazo suave = antes da jornada atingir U4 (ETA ~fim nov/2026 pelo cadência atual de ~6 sem/unidade).

## 5. Como verificar esta análise

```bash
grep -n "04_concurrent_task_queue" learner/gate/tests/test_gate_game_coverage.py   # pin L52-58
python3 -m pytest learner/gate/tests/test_gate_game_coverage.py -q                  # 5 passed (main atual)
grep -n "game-0" engines/voxelDojo/catalog.json                                     # pula 04 (03→05)
sed -n '236,275p' engines/pixelDojo/pixel-quest/playwright/pixel-quest.spec.ts      # lab-04 emite evidência PASS
cat engines/pixelDojo/docs/plans/04_concurrent_task_queue.md                        # plano TASK FORGE não executado
grep -n "unitId" engines/pixelDojo/pixel-quest/src/content/curriculumPack.ts        # U-${project} ≠ UN-slug
```
