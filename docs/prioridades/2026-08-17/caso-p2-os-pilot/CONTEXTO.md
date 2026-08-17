# CONTEXTO — deploy estático do piloto

## Incluído

- `engines/codexdojo-os-prototype/netlify.toml`;
- `package.json` e scripts `build:pilot` / `test:smoke:pilot`;
- `scripts/bundle-missions.mjs`;
- `playwright.pilot.config.ts`;
- `tests-pilot/pilot-build.smoke.spec.ts`;
- `src/missions/catalog.ts` e `src/data/missions.ts`.

## Excluído

- qualquer segredo ou valor de `.env.production`;
- servidores de desenvolvimento das missões;
- backend, verificador remoto e deploy público;
- os demais engines que não participam deste piloto;
- `dist/`, caches e `test-results-pilot/` como fonte.

## Decisão

O problema é de composição de build e origem do iframe. O contexto selecionado permite provar
isso sem enviar o repositório inteiro ao agente nem misturar a decisão de produto sobre a trilha.
