# codexDojo — contexto de raiz (Claude Code)

codexDojo é a **superfície de produto** do ecossistema `aidevschool`: a SPA local que mostra
o painel operacional (agentes, ciclo, roadmap, learner snapshot) e referencia os contratos do
ecossistema em `engines/codexDojo/ecosystem/`.

> Playbook canônico em **[AGENTS.md](AGENTS.md)**. Este arquivo é só o ponteiro de raiz,
> seguindo o mesmo padrão do ecossistema (AGENTS.md é a fonte; CLAUDE.md aponta).

## Stack

- **Linguagem:** TypeScript (strict).
- **Build:** Vite. **Lint:** Biome. **Test:** Vitest + Testing Library.
- **Render:** HTML strings em `src/render/*.ts`, montadas em `src/app.ts`. Sem framework
  de UI (vanilla DOM); o estado é um reducer puro (`src/state.ts`).

## Regras de ouro (herdadas do ecossistema)

1. **Learning gate:** o aprendiz tenta e é avaliado (evidência executável) antes de marcar
   `mastered`. O dashboard reflete `learner/learning_state.yaml` via `src/data/learner.ts`
   (regenerado por `python3 -m learner.substrate.dashboard_snapshot`).
2. **Produtor ≠ verificador.** A render function não decide se algo está "verificado"; ela
   consome `LearnerSnapshot` (declarado em `src/domain.ts`) e mostra.
3. **Sem afirmações sem evidência.** Métricas, status de cobertura e contagens de projeto
   vêm de fontes canônicas (`curriculum/catalog.md`, `learner/learning_state.yaml`), nunca
   hardcoded no render.
4. **Filesystem é a fonte da verdade.** O dashboard lê arquivos gerados pelo substrate;
   qualquer mudança em `learner/` precisa de `python3 -m learner.substrate` antes de
   `pnpm run build` para refletir no bundle.
5. Antes de commit: rode `/simplify` no diff, aplique, **depois** commite.

## Onde começar

- **Adicionar uma nova view:** adicionar tipo em `src/domain.ts`, função render em
  `src/render/<view>.ts`, registro em `src/render/shell.ts`, testes em
  `<view>.test.ts`. Mirrore o pattern de `render/agents.ts` ou `render/overview.ts`.
- **Adicionar um novo agente (data):** adicionar tipo em `src/domain.ts`, registro em
  `src/data/agents.ts`, função render em `src/render/agents.ts`. Não introduzir um
  agente sem referência canônica em `engines/minimaxDojo/prompts/per_agent/`.
- **Adicionar um dado derivado do learner:** adicionar campo em `LearnerSnapshot`
  (`src/domain.ts`) + atualizar `learner/substrate/dashboard_snapshot.py` para
  popular. **Não** computar no render — o substrate é a fonte da verdade.

## Validação

```bash
pnpm run lint      # biome check src
pnpm run test      # vitest run (55 tests in 9 files)
pnpm run build     # tsc --noEmit && vite build
```

Após mudar `learner/`:

```bash
python3 -m learner.substrate   # regenerate derived views + dashboard snapshot
pnpm run build                 # re-bundle with fresh data
```