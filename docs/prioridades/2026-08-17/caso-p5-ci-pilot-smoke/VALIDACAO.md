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

Job `codexdojo-os` em `.github/workflows/ci.yml` ganhou, após `npm run test`:

```yaml
- run: npm run build
  env:
    VITE_LITERACYDOJO_URL: /apps/literacydojo/
    VITE_WAREHOUSE_URL: /apps/warehouse/
    VITE_WORMHOLE_URL: /apps/wormhole/
    VITE_RELAY_STATION_URL: /apps/relay-station/
- run: npx playwright install --with-deps chromium
- run: node scripts/bundle-missions.mjs
- run: npx playwright test --config=playwright.pilot.config.ts
```

Ajuste de review (simplify-code): as env vars vão no passo de build porque o Vite lê
`import.meta.env` em tempo de build — sem isso, o smoke reutilizaria um bundle com URLs de
dev-server. E o smoke chama bundle+playwright diretamente em vez de `test:smoke:pilot`, que
rebuildaria o OS uma segunda vez.

## GREEN

```text
ci pilot smoke verification: PASS
playwright chromium install: present in codexdojo-os job
pilot bundle + smoke steps: present in codexdojo-os job
```

`yaml.safe_load` do workflow: válido. O equivalente local (`npm run test:smoke:pilot`,
self-contained) passou com `.env.production` fora do caminho.

## Entregue de verdade

Passo de CI que falha o PR se o bundle estático do piloto não montar as missões.

## Limites

- Não executei o GitHub Actions; a prova no runner acontece no próximo push/PR.
- A suíte dev completa (`tests/`) continua fora do CI por escopo.
- O smoke cobre 2 missões representativas, não as 16 voxel.
