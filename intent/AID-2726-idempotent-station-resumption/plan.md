# Plan — AID-2726-idempotent-station-resumption

Status: approved
Aprovação: blocos "Missão"/"Aceite" de AID-2735 (fast path autorizado para fix
bornido; auto-verificação e revisão produtor≠verificador não dispensadas).

Passos (diff mínimo, sem toque em produção):

1. `factory/model.py`: estação intermediária `"freezing"` em `STATIONS`
   (write-ahead do freeze).
2. `factory/coordinator.py::freeze` — write-ahead + reentrada:
   - grava `state.json` com `station="freezing"` ANTES de `contract.freeze`
     (efeitos depois do state);
   - reentrada com state `freezing`: honra `base_sha`/`change_id` persistidos,
     faz reclaim (rmtree) de contract dir parcial/órfão e recongela;
   - reentrada com state `contracted` (kill entre state e recibo): devolve o
     contrato congelado (digest validado) e completa o recibo pendente via
     `_backfill_receipt` (idempotente — não duplica transição já no ledger);
   - recovery legado: contract dir sem state.json (ordem antiga de escritas) é
     reclamado e recongelado.
3. `factory/gitwork.py`: `create_worktree` idempotente — worktree existente ou
   registro stale de tentativa morta é reclamado (`worktree remove --force` +
   `prune` + rmtree do diretório) antes de recriar no SHA da base (S1b).
4. `factory/coordinator.py::gate` — write-order + regeneração (S1d):
   - grava `receipt.summary.json` ANTES do state final (janela de kill deixa
     `verified`+resumo; retry re-avalia e regrava);
   - reentrada em `promoted`: com resumo → devolve a decisão registrada; sem
     resumo (kill antigo/legado) → regenera a partir do recibo de promoção do
     ledger e completa recibo pendente com `detail.backfill`; sem recibo de
     promoção → fail-closed.
5. `factory/tests/test_s1_resumption.py`: regressões S1a (kill físico via
   monkeypatch `_save_state`→`os._exit(9)`; kill pós-write-ahead com contract
   dir parcial; órfão legado sem state; reentrada contracted com backfill),
   S1b (SIGKILL real com autor dormindo; registro stale sem diretório;
   recriação idempotente) e S1d (kill entre resumo e state; promoted sem
   resumo regenera; reentrada promoted com resumo é idempotente).
6. `factory/README.md`: seção de retomada idempotente por estação.
7. Auto-verificação: `python3 -m pytest factory/tests/ -q` (baseline 27 +
   novos, tudo verde) + reexecução dos repros S1a/S1b/S1d do harness de stress
   contra a árvore corrigida; veredito independente (fresh-context verifier
   contra este plan) antes do merge; CI verde incl. `SDLC guardrails (diff)`;
   merge single-writer citando o veredito (`Countersign:`).
