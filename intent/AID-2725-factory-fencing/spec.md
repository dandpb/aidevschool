# Spec — takeover atômico + perdedor sem crash (P1, AID-2725)

Comportamento exigido (aceite AID-2748):

1. **Takeover atômico (S3b):** a sequência decide-expirou → trocar lease corre
   sob um lockfile `O_CREAT|O_EXCL` por evento (`leases/<event-id>.claimlock`,
   roubável após 10s se órfão); a troca em si é um único `os.replace` de arquivo
   temporário completo. Sob corrida de N threads com barreira sobre lease
   expirado: exatamente 1 vencedor; perdedores recebem `LeaseHeldError`; a
   época incrementa uma única vez (`epoch_antigo + 1`); exatamente 1 recibo de
   takeover no ledger encadeado (cadeia continua verificável).
2. **Perdedor sem crash (S3a):** leitura do arquivo de lease tolerante a
   vazio/ausente/parcial com retry curto (40 × 5ms). Perdedor de claim paralelo
   recebe erro **tipado** — `LeaseHeldError` (ou `FactoryError` em
   `lease_of`, fail-closed para o fence das estações) — nunca
   `JSONDecodeError`/`OSError` para fora do contrato.
3. **Lease ilegível é fail-closed:** arquivo de lease existente mas ilegível
   após os retries não autoriza takeover nem transição de estação.
4. **Zumbi (S2, regressão):** estações continuam recusando holder/época velhos
   (fence AID-2721 intacto); `heartbeat` corre sob o mesmo lock e não pode
   reverter um takeover (read-modify-write não clobbers o swap).
5. Exit contract do CLI preservado: `LeaseHeldError` → exit 2 (BLOCKED P1).

Invariantes preservados: takeover legítimo pós-expiração continua possível;
claim concorrente sobre lease vivo continua `LeaseHeldError`; intake idempotente
por ID; ledger `verify_chain` ok; runtime só em home fora do Git
(`.scratch/factory/` ou tmp em testes). Limites: concorrência intra-host.
