# State Machine — Especificação

> **Canônico:** [`../../docs/02_state_machine.md`](../../docs/02_state_machine.md)

## Estados de uma unidade

```
APRESENTANDO → PRATICANDO → AVALIANDO → DOMINADO
                  ↑            │
                  └─── RETRY ──┘ (≤ 3)
                                ↓
                          FALHA_BLOQUEIO → SÊNECA
```

## Sub-máquina de AVALIANDO (portão empírico)

```
PRODUCING → VERIFYING → DONE
   ↑           │
   └───────────┘ (PROMĘTOR reprova → wake-up Mestre-Conteúdo)
```

## Invariantes

1. `DOMINADO` requer PASS do **PROMĘTOR** com evidência executável.
2. **PROMĘTOR nunca recebe contexto do Mestre-Conteúdo** (adversarial).
3. `retries ≤ 3` por unidade; ao esgotar → **SÊNECA** decide.
4. Toda decisão → log em `event_log/`.

## Implementação de Referência

A state machine é **declarativa** (tabela de transições). Pode ser implementada em qualquer runtime determinístico; a referência conceitual está em [`../../docs/02_state_machine.md`](../../docs/02_state_machine.md) § 8.

> O **runtime** (não o LLM) garante as transições. O Maestro propõe, o runtime confirma.
