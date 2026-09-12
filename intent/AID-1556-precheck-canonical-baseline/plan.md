# Plan: PRECHECK CANONICALIZADO — baseline versionado em scripts/precheck/ com self-test

Change-id: AID-1556-precheck-canonical-baseline · From: intent/AID-1556-precheck-canonical-baseline/intent.md · Status: approved

## Files that change

- `scripts/precheck/precheck.mjs` (new) — runner CLI: `--wave <config>`,
  `--against draft|alias`, `--dry-run`, `--list-checks`, `--self-test`;
  exit 0/1/2; registry audit anti-drift.
- `scripts/precheck/lib/checks.mjs` (new) — biblioteca declarativa
  (id/família/alvo + predicados 1:1 da âncora) + executor compartilhado
  `runAll` (CLI e self-test usam o mesmo caminho — sem drift de executor).
- `scripts/precheck/lib/fixtures.mjs` (new) — superfícies sintéticas
  (OS draft, literacy draft, live alias) em loopback; âncoras de hash
  recalculadas sobre os corpos sintéticos; hooks de mutação por cenário.
- `scripts/precheck/self-test.mjs` (new) — auditoria de registro (72 ids ≡
  âncora, em ordem), controle 72/72, 25 cenários de mutação com conjunto
  esperado exato de falhas.
- `scripts/precheck/waves/AID-935-65d64bca.json` (new) — config da onda
  âncora com todos os pins/âncoras + `anchorCheckIds` (72).
- `scripts/precheck/README.md` (new) — uso, modelo de checks, receita de
  nova onda, política de calibração.
- `.github/workflows/ci.yml` — job `precheck-baseline` (self-test + dry-run
  offline; sem rede/dependências).

## Order of work

1. Extrair programaticamente os 72 check ids da âncora
   `_work-products/AID-935/precheck-65d64bca.mjs` → `anchorCheckIds`.
2. Escrever a biblioteca declarativa com predicados 1:1 (verificação
   manual id-a-id contra a âncora; ids e valores preservados, incluindo as
   intrigas históricas `os-catalog-ia-pratica-20` = 21 e `os-catalog-dev-9`
   = 17).
3. Fixtures sintéticas + self-test; verde local 27/27.
4. Dry-run/list/CI wiring; YAML válido.
5. Meta-teste: enfraquecer um predicado → self-test deve ficar vermelho →
   reverter → verde (prova que o harness não é vacuoso).

## Risks

- Divergência semântica vs âncora na refatoração → mitigado por extração
  programática dos ids, predicação linha-a-linha e auditoria de registro no
  CI; resíduo aceito até a primeira onda real usar o runner (feedback do
  précheck de verdade).
- Falsos negativos no self-test (mutação deixar de falhar) → conjunto
  esperado EXATO por cenário (extras também falham o cenário).
- Custo de CI → job offline sem install; segundos em ubuntu-latest.
- Alternativa considerada e NÃO escolhida: importar o script da âncora como
  biblioteca (mantém o acoplamento a `_work-products/` e não resolve drift
  de executor).

## Proof

- `node scripts/precheck/precheck.mjs --self-test` → `27 passed, 0 failed`
  (registro 72/72 em ordem; controle 72/72; 25 mutações com falha exata).
- `--dry-run --against draft` → `72 checks selected`; `--against alias` → 65
  (7 checks draft-only excluídos por declaração de alvo).
- Meta-teste executado: predicado `os-collector-cross-origin-403` enfraquecido
  → `26 passed, 1 failed`; revertido → `27 passed, 0 failed`.
- `python3 -c yaml.safe_load(ci.yml)` OK (23 jobs).
- Config inexistente → exit 2 (uso/ambiente distinguível de check vermelho).
