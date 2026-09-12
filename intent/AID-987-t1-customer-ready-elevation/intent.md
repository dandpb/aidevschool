# Intent — AID-987/T1: elevar 3 use cases a `customer-ready` (cenários continuity + T1b telemetria + rotas estáticas D2-A)

Paperclip issue: AID-987 (high, in_progress; filha do desbloqueio CEO AID-986).
Owner: Founding Product Engineer (fa8130d5).
**Pedido autoritativo:** ordem AID-987 (esqueleto §9-T1 da spec AID-981,
doc `proposal` rev `2d4e447d` — revisada e ACEITA pelo CEO; ver dictame no
comentário AID-986). Decisões registradas: **D1 = pacote de 3** (dojotoday P1,
voxel P2, pixelquest P3) · **D2 = A** (deploy estático mínimo das rotas
declaradas NO MESMO PACOTE do regrant v34) · **D3 = LIGAR** (módulo T1b
telemetria anônima, padrão AID-913) · **Gate §8(b)**: O3-C2 (AID-838)
deliberadamente enfileirada atrás desta onda.

## Problema

Consenso AID-900: o risco migrou de "funciona?" para "alguém precisa disso?".
A superfície vendável tem 2/8 use cases `customer-ready`; os 3 candidatos
programador (dojoToday hábito diário, voxel loop 3D, pixelquest encontro 2D)
cumprem happy-path + recovery + manuais, mas carecem do critério mecânico
`continuity`, de rota de entrada alcançável (dojoToday/voxel) e de qualquer
telemetria de funil — o "hábito diário" que motivou a prioridade é hoje
imensurável.

## Outcome

- 3 cenários `continuity` novos (`dojotoday-returning-next-day`,
  `voxel-standalone-return-reentry`, `pixelquest-returning-evidence-handoff`)
  com automação playwright nos 3 engines.
- `intendedTier: customer-ready` para os 3 use cases no `inventory.yaml`
  (regrant v34 é do countersign QA AID-988, no mesmo pacote/PR).
- T1b: eventos anônimos mínimos (`daily-view-open`, `voxel-loop-complete`,
  `pixelquest-encounter-complete`, `evidence-handoff`) em batch sem PII para o
  MESMO coletor AID-913 (envelope novo v3 no `dojo-analytics-collector.mjs`).
- D2-A: deploy estático mínimo pronto — `engines/dojoToday/netlify.toml`
  (functions + redirect do coletor + demo notice) e
  `engines/voxelDojo/game-02-warehouse/netlify.toml` (jogo de referência);
  rotas declaradas no inventário. O deploy live em si é passo founder/CEO
  (janela single-writer entre sessões O1) — este PR o torna executável.

## Sistemas afetados

- `docs/product-readiness/` (scenarios, inventory, README renderizado)
- `engines/shared/teaching-evidence/` (módulo de funil anônimo compartilhado)
- `learner/gate/netlify-functions/dojo-analytics-collector.mjs` (+ testes)
- `engines/dojoToday/` (fixtures continuity, seam de teste, telemetria, netlify)
- `engines/voxelDojo/game-02-warehouse/` (spec re-entry, netlify)
- `engines/pixelDojo/pixel-quest/` (spec retorno)

## Restrições (anti-escopo §7 da spec vigente)

- Zero mudança de comportamento de app fora T1b/rotas; sem persistência
  inventada em voxel/pixelquest; sem contas/billing/serving per-learner;
  sem tocar learner state, gates, mastery ou política do verificador;
  dojoToday permanece read-only; produtor ≠ verificador preservado.
- Não editar projeções geradas à mão (`src/data/today.ts` é regenerado pelo
  substrato; os fixtures de teste são arquivos NOVOS fora do caminho gerado).

## Questões abertas

- Nenhuma de design. Execução do deploy live (signup/CLI Netlify) permanece
  founder-gated — segredo de produção não entra no repo.
