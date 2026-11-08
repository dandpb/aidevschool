<!-- issue: AID-3710 | key: handoff-f1-minimal-binding | doc_id: b5c55414-95b2-45dd-8916-f2baad7710e9 | updated: 2026-10-02 01:15:40.716+00 -->

# Handoff F1 — binding de mastery a recibo de verificador (CPE → V&E)

(AID-3710)

# AID-3710 — Handoff F1: mastery rubric-class exige recibo de verificador

**De:** Curriculum Platform Engineer (CPE) — `ac0ec540-f683-4be0-88de-49430e95eeaa`
**Para:** Verifier & Evidence Engineer (V&E) — `616b5f9b-15c8-4ad1-816c-78a7317e0202` (write legítimo em `learner/gate/`, `engines/*/verifier*`, `scripts/precheck/`)
**Data:** 2026-10-02 ~01:0x UTC — run `2d471068-2e81-480b-b9cd-cb1944b5886d`
**Autorização:** PO nos comentários `5421c4c4` e `fb348976` (AID-3710), decisão Dani 02/out 00:44 UTC (hub AID-3307/b709a336): pass/metrics autodeclarados não concedem mastery sem evidência de execução validada pelo verificador; menor binding suportado por contrato/artefato existente. Sem serviço externo, credenciais novas ou atestação não sustentada.

## 1. Por que o handoff (limite de escopo)

Instruções do CPE (registry AGENTS.md): *“Repo: write em `curriculum/` e `docs/curriculum`; read no restante.”* A correção toca `learner/gate/` (e possivelmente `learner/substrate/`) — fora do write do CPE. O PO confirmou a pausa de escopo (comentário `fb348976`). A correção de produto permanece autorizada, a ser executada pelo owner correto (V&E; `learner/substrate` = Learner App Engineer, se necessitar do Option 2 abaixo).

## 2. Escritas existentes (disclosure completa)

O run anterior do CPE (**`31ab0827-ca0b-49b3-867e-a44dc0a2df6b`**, cancelled, 00:51:37–01:02:42Z) produziu UMA escrita de produto fora do escopo, **não commitada, não enviada, preservada como está**:

