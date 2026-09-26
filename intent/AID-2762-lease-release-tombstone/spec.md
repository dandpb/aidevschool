# Spec — AID-2762-lease-release-tombstone

Status: approved
Contrato funcional de `Lease` (model.py) e `EventQueue.release` (queue.py):

1. **Túmulo legível:** após `release(event_id)` (enforcement default True), o arquivo
   `leases/<id>.json` persiste com `released_at` preenchido (timestamp ISO UTC) e continua
   desserializável — `lease_of`/`lease_expired`/`claim` nunca levantam `TypeError` por causa
   dele.
2. **Leitura tolerante:** `Lease.from_json` ignora chaves desconhecidas do JSON (mantém os
   campos conhecidos); JSON legado sem `released_at` continua válido (`released_at=None`).
3. **Escrita atômica:** a regravação do túmulo usa tmp + `os.replace` (mesmo padrão de
   `heartbeat`); sem truncate visível.
4. **Semântica de fila inalterada:** item com túmulo fora de `pending()`; `claim` sobre
   túmulo dentro do TTL → `LeaseHeldError` (nomeando o holder); pós-expiração → takeover
   legítimo (época anterior + 1, recibo `takeover` no ledger encadeado).
5. **Caminho interno inalterado:** `release(holder_enforcement=False)` remove o arquivo
   (item volta a `pending()`); assinaturas públicas de `claim`/`submit`/`get`/`pending`/
   `lease_of`/`heartbeat` inalteradas.
