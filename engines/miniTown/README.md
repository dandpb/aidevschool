# miniTown — simulador cozy de cidade (Nível 0)

Engine Three.js/Vite de simulação observacional de cidade — estética entre Townscaper e
A Short Hike. Ciclo dia/noite (5 min = 24h simuladas), zonas (residencial/comércio/trabalho),
residentes e veículos com rotinas, HUD mínimo. **Sem menus, sem pausa, sem pré-requisito de
código** — é a entrada cozy do ecossistema para o público não-técnico (AD-004, `docs/VISION.md`).

## Rodar

```bash
cd engines/miniTown
pnpm install
pnpm run dev      # abre http://127.0.0.1:5173
```

Scripts: `pnpm run test` (vitest) · `typecheck` · `build` · `smoke` (Playwright) · `lint` (biome).

## Status e evidência

- Estágio: **MVP** (plano de 5 tasks — `.mavis/plans/miniTown.yaml`). A
  verificação independente de 2026-07-19 registrou 14/14 testes e build
  estático limpo. O `package.json` atual define 26 testes; re-execute no commit publicado — o
  resultado histórico não certifica mudanças futuras.
- Evidência de runtime exposta em `window.__miniTown` (contrato observacional; não emite
  evidência de mastery — miniTown não marca aprendizado).
- Trilha pedagógica associada: `curriculum/00_ai_in_practice/` (Nível 0 do catálogo).

## Setup local mínimo

- Setup mínimo (só este engine): `./setup.sh onboard` na raiz do ecossistema.
  O comando ainda requer Node/Corepack e instala dependências; não é uma rota
  pública sem instalação.
- Deploy público estático: `netlify.toml` neste diretório (build `npm run build`, publish
  `dist/`). O deploy deve partir de um commit limpo e do resultado atual de
  lint, testes, typecheck, build e smoke.

## Limites

Este engine é superfície de exploração: ele nunca escreve estado canônico do aprendiz e não
substitui o gate (produtor ≠ verificador, como todo engine do ecossistema).
