# VALIDAÇÃO — P5: smoke do piloto no CI

## RED

```bash
python3 docs/prioridades/2026-08-17/caso-p5-ci-pilot-smoke/verify_ci_pilot_smoke.py <(git show HEAD:.github/workflows/ci.yml)
```

```text
ci pilot smoke verification: FAIL
missing: npm run test:smoke:pilot
```

## Correção

Job `codexdojo-os` em `.github/workflows/ci.yml` ganhou, após `npm run build`:

```yaml
- run: npx playwright install --with-deps chromium
- run: npm run test:smoke:pilot
```

O script `test:smoke:pilot` já inclui `build:pilot` + Playwright contra `vite preview`;
nenhum dev-server das missões é necessário no runner.

## GREEN

```text
ci pilot smoke verification: PASS
playwright chromium install: present in codexdojo-os job
test:smoke:pilot: present in codexdojo-os job
```

`yaml.safe_load` do workflow: válido.

## Entregue de verdade

Passo de CI que falha o PR se o bundle estático do piloto não montar as missões.

## Limites

- Não executei o GitHub Actions; a prova no runner acontece no próximo push/PR.
- A suíte dev completa (`tests/`) continua fora do CI por escopo.
- O smoke cobre 2 missões representativas, não as 16 voxel.
