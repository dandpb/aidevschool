# Plan — AID-2725-factory-fencing

Status: approved
Aprovação: corpo de AID-2748 (CORR AID-2725) — fast path small-fix autorizado
(plano curto no registro + self-verification); review nunca pulada; PR único
para `main`, single-writer + countersign (protocolo AID-2655), sem force-push.

Passos (diff mínimo, sem toque em produção):

1. `factory/queue.py`:
   - `_read_lease`: leitura tolerante com retry curto (S3a);
   - `_claim_lock`: lockfile `O_CREAT|O_EXCL` por evento, steal de lock órfão
     após 10s, timeout 30s com `FactoryError` tipado;
   - `claim`: fresh claim segue `O_CREAT|O_EXCL`; perdedor pega o lock,
     re-lê com tolerância e decide uma vez — lease vivo → `LeaseHeldError`;
     expirado → swap único `os.replace` com `epoch+1` + recibo de takeover,
     tudo sob o lock (S3b); lease ilegível → `LeaseHeldError` fail-closed;
   - `lease_of`/`lease_expired`: erros tipados (`FactoryError` "unreadable"
     fail-closed; fence das estações continua recusando);
   - `heartbeat`: read-modify-write sob o lock (não reverte takeover);
     `release`: escrita tronca→completa via `os.replace` sob o lock.
2. `factory/tests/test_p1_atomic_takeover.py`: S3a determinístico (lease
   vazio/parcial → tipado) + contenção 8-way × 40; S3b corrida 2 e 4 threads
   com barreira (60/25 iters, 1 vencedor, 1 recibo, sem lockfile órfão);
   S2 regressão end-to-end pelo caminho real de takeover (prove/gate pós-takeover).
3. `factory/README.md`: linha P1 da tabela de gates menciona takeover atômico.
4. Auto-verificação (worktree limpo na base `ae9db6fc`):
   `python3 -m pytest factory/tests/ -q` (baseline 37 + novos = 48, verde);
   repros S2/S3a/S3b adaptados de `/paperclip/w2716/stress/` (mesma lógica de
   corrida; S3a com home fresco por rodada) — S2 PASS, S3a PASS 300/300,
   S3b PASS 0/300 duplos; base BROKEN 43/300 (S3b) e 76/300 (S3a) primeiro.
5. Verificação independente: veredito fresh-context do QA Lead (re-run S2/S3
   em clone limpo na base do PR) anexado ao issue antes do `done`; merge
   single-writer citando countersign (AID-2655).
