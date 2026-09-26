# Intent — AID-2687-review-reschedule

## Problema (motor de progressão / revisão espaçada)

Depois do primeiro ciclo de revisão, a escada de revisão espaçada (§5.3) para
silenciosamente:

- `t_verdict_pass(review=True)` e `t_verdict_fail(review=True)` movem o conceito
  para fora de `REVIEW_DUE` mas **não limpam `next_review_ts`** (o ts consumido).
- `schedule.py` passo 1 só (re)agenda conceitos `MASTERED` com
  `next_review_ts is None`; passo 2 é idempotente por
  `review_due|cid|next_review_ts` (mesma chave → nunca refira).

Resultado: o conceito fica `MASTERED` com um `next_review_ts` no passado, nunca
mais é reagendado e sai da escada de revisão para sempre — a régua dobra
(`target_days_effective`) mas a régua nunca é usada de novo.

Invariante do dono do engine: **dada uma revisão passada, o aprendiz recebe a
próxima revisão em `last_pass_ts + gap_days(2 × target)`** — hoje quebrada no
fluxo real (os testes de transição pinavam a escada mas nunca atravessavam o
loop do `schedule.py`).

## Mudança (mínima)

1. `_state_transitions.t_verdict_pass` (ramo review) e `t_verdict_fail` (ramo
   review): `next_review_ts = None` ao deixar `REVIEW_DUE`.
2. `replay.py`: o fold espelha a limpeza nas `state_transition`
   `REVIEW_DUE → MASTERED|IN_PROGRESS` (paridade §7.2 preservada).
3. Regressão: INV-5/INV-6 em `tests/acceptance/test_review_ladder.py`
   (nível transição + e2e pelos scripts reais com replay).

## Fora de escopo

- Nenhuma mudança de formato de conteúdo, UI ou telemetria.
- Nenhuma mudança na política de gap/cap (0.15 × target, cap 365) — pinada por
  INV-1..INV-4.

## Risco

`medium`: toca transições de estado do motor e paridade de replay; sem mudança
de schema de eventos (nenhum evento novo; apenas projeção de campo).