- Worktree `/tmp/opencode/aid3710-fix`, branch `aid3710/rubric-class-verifier-receipt`, base `fcf84d3e0e623aaa010fa8081e3781809736ed81` (= main pós PR #653; 0 commits novos).
- Arquivo: `learner/gate/evidence_rubrics.yaml` — blob base `50510a5c…` → blob worktree `8818801d1a0f2d30c9d7fe8c8bdabdb0f6bd67d0`, +15/−0: `requires_verifier_receipt: true` nas 5 rubricas pixelquest (token-bucket, route-health, policy-gate, sequence-flow, task-queue) + bloco de comentário.
- Diff arquivado: `aid3710-evidence/draft-worktree-uncommitted.patch`.
- Nenhum outro arquivo tocado; nenhum commit/push/PR criado pelo CPE nesta issue; nenhum teste/gate/modelo/acesso alterado.

Este heartbeat (run `2d471068`) fez **apenas diagnóstico read-only**: zero escritas no repo (worktrees/my workspace intactos), labs e outputs isolados em `/tmp/opencode/aid3710-lab/*` e `/paperclip/aid3710-evidence/*` (nenhum cache/output de outro worker tocado).

## 3. Reprodução independente no RC2 (baseline congelada)

- RC2 head `e707103563bd97bde9cf1071e9c0191831982d6c`, tree `df865b5fe98c0728202df0c31cf3dc20f43f1781` (manifest C0/AID-3670).
- Harness da QA (`aid3696-evidence/contraprovas.py`), lab próprio `/tmp/opencode/aid3710-lab/rc`: **17/17 idênticos** à matriz da QA (`rc2-repro/contraprovas_matrix.md` == `prefix-baseline/contraprovas_matrix.md`, diff vazio).
- **CP-01 = FINDING confirmado** (evidência datilografada, `pass:true` + metrics pixelquest, sem recibo → `GATE PASS_FIRST_TRY`, mastered=True, exit 0). CP-07 = ACCEPTED-BY-DESIGN (fronteira do recibo escrevível — preservar/documentar, não endurecer nesta issue).

## 4. Resultados novos deste heartbeat (probes P1–P4)

Script: `probe_gatekeeper_and_binding.py`; resultados: `probe_results.txt`; candidato: `candidate-minimal-binding.patch` (rascunho acima + rubrica `gatekeeper`).

| Probe | Setup | Resultado | Leitura |
|---|---|---|---|
| P1 | RC2 + GATEKEEPER forjado (top-level `good_admits:8`), sem recibo | exit 0, **mastered=True**, pass_first_try | F1 **também na classe gatekeeper** — o rascunho do run anterior (só pixelquest) era incompleto |
| P2 | candidato + histórico intacto (U0 já mastered por rubric 2026-07-05) | exit 1, **CANNOT GATE — estado inteiro inválido** (`units_log[0].evidence_file`) | **o patch ingênuo regrediu**: `_validate_evidence_files` (`learner/substrate/__init__.py:436`) re-adjudica histórico mastered sob as rubricas novas → outage total do gate |
| P3 | candidato + histórico grandfathered (U0 removida) + pixelquest forjado sem recibo | exit 1, state=evaluating, **fail-closed** | o binding gate-time funciona: metrics autodeclarados não dão mastery |
| P4 | candidato + grandfathered + mesmo payload + **recibo digest-bound válido** (`learner/verifier_receipts`) | exit 0, **PASS_FIRST_TRY** | contrato existente utilizável; fronteira CP-07 inalterada (autoridade do recibo = write no diretório) |

Unidade histórica real afetada no estado canônico: `U0-sonda-rate-limiter-robustness` (`engines/pixelDojo/.logs/last_run_evidence.json`, gate review 2026-07-05 sem `evidence_verifier_source`).

## 5. Design space para o menor binding (decisão V&E; validado em lab)

- **Option 1 — enforcement no seam de decisão (escopo só `learner/gate/`):** exigir recibo na hora de decidir (`canonical_gate.py` `_check_evidence_semantics`/`_decide`) quando a rubric class é autodeclarada (pixelquest/gatekeeper), mantendo o avaliador compartilhado (`standards.independently_verified_pass`) com a semântica atual para validação de histórico → zero re-adjudicação, zero regressão (P2 não ocorre), efeito idêntico a P3/P4. Nenhuma mudança em `learner/substrate`.
- **Option 2 — flag `requires_verifier_receipt` nas rubricas + grandfathering:** o que o patch candidato faz; **exige** migração/co-issue em `learner/substrate/_validate_evidence_files` (write do Learner App Engineer) para não invalidar histórico (P2). Fronteira de versão: `evidence_rubrics.yaml` `version: 1` → 2 com semântica de grand-father explícita.
- Em ambas: `pass_when` permanece para detalhe de rejeição/tooling de conteúdo; nenhum recibo fabricado para histórico (proibido pelo PO).

## 6. Testes/gates afetados (levantamento read-only)

- `learner/gate/tests/test_gate.py`: `test_python_gate_recognizes_every_catalog_rubric` (linha ~1248) já cobre ambas as semânticas (flag → `passed is None`); fixtures end-to-end GATEKEEPER (`good_admits:18`, linha ~43) e fluxos `verify_and_gate` pixelquest sem recibo precisarão de recibo nos fixtures — decisão/ajuste é do V&E (testes protegidos).
- Contraprovas QA: CP-01 deve virar PASS(fail-closed); CP-04/CP-05/CP-10/CP-11/CP-12/CP-17 não podem mudar de comportamento; CP-07 só muda se F2 for endurecido (não é o caso).
- Reteste independente QA/V&E + novo SHA/manifest (não confundir RC2 histórico com candidato corrigido).

## 7. Fluxo nativo de revisão (registro do 403 reportado pelo CEO)

- Operação com sucesso registrada: run CEO `5ece6f3b-747c-42b7-aa9c-133e20927751` → `PATCH /api/issues/0bd736aa…` (backlog→todo, assignee→CPE) às 00:51:37Z (activity `c80cec84`).
- Operação negada (403, não registrada em activity — writes negados não logam): PATCH de estágio de revisão na mesma issue (registro de reviewers via `executionPolicy.stages[] type=review` + participants), logo após a atribuição. UI Reviewers=None confirma que nenhum estágio persistiu.
- Fluxo nativo documentado que permite revisão legítima: (a) **board/user** registra o estágio de revisão (UI ou PATCH autenticado como usuário — token de agente é recusado); o participante designado decide com a atualização suportada + comentário (`APPROVE`→status done / `Changes requested`→in_progress), sem reatribuição para contornar; (b) agente pode pedir decisão via `POST /api/issues/{id}/interactions` (`request_confirmation`/`ask_user_questions`, com continuationPolicy); (c) aprovações formais via `POST /api/companies/{companyId}/approvals` + link `POST /api/issues/{id}/approvals`. O CPE não tentou e não tentará nenhuma escrita de reviewer por outro ator/endpoint.

## 8. Entregáveis deste diagnóstico (evidência preservada)

`/paperclip/aid3710-evidence/`: `prefix-baseline/` (matriz QA congelada), `rc2-repro/` (17/17 reprodução CPE), `candidate-repro/` (matriz do candidato ingênuo — mostra a regressão P2), `draft-worktree-uncommitted.patch`, `candidate-minimal-binding.patch`, `probe_gatekeeper_and_binding.py`, `probe_results.txt`, `SHA256SUMS.txt`.
