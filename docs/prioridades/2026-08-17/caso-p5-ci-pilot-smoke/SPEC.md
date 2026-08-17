# SPEC — CI deve executar o smoke do piloto

## Estado atual

`python3 - <<...` / busca textual em `.github/workflows/ci.yml`: ocorrências de
`test:smoke:pilot` = 0. O job `codexdojo-os` termina em `npm run build`.

## Estado desejado

No job `codexdojo-os`, depois de `npm run build`:

```yaml
- run: npx playwright install --with-deps chromium
- run: npm run test:smoke:pilot
```

O próprio script `test:smoke:pilot` já executa `build:pilot` + Playwright contra
`vite preview`, portanto nenhum servidor extra é necessário.

## Interface do verificador

```text
python3 docs/prioridades/2026-08-17/caso-p5-ci-pilot-smoke/verify_ci_pilot_smoke.py [ci-yml-path]
```

Aceita caminho opcional para permitir o ciclo RED contra `git show HEAD`.

## Limites

Verificador textual não executa o GitHub Actions; a prova real continua sendo a execução
local do smoke e o próximo run do workflow.
