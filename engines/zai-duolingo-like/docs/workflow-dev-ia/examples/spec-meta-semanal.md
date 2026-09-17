# Spec — Meta semanal configurável

> Exemplo real do workflow `docs/workflow-dev-ia/README.md`.
> Esta spec foi escrita ANTES do código e executada passo a passo em 2026-08-19.

## 1. Contexto (por quê)

A Home exibe o progresso da meta semanal de XP (`streak.weeklyXp` vs
`streak.weeklyGoal`), mas a meta é fixa em 50 XP para todo mundo. Learners
casuais se frustram; learners avançados não têm desafio. O Duolingo resolve
isso deixando o usuário escolher a meta.

## 2. Escopo

**Dentro:**

- Novo endpoint `POST /api/streak/goal` para definir a meta semanal.
- Valores permitidos: `50`, `100`, `150`, `200` (XP por semana).
- Persistência em `Streak.weeklyGoal` (campo já existe no schema — sem migração).
- O `GameSnapshot` já expõe `streak.weeklyGoal` (nenhuma mudança em `game-state`).

**Fora (próximos passos, não nesta spec):**

- UI de seleção de meta no Profile/Home.
- Reset/recálculo de `weeklyXp` ao mudar a meta.

## 3. Requisitos (contrato)

| # | Requisito | Detalhe |
|---|---|---|
| R1 | Meta válida é aceita | `POST { goal: 100 }` → `200 { ok: true, weeklyGoal: 100 }` e `Streak.weeklyGoal` persistido |
| R2 | Meta fora da lista é rejeitada | `POST { goal: 75 }` → `400 { ok: false, error: "invalid-goal" }`, nada persistido |
| R3 | Payload ausente/inválido é rejeitado | `{}`, `{ goal: "cem" }` → `400 invalid-goal` |
| R4 | Idempotente | enviar a mesma meta 2× retorna `200` nas duas |
| R5 | Seam de leitura reflete a mudança | `snapshot()` passa a retornar o novo `streak.weeklyGoal` |
| R6 | Learner sem linha de streak | não pode quebrar — cria a linha se necessário (mesmo padrão do route de settings) |

## 4. Critérios de aceite (viram testes)

1. `tests/api/streak-goal.test.ts` — happy path persiste e responde a meta.
2. valor fora da lista → 400 `invalid-goal` e banco inalterado.
3. payload sem número → 400 `invalid-goal`.
4. chamada dupla com a mesma meta → dois 200.
5. após o POST, `snapshot()` retorna `streak.weeklyGoal` atualizado.

## 5. Plano de execução

1. Criar `src/app/api/streak/goal/route.ts` seguindo o padrão de
   `src/app/api/streak/milestone/route.ts` (`force-dynamic`, `getCurrentLearner`,
   allowlist, update, resposta `{ ok }`).
2. Criar `tests/api/streak-goal.test.ts` seguindo o padrão de
   `tests/api/streak-milestone.test.ts` (`resetDatabase` + `seedBaseline` + `postJson`).
3. Validar: `npx vitest run`, `npm run lint`, `npx tsc --noEmit`.
4. Registrar o resultado nesta spec (seção 6) — a spec vira registro permanente.

## 6. Resultado da execução

Executado em 2026-08-19, exatamente pelo plano da seção 5:

| Entrega | Arquivo |
|---|---|
| Endpoint | `src/app/api/streak/goal/route.ts` (~40 linhas, padrão do route de milestone) |
| Testes | `tests/api/streak-goal.test.ts` (6 testes cobrindo R1–R6) |

Validação (comandos reais, saída real):

```text
$ npm test          → Test Files 23 passed (23) | Tests 110 passed (110)
                      (inclui tests/api/streak-goal.test.ts — 6 tests ✓)
$ npm run lint      → 0 errors
$ npx tsc --noEmit  → 0 errors
```

Todos os critérios de aceite da seção 4 cobertos por teste automatizado:

1. ✅ happy path persiste e responde a meta (`valid goal → 200 ...`)
2. ✅ valor fora da allowlist → 400 e banco inalterado
3. ✅ payload sem número → 400 (`{}` e `{ goal: "cem" }`)
4. ✅ chamada dupla → dois 200 (idempotente)
5. ✅ `snapshot()` reflete a nova meta (a seam de leitura não precisou mudar)
6. ✅ learner sem linha de streak → cria a linha

Nota de ambiente: `package-lock.json` e `bun.lock` estavam dessincronizados do
`package.json` (drift pré-existente). A instalação usou `bun install`, que
atualizou o `bun.lock`. Nenhuma dependência foi adicionada pela feature.
