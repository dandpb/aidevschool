# Plan: factory B5 — registrar Status mid-line no contrato (AID-2732)

Change-id: AID-2732-b5-registry-status · From: intent/AID-2732-b5-registry-status/spec.md · Status: approved

Aprovação: ordem AID-2736 §2 (CEO) sequencia esta correção ("bloqueia todo
uso real da fábrica, esforço baixo") sobre o escopo/aceite definidos no
corpo da AID-2732 pelo ScrumMaster; fast path de fix bornido, auto-verificação
e revisão produtor≠verificador não dispensadas.

## Files that change

- `factory/contract.py` — `PLAN_APPROVED` passa a aceitar campo de header
  mid-line (`(?:^|·)` como âncora); mensagem de erro atualizada.
- `factory/tests/test_b5_canonical_registry.py` (new) — regressão com o
  registro REAL + casos negativos de estriteza.
- `factory/tests/test_registry_smoke.py` (new) — smoke `intent/*/` com
  `checks.md` carrega; sintético inválido falha.
- `.github/workflows/ci.yml` — job `factory (contract+registry)` rodando a
  suíte `factory/tests` (cobertura hoje inexistente em CI).
- `intent/AID-2732-b5-registry-status/` (new) — este registro.

## Passos

1. Congelar este contrato (registry canônico mid-line — exercita o defeito
   pela frente antes do fix estar em main: o freeze roda no worktree do
   build, pós-step-2).
2. Regex: `PLAN_APPROVED = re.compile(r"(?:^|·)[ \t]*Status:[ \t]*approved\b",
   re.MULTILINE)` + comentário documentando as duas formas aceitas e a
   regra de estriteza (campo de header, não prosa).
3. Testes de regressão/smoke (specs acima); rodar
   `python3 -m pytest factory/tests -q` — 100% verde.
4. CI job minimalista (checkout + setup-python 3.12 + pytest factory/tests).
5. Loop completo da fábrica: build → prove (checks C1–C3) → gate → PR;
   receipt no thread da AID-2732; countersign independente pré-merge.
6. Friction-log (AID-2681): linhas #10/2683, #3/#17/2684, #5/2686 →
   `issue:AID-2732`.

## Riscos

- Regex amplo demais (falso positivo de aprovação) — mitigado: âncora
  `(?:^|·)` exige campo de header; caso negativo com menção em
  backticks/prossa no suite.
- Smoke quebra main se alguém landar registro inválido — é o objetivo
  (fail-closed); diagnóstico no assert lista o change-id.
- CI job novo sem dependências além de checkout+python — sem risco de
  supply-chain adicional.
