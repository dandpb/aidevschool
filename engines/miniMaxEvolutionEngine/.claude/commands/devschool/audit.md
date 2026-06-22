---
description: Auditoria amostral cross-model — dispara o subagent verifier-haiku para re-verificar uma fração (audit_sample_rate, default 0.2) das fases já completadas. Diversidade de modelo: se discordar do verifier padrão, escala Sêneca.
argument-hint: "[fase opcional, ex. benchmark]"
---

Audit config:
!`cat .mavis/plans/plan.yaml 2>/dev/null | grep -A 6 verifier_config || echo "(sem plan.yaml)"`

Estado do ciclo atual:
!`cat learner/pipeline_status.md 2>/dev/null | head -20 || echo "(sem pipeline_status)"`

Lógica de amostragem (do plano):
- `audit_sample_rate` = 0.2 → 20% das fases já completadas ganham audit.
- Decisão: rolagem determinística baseada em `hash(unit_id + phase)` para que a mesma unidade
  sempre caia no audit (reprodutibilidade).
- Se `audit_sample_rate == 0.0` → audit desligado; avise e sugira ligar.
- Se `audit_sample_rate == 1.0` → audita todas; caro, mas útil para milestones.

Se $ARGUMENTS foi passado, audite a fase `$ARGUMENTS` do projeto ativo (força override da
amostra). Caso contrário, itere sobre todas as fases `cycle-complete` em
`learner/pipeline_status.md` e dispare o audit nas que cairam na amostra.

Para cada unidade na amostra:

1. Identifique o `deliverable-<fase>.md` correspondente (ex.: `curriculum/01_rate_limiter/deliverable-benchmark.md`).
2. Identifique o `verify_prompt` canônico (de `.mavis/plans/plan.yaml` ou de `commands/devschool/<fase>.md`).
3. Dispare o subagent **`verifier-haiku`** (via Task) com os dois.
4. Quando retornar:
   - Se `verdict: agree` → log em `event_log` (`{"ev":"audit.cross_model","agree":true}`) e PARE.
   - Se `verdict: disagree` → NÃO marque nada como DONE; escale imediatamente ao **seneca** com
     `/devschool-decide cross-model-disagreement <fase> <projeto>` (decisão consequente, SLA 24h,
     default conservador = reverter a unidade a `cycle-in-progress` e pedir nova verificação
     com o `verifier` padrão).

## Regras

- **Audit não modifica código** — só julga. Mesmo contrato que o `verifier` padrão.
- Se a fase já está em `cycle-complete` há >7 dias e o audit encontra regressão, anote em
  `learner/pitfalls.md` (`## [DATA] audit-found-regression`).
- Audits geram ruído no log; só faça quando explicitamente pedido ou conforme
  `audit_sample_rate`. Não rode a cada ciclo.

## Saída final (ao orquestrador)

```
[AUDIT] unidade=<id> fase=<fase> amostra=<em-amostra|forcado>
Verdict anterior: <PASS|FAIL>  |  Verdict atual: <PASS|FAIL>
Concordância: <agree|disagree>
Ação: <log | escalate-seneca>
```
