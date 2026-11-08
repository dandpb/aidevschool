# AID-3742: PRE — avaliar/aplicar ratchet 1-line de scripts/python_complexity_baseline.txt (entrada stale _decide) exigido pelo fix AID-3736/AID-3710 F1 (PR #657)

- **Status:** done | **Priority:** high | **Origin:** manual
- **Assignee:** Platform & CI Engineer | **Created:** 2026-10-02T01:51:50.856389+00:00 | **Updated:** 2026-11-01T14:12:27.826+00:00
- **ID:** `76341a47-9cc3-43cf-8c2f-50fb00a46139`

## Description

Handoff nativo conforme PO (comentários 517d11af/37ae1cb3 em AID-3736): CEO identificou PRE `8c58cf6e` como dono de `scripts/` (fallback FPE), PCI `1e9be0fa` como reviewer de área (receipt adab03d4 no hub AID-3307). V&E não aplica nem avalia esta linha (fora do write do papel: `scripts/precheck/` apenas).

**Diagnóstico (evidência):** o fix F1 (binding de mastery a recibo, PR #657) reduz a complexidade de `learner/gate/canonical_gate.py::_decide` abaixo do valor congelado no ratchet. CI do head `ed0ccc54`: job Python (learner + curriculum shared) 110664233055 → `stale baseline entry: learner/gate/canonical_gate.py:_decide` (exit 1) — a suíte shared foi SKIPPED por parada nesse gate. `scripts/check_python_complexity.py` (header, linhas 12-15) documenta o fluxo: *"an entry with no matching violation fails the run (stale entry — shrink the baseline in the same PR that reduced the complexity)"*.

**Mudança exata proposta (1 linha, remoção):** apagar a linha `learner/gate/canonical_gate.py:_decide` de `scripts/python_complexity_baseline.txt` (linha 55; diff exato: `-learner/gate/canonical_gate.py:_decide` entre as entradas `_check_evidence_semantics` e `checkpoint_evaluator.py:_prediction_wave_result`). Sem elevar limite, sem entras novas — validated rc=0 em lab pelo produtor (evidência DO PRODUTOR, não revisão independente).

**Estado atual:** a linha existe apenas no artefato LOCAL NÃO APROVADO `9e8aa6fe07b094c6bc372586035bcdb91aaf529f` (worktree `/tmp/opencode/aid3710-fix`, branch `aid3710/rubric-class-verifier-receipt`; preserve, não publicar). O head remoto do PR #657 (`ed0ccc54`) NÃO a contém.

**Pedido:** avaliar e eventualmente aplicar essa 1 linha pela rotina legítima do dono (no branch do PR #657 ou coordenado com FPE no merge), com PCI como reviewer de área se aplicável. Aguardo instrução/handoff nativo — nenhuma ação minha sobre `scripts/`.

## Document `Continuation Summary` (2026-10-02)

# Continuation Summary

- Issue: AID-3742 — PRE — avaliar/aplicar ratchet 1-line de scripts/python_complexity_baseline.txt (entrada stale _decide) exigido pelo fix AID-3736/AID-3710 F1 (PR #657)
- Status: done
- Priority: high
- Current mode: review
- Last updated by run: fb81cafe-2305-4c85-99ff-e48eb34f199c
- Agent: Platform & CI Engineer (opencode_local)

## Objective

Handoff nativo conforme PO (comentários 517d11af/37ae1cb3 em AID-3736): CEO identificou PRE `8c58cf6e` como dono de `scripts/` (fallback FPE), PCI `1e9be0fa` como reviewer de área (receipt adab03d4 no hub AID-3307). V&E não aplica nem avalia esta linha (fora do write do papel: `scripts/precheck/` apenas).

**Diagnóstico (evidência):** o fix F1 (binding de mastery a recibo, PR #657) reduz a complexidade de `learner/gate/canonical_gate.py::_decide` abaixo do valor congelado no ratchet. CI do head `ed0ccc54`: job Python (learner + curriculum shared) 110664233055 → `stale baseline entry: learner/gate/canonical_gate.py:_decide` (exit 1) — a suíte shared foi SKIPPED por parada nesse gate. `scripts/check_python_complexity.py` (header, linhas 12-15) documenta o fluxo: *"an entry with no matching violation fails the run (stale entry — shrink the baseline in the same PR that reduced the complexity)"*.

**Mudança exata proposta (1 linha, remoção):** apagar a linha `learner/gate/canonical_gate.py:_decide` de `scripts/python_complexity_baseline.txt` (linha 55; diff exato: `-learner/gate/canonical_gate.py:_decide` entre as entradas `_check_evidence_semantics` e `checkpoint_ev
[truncated]

## Acceptance Criteria

No explicit acceptance criteria captured.

## Recent Concrete Actions

- Run `fb81cafe-2305-4c85-99ff-e48eb34f199c` finished with status `succeeded` at 2026-10-02T02:09:48.658Z.
- The review package and checklist are clear. As reviewer, I'll verify first-hand: commit diff, reproduction rc1→rc0, CI status, and scope preservation.

Commit confirmed: 1 file, 1 deletion, on top of `ed0ccc54`. Now the exact diff and reproduction:

Checklist (1) verified — single-line removal, parent is exactly `ed0ccc54`, neighboring entries preserved. Now reproducing the gate check at both heads via worktrees:

Base reproduces rc=1 (stale entry), matching CI 110664233055. Now the head:

Reproduction verified: base rc=1, head rc=0. Now checking CI run 110670057751 and artifact preservation:

The `gh run view` 404s are expected — those are **job** IDs, not run IDs. Querying the jobs API directly:

All four checklist items verified first-hand. Checking the precedent for the native approval API format (AID-3689):

Precedent format confirmed: PATCH issue with `status: done` + approval comment. Checking the API endpoint and current issue state:

Stale local snapshot — re-fetching live issue state (re-read pre-write protocol):

Live state confirmed: `in_review`, review stage with me as participant, approvalsNeeded=1. All four verification items passed — casting the
[truncated]

## Files / Routes Touched

- `scripts/python_complexity_baseline.txt`
- `scripts/precheck/`
- `scripts/check_python_complexity.py`
- `scripts/countersign_gate_check.py`

## Commands Run

- Heartbeat run `fb81cafe-2305-4c85-99ff-e48eb34f199c` invoked adapter `opencode_local`.
- Detailed shell/tool commands remain in the run log and transcript.

## Blockers / Decisions

- No new blocker was recorded by the latest run.

## Next Action

- Review the completed issue output and close any remaining follow-up comments.

## Comments (4)

**founder** · 2026-10-02T01:58:18.920817+00:00

Correção factual para seu diagnóstico: protect-tests JÁ falhava no head anterior ed0ccc54, job110664232883, pela edição de learner/gate/tests/test\_gate.py do produtor. Sua remoção de uma linha de baseline não introduziu esse bloqueio; ela resolve somente stale \_decide, permitindo executar a suíte Python antes pulada. O teste existente está sob pergunta explícita a Dani, ainda sem resposta; não criar exceção/trailer, não editar esse teste, não ampliar autoridade e não publicar o artefato local9e8aa6fe. Sua aprovação de área cobre apenas a linha produzida legitimamente em6d432f29. Solicitar revisão nativa PCI1e9be0fa deste delta no3742, com recibo de reprodução before rc1/after rc0 e registro do CI; parent3736/QA3741 mantém os demais bloqueios. Não é necessário reexecutar guard vermelho inalterado para tentar torná-lo verde.

**Platform & Release Engineer** · 2026-10-02T02:01:53.219192+00:00

**AID-3742 — ratchet 1-line aplicado e verificado (PRE, dono de `scripts/`).**

**Avaliação (confirma o diagnóstico):** repro independente no head `ed0ccc54` → `stale baseline entry: learner/gate/canonical_gate.py:_decide`, rc=1 (job Python 110664233055). Política do gate (check_python_complexity.py, linhas 12–15): encolher baseline no mesmo PR que reduziu a complexidade.

**Aplicação:** commit `6d432f29` no branch `aid3710/rubric-class-verifier-receipt` (PR #657): remove APENAS a linha 55 `learner/gate/canonical_gate.py:_decide` de `scripts/python_complexity_baseline.txt`. Sem elevar limite, sem entradas novas. Validação independente local: rc=0 (entradas restantes `_check_evidence`/`_check_evidence_semantics` ainda casadas). **CI no novo head: job Python (learner + curriculum shared) 110670057751 = SUCCESS** — blocker de CI removido.

**Preservação:** artefato local `9e8aa6fe` (produtor) intacto e não publicado, conforme pedido. Receipt no PR: comment 5944142873.

**Reds remanescentes no PR #657 — preexistentes no head F1 (`ed0ccc54`, jobs 110664232883 e countersign 36951170480), NÃO causados por esta linha:**
1. `SDLC guardrails (diff)` 110670057910: protect-tests BLOCKED — o commit F1 modifica teste existente `learner/gate/tests/test_gate.py` sem trailer owner-approved `SDLC-ALLOW-TEST-EDIT: AID-<n>` no range. Decisão de owner (FPE/CEO) registrar aceite num AID e adicionar o trailer — não é meu waivável.
2. `countersign-gate` 110670056962: produtor unattributed — falta trailer `Provenance: agent=… task=… run=… session=…` (AID-2768 §5) + countersign independente com head pin `6d432f29`.

Merge segue com o FPE (PCI reviewer de área). Escopo AID-3742 concluído.

**Platform & Release Engineer** · 2026-10-02T02:07:48.406903+00:00

Wake por comentário novo em AID-3742 — diretriz: solicitar revisão nativa PCI (1e9be0fa) do delta `6d432f29` com recibo de reprodução rc1→rc0 + CI. Protocolo: re-read pré-write + kill-switch primeiro.

Kill-switch limpo. Issue reaberta em modo review. Localizando o mecanismo nativo de revisão PCI usado no fluxo anterior (evidência AID-3689).

O mecanismo nativo é um `executionPolicy` com stage `review` (participante = reviewer, approvalsNeeded). AID-3742 está com `executionPolicy: null`. Verificando como montar o estágio de review via API.

Preciso do formato exato validado pelo servidor. Procurando o código-fonte da API localmente para confirmar o schema do `executionPolicy`/`reviewRequest`.

Formato confirmado (precedente FPE em AID-3569). Re-verificando estado do PR antes do write (pode ter havido push novo), depois monto o pacote de revisão.

Estado estável (head `6d432f29`, mergeable). Configurando o estágio de revisão nativa PCI com o pacote de evidências — payload único (diretiva baaa2886).

`reviewRequest` rejeita chave `comment` (mesmo erro do precedente AID-3569). Separando: PATCH só com `instructions`, recibo via POST de comment próprio.

Ordem correta é 2 PATCHes: primeiro `executionPolicy` (ativa o stage), depois `reviewRequest`.

Tentativa correta: PATCH combinado (`executionPolicy` + `reviewRequest.instructions` no mesmo payload — a validação de stage olha o payload inteiro).

Stage ativo provavelmente exige status `in_review`. Transitionando e reintentando o roteamento.

Stage ATIVO: `in_review`, currentParticipant = PCI (1e9be0fa), returnAssignee = PRE (eu). O boundary migrou para o reviewer — testando se ainda posso registrar o recibo de revisão no thread.

403 esperado — boundary migrou para o PCI com o estágio ativo. Verificando estado final e se o PCI foi acordado nativamente.

Revisão nativa PCI configurada com sucesso — disposição final: `in_review`.

**Executado neste heartbeat (diretiva baaa2886):**
- Confirmada a correção factual: protect-tests já falhava em `ed0ccc54` (job 110664232883) — minha linha não introduziu o bloqueio; alinhado ao meu recibo b7a5d87c.
- **Estágio de revisão nativa ativo** em AID-3742: `executionPolicy` stage review, `approvalsNeeded=1`, **currentParticipant/assignee = PCI (1e9be0fa)**, `returnAssignee = PRE` (decisão nativa retorna a mim). Nenhuma exceção/trailer criado; `9e8aa6fe` intocado; guard vermelho não reexecutado.
- **Pacote de evidências no thread** (comment b7a5d87c, pré-roteamento): reprodução before rc=1 (`ed0ccc54`) / after rc=0 (`6d432f29`), comando exato, CI 110670057751 success (antes 110664233055 failure) + ids dos reds pré-existentes.

**Fronteiras:** writes no thread agora são do PCI (meu 403 é by-design do estágio); parent AID-3736/QA AID-3741 mantêm os demais bloqueios; merge segue porta única FPE.

**Platform & CI Engineer** · 2026-10-02T02:09:29.460582+00:00

**Approved — revisão de área PCI (1e9be0fa) do delta `6d432f29`, primeira mão, checklist completo do pacote de revisão:**

1. **Diff do commit**: `git show 6d432f29` = APENAS remoção da linha `learner/gate/canonical_gate.py:_decide` de `scripts/python_complexity_baseline.txt` (1 file, 1 deletion); parent = `ed0ccc54` exato (head do F1); entradas vizinhas `_check_evidence`/`_check_evidence_semantics` preservadas.
2. **Reprodução (worktrees limpos)**: comando exato do pacote (`check_python_complexity.py --max 8 --baseline ... learner engines/...`) → @`ed0ccc54` rc=1 `stale baseline entry: learner/gate/canonical_gate.py:_decide` (espelha CI 110664233055); @`6d432f29` rc=0, sem novas violações. Conforme policy documentada no header do checker (linhas 12-15: shrink da baseline no mesmo PR que reduziu a complexidade).
3. **CI (GitHub API ao vivo)**: job `Python (learner + curriculum shared)` 110670057751 = **success** @ `6d432f29` (job 110664233055 = failure @ `ed0ccc54`, confirma o antes/depois).
4. **Preservação**: `git diff ed0ccc54..6d432f29 --name-only` = somente a baseline; nenhum teste editado, nenhum trailer/exceção criado, artefato `9e8aa6fe` ausente da árvore @ head (não publicado).

Fora do escopo confirmado (segue no parent AID-3736 / QA AID-3741): protect-tests do F1, countersign/provenance do produtor, guards vermelhos inalterados. Merge NÃO autorizado neste estágio (porta única FPE). Worktrees de review removidos.

---

