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

- Estágio: **MVP** (plano de 5 tasks concluído — `.mavis/plans/miniTown.yaml`,
  `plan_complete: true` em `.mavis/plans/decision.json`; 31/31 testes verdes na conclusão do plano).
- Evidência de runtime exposta em `window.__miniTown` (contrato observacional; não emite
  evidência de mastery — miniTown não marca aprendizado).
- Trilha pedagógica associada: `curriculum/00_ai_in_practice/` (Nível 0 do catálogo).

## Limites

Este engine é superfície de exploração: ele nunca escreve estado canônico do aprendiz e não
substitui o gate (produtor ≠ verificador, como todo engine do ecossistema).
