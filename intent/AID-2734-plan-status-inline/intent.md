# Intent — AID-2734-plan-status-inline

Status: accepted
Change-Id: AID-2734-plan-status-inline
Origin-Issues: AID-2734 (execução F0, ALTA bloqueante) / AID-2729 (veredito SM first-hand do defeito) / AID-2761 (ORDEM CEO, sweep AID-2760) / AID-2676 (umbrella)
Base: 5c40b8d7 (origin/main vigente; pós-merge PR #533 — retomada idempotente AID-2726/AID-2735)
Cluster: FACTORY-STRESS F0 (parser) — defect sweep AID-2760

## Defeito (citado de AID-2729 — não reescrito)

> `intent/AID-2676-agentic-factory-poc/plan.md:3` segue o template canônico
> (`docs/sdlc/templates/plan.md`): `Change-id: … · From: … · Status: approved`
> (inline, separador '·'); mas `PLAN_APPROVED = re.compile(r"^\s*Status:\s*approved\b",
> re.MULTILINE)` (`factory/contract.py:25`) só casa `Status:` em início de
> linha. Drift template↔parser do próprio piloto.

Repro first-hand na base 5c40b8d7 (receipt na thread AID-2734): loop do
`factory/README.md` § Uso com `--change-id AID-2676-agentic-factory-poc`
termina em `ContractError: plan.md header must carry 'Status: approved'`
(factory/contract.py:75), rc=1. Levantamento do SM em `intent/`: 34/70
plan.md no formato inline `· Status:` — 29 deles `approved`, todos rejeitados.

## Decisão

Opção **(a)** de AID-2734 (recomendada pelos dados do SM): parser tolerante.
Sem reformatar os 34 registros existentes (opção (b) descartada — blast
radius maior, reescrita de artefatos aprovados).
