---
description: Roda o learning gate (Ágora Continuum) — invoca o subagent sonda para diagnosticar o aprendiz na unidade ativa antes de liberar a implementação. Use SEMPRE antes de uma tentativa de implementação.
argument-hint: "[unidade opcional, ex. U1-...]"
---

Learning gate atual:
!`cat learner/learning_state.yaml 2>/dev/null || echo "(sem learning_state)"`

Diagnóstico pendente:
!`ls -la curriculum/01_rate_limiter/docs/diagnostic.md 2>/dev/null || echo "(sem diagnostic)"`

Tentativas anteriores do aprendiz (em `learner/attempts/`):
!`ls -la learner/attempts/ 2>/dev/null || echo "(nenhuma tentativa ainda)"`

## Fluxo (determinístico)

1. **Confirme a unidade ativa** em `learner/learning_state.yaml > active_unit`. Se $ARGUMENTS foi
   passado e o ID bate, use-o; senão, pare e peça ao aprendiz para escolher.
2. **Leia o diagnostic** em `active_unit.diagnostic_file` (ex.: `curriculum/01_rate_limiter/docs/diagnostic.md`).
3. **Apresente o desafio** ao aprendiz. O diagnostic tem 4 tarefas: Test Design, Algorithm
   Sketch, Code Reading Risk Scan, Review Judgment. Sonda vai avaliar a tentativa em 5
   dimensões (test maturity, concurrency reasoning, error/contract, refactoring instinct, autonomy).
4. **Peça ao aprendiz** para escrever sua tentativa em `learner/attempts/<unit_id>-attempt-<N>.md`
   (template abaixo). Sem solução pronta — apenas oriente a tentativa.
5. **Quando a tentativa existir**, dispare o subagent **`sonda`** (via Task) com:
   - A unidade ativa (ID + título + projeto)
   - A tentativa do aprendiz (caminho)
   - O diagnostic.md (rubrica de avaliação)
6. Sonda classifica Dreyfus/Bloom por conceito + atualiza `learner/learner_profile.md` +
   `learner/pitfalls.md` (se houve erro recorrente) + devolve um veredicto estruturado.
7. **Se Sonda devolver GATE: UNBLOCK_RECOMMENDED** → atualize `learner/learning_state.yaml`:
   - `active_unit.state: presenting → practicing` (ou evaluating, se a tentativa já é suficiente)
   - `gate.implementation_blocked: false`
   - `active_unit.retry_count: 0` (a tentativa foi avaliada, novo ciclo)
   - Rode `python3 -m learner.substrate` para regerar os derived views (incluindo o dashboard).
   - Diga ao aprendiz: "Gate liberado. `/devschool-implement` está pronto para Fase 2."
8. **Se Sonda devolver GATE: BLOCKED** → mantenha `gate.implementation_blocked: true`. Devolva
   ao aprendiz o **desafio de tentativa** com referência explícita ao que faltou.

## Template de tentativa (`learner/attempts/<unit_id>-attempt-1.md`)

```markdown
# Tentativa — <unit_id> — <data>

## Tarefa 1: Test Design

(Nome / Setup / Action / Assertion / Risk covered — para 6 testes)

## Tarefa 2: Algorithm Sketch

```ts
function allowRequest(clientID: string, now: number): { allowed: boolean; remaining: number; reset: number; retryAfter?: number } {
  // pseudocódigo
}
```

## Tarefa 3: Code Reading Risk Scan

1. **Risk:** ...
   **Why it matters:** ...
   **Smallest safe next step:** ...

2. ...

3. ...

## Tarefa 4: Review Judgment

| Finding | Severity | Why |
|---------|----------|-----|
| A denied request returns 429 but omits `Retry-After`. | | |
| ... (5 linhas) | | |
```

## Regra do gate (decisão)

- A tentativa do aprendiz **DEVE EXISTIR** antes de Sonda classificar (sem solução pronta).
- Avaliação Dreyfus/Bloom é por **conceito**, não por unidade inteira. Um aprendiz pode estar
  em `apply` em testes e em `analyze` em concorrência.
- Pegadinhas detectadas (acertou < 60% em qualquer dimensão) viram entradas em
  `learner/pitfalls.md` com o formato `## [DATA] <descrição>` (reforço espaçado).
- A unidade NUNCA vai direto a `mastered` por causa do diagnostic. O `mastered` exige
  evidência executável (testes passando + cobertura ≥ 80% + mutation ≥ 60%) registrada
  pelo `verifier` em uma fase posterior.

## Saída final (ao orquestrador)

```
[DIAGNOSE] unidade=<id> tentativa=<caminho>
Sonda: <BLOCKED | UNBLOCK_RECOMMENDED>
Dreyfus/Bloom: <resumo por conceito>
Pegadinhas: <ids> | (nenhuma)
Gate: <blocked → unblocked> | (mantido blocked)
```
