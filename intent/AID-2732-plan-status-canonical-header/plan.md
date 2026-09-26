# Plan: AID-2732 — header canônico de plan.md aceito pelo freeze

Status: approved

Change-id: AID-2732-plan-status-canonical-header · From: intent/AID-2732-plan-status-canonical-header/spec.md · Status: approved

Aprovação: item de backlog real AID-2732 (high, 3 fontes independentes,
bloqueia POCs de estresse); executado como o "1 item real" do POC de
estresse AID-2690 (Product Delivery Engineer), base `c54e12ee` (ordem
AID-2736 — pós-merge #529).

Ironia registrada: este plan.md precisa carregar `Status:` em início de
linha para o freeze da BASE não recusá-lo — o próprio defeito B5 que
este item corrige. A linha canônica acima (inline) passa a ser aceita
após o build desta run (coberto por testes novos), não antes.

## Passos

1. `factory/contract.py`: `PLAN_APPROVED` aceita o header canônico
   (`Change-id: … · Status: approved` inline) além do formato
   linha-própria; não-aprovado inline e prosa seguem barrados.
2. `factory/tests/test_plan_status_canonical.py`: positivos (3 variantes
   reais de `main` + regressão do formato linha-própria) e negativos
   (draft/proposed/review inline; prosa fora da linha Change-id; sem
   status) + `load_from_registry` canônico.
3. Registro versionado desta mudança em
   `intent/AID-2732-plan-status-canonical-header/` (este diretório).
