# Plan: AID-3127 fábrica de re-grant registra o produtor na origem

Author: Platform & CI Engineer (agent 1e9be0fa) · Change-id:
AID-3127-factory-producer-at-origin · Status: approved (small-fix scope;
hardening da própria fábrica AID-1357; QA countersign required to merge as
always)

## Files that change

1. `.github/workflows/readiness-regrant.yml`
   - passo "build the PR body": ao final do corpo (fora de code fences),
     parágrafo curto de registro de produtor + trailer canônico
     `Provenance: agent=readiness-regrant-factory task=AID-1357
     run=gha-${{ github.run_id }} session=gha-${{ github.run_id
     }}.attempt${{ github.run_attempt }}` (AID-3127; corrige o gap
     AID-3121/PR #597 onde §5 falhava `producer unattributed`);
   - comentário de cabeçalho do workflow: nota AID-3127 (produtor registrado
     no corpo; watchdog deixa de ser load-bearing para §5).
2. `docs/product-readiness/REGRANT-RUNBOOK.md`
   - §"Lifecycle do PR bot": passo novo 0 — corpo do PR nasce com o trailer
     de produtor (§5 verde desde a criação); o close+reopen do watchdog
     permanece apenas para disparar CI (B1a); referência ao gap #597 e ao
     unblock manual AID-3124 como precedentes.
3. `docs/product-readiness/tests/test_factory_body_producer.py` (novo)
   - renderiza o corpo executando o script real do passo "build the PR body"
     (substituindo `${{ github.run_id }}`/`${{ github.run_attempt }}` por
     amostras) em tmpdir; avalia com o núcleo do gate carregado de
     `scripts/countersign_gate_check.py` via
     `importlib.util.spec_from_file_location` (padrão de
     `readiness_test_support.py`);
   - casos: (1) corpo novo §5 atribuído (não `producer unattributed`); (2)
     corpo novo + countersign `qa-lead` pinando head → PASS; (3) corpo sem
     trailer (#597 shape) → `producer unattributed`; (4) trailer cercado por
     code fence → `producer unattributed` (fence-stripping AID-2824); (5)
     countersign do próprio slug da fábrica → recusado (§5 distinct).
4. `intent/AID-3127-factory-producer-at-origin/` — este registro.

## Verification

- `python3 -m pytest docs/product-readiness/tests/test_factory_body_producer.py -q`
  → verde (casos 1–5).
- `python3 -m pytest docs/product-readiness/tests -q` → suíte completa verde.
- `python3 scripts/countersign_gate_check.py --self-test` → inalterado (gate
  intocado).
- Validade in vivo fica para o próximo run real da fábrica (workflow_run CI
  failure @ main); o próximo drill/dispatch também exercita o mesmo caminho.

## Rollout / risco

- Pequeno e fail-safe: se o template regredir, o PR de re-grant volta a
  nascer `producer unattributed` (o estado de hoje — sem piora); o teste novo
  pega a regressão antes do merge.
- Sem mudança de secrets, sem mudança de permissões, sem mudança do gate.
