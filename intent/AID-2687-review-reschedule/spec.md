# Spec — AID-2687-review-reschedule

## Comportamento exigido (pós-mudança)

S1. `t_verdict_pass(review=True)` em conceito `REVIEW_DUE`:
    - move para `MASTERED`, dobra `target_days_effective` (cap 365) — inalterado;
    - **limpa `next_review_ts` para `None`**.

S2. `t_verdict_fail(review=True)` em conceito `REVIEW_DUE`:
    - move para `IN_PROGRESS`, reseta `target_days_effective` para o alvo do
      currículo, de-scaffoldiza — inalterado;
    - **limpa `next_review_ts` para `None`**.

S3. `schedule.py`, executado após S1, agenda o próximo degrau:
    `next_review_ts = last_pass_ts + gap_days(target_apos_dobrar)` e emite
    `review_scheduled`; `next_due_ts` do stdout reflete esse ts.

S4. `replay.py` reconstrói `next_review_ts` idêntico ao `state.json` vivo em
    cenários com veredito de revisão (diffs vazios, exit 0).

S5. Determinismo preservado: mesmas entradas → mesmos bytes (INV-4 continua).

## Casos negativos

N1. Veredito de revisão fora de `REVIEW_DUE` → `reject` (inalterado).
N2. `review_due` idempotente por `review_due|cid|next_review_ts` (inalterado;
   a limpeza acontece só no veredito, não no disparo).

## Impacto em estados legados

Ledgers gravados antes da correção que contenham veredito de revisão
reconstruirão `next_review_ts = None` onde o estado vivo guarda o ts velho —
replay fecha em erro (fail-closed correto: o estado antigo estava bugado).
Nenhum fixture gravado no repo cobre esse caso (verificado em c54e12ee).
