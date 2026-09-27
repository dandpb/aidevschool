# Plan — AID-2721-p1-lease-fencing

Status: approved
Aprovação: bloco "Missão"/"Aceite" de AID-2721 (fast path autorizado para fix
bornido; auto-verificação e revisão produtor≠verificador não dispensadas).

Passos (diff mínimo, sem toque em produção):

1. `factory/model.py`: `Lease.epoch: int = 1`.
2. `factory/queue.py`: takeover pós-expiração incrementa época e grava recibo
   encadeado `station leased -> leased` com `detail.takeover`; claim normal
   segue O_CREAT|O_EXCL com época 1.
3. `factory/coordinator.py`: `_fence()` — lease presente, não expirado,
   holder == holder do congelamento (acting context no freeze), época igual à
   do congelamento; chamado em `freeze`, `build`, `prove`, `gate` antes de
   qualquer mutação de state/ledger; `state.json` passa a carregar
   `lease_holder`/`lease_epoch`.
4. `factory/tests/test_p1_fencing.py`: X3 (takeover por terceiro) e X3b
   (lease ausente) adaptados + época/takeover-receipt + happy path com fence.
5. `factory/README.md`: linha P1 da tabela de gates menciona fencing.
6. Auto-verificação: `python3 -m pytest factory/tests/ -q` (baseline 18 +
   novos, tudo verde) e dogfood do motor (freeze→build→prove→gate desta
   própria mudança) com veredito independente antes do merge.
