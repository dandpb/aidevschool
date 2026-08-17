# PRD — Smoke do piloto no CI

## Problema

`test:smoke:pilot` existe localmente e passa, mas nenhum job do `.github/workflows/ci.yml`
o executa. Uma regressão que quebre o build estático do piloto (ex.: bundle não gerado,
iframe apontando para localhost) chegaria a `main` sem sinal vermelho.

## Usuário

Quem abre PRs no repositório e precisa de feedback automático sobre o contrato do piloto.

## Objetivo

O job `codexdojo-os` do CI executa o smoke do piloto contra `vite preview`, falhando o PR
se o bundle estático não montar as missões.

## Escopo

- adicionar instalação do Chromium do Playwright no job `codexdojo-os`;
- executar `npm run test:smoke:pilot` após `npm run build`;
- criar verificador textual que falha se o workflow perder o passo.

## Fora de escopo

- rodar a suíte inteira de smoke dev (`tests/`) no CI;
- adicionar matrix de browsers;
- deploy automático;
- testar as 16 missões voxel.

## Critérios de aceite

- [x] `.github/workflows/ci.yml` contém `test:smoke:pilot` no job `codexdojo-os`.
- [x] O job instala o Chromium antes do smoke.
- [x] Verificador passa no arquivo atual e falhou contra o `HEAD` antes da correção.
