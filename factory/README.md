# Agentic factory — POC (AID-2676)

Implementação prática dos conceitos da proposta **"POC da fábrica agente"**
(anexo `agentic-factory-poc-aidevschool.export.html`, issue AID-2676):
um trabalho atravessa **entrada, contrato, construção, verificação e PR**
com estado recuperável e evidência ligada ao mesmo commit.

```
Evento → Contrato → Construir → Provar → PR + CI → Direção (humano)
 fila+lease  plano+checks   worktree    Verifier   mesmo SHA    merge
```

## Entregas (mapeamento HTML §05)

| Entrega | HTML | Aqui |
| --- | --- | --- |
| 00 · BASE | caso fixado, contrato aceito, checks congelados antes do código | `intent/AID-2676-agentic-factory-poc/` (inclui `checks.md` do piloto) + `factory/contract.py` |
| 01 · MOTOR | coordenador local: evento, lease, worktree, autor e Verifier distintos, retomada | `factory/coordinator.py` + fila/lease/ledger |
| 02 · PR | provas baratas, gate no SHA, Judge/CI no mesmo head; humano decide | `factory/gate.py` (P5 aceita `--pr-head`) — o ciclo completo roda no PR desta própria mudança |

## Layout

```
factory/
├── model.py          # Evento, Check, Prova, Lease, Recibo
├── queue.py          # fila + lease exclusivo (P1)
├── ledger.py         # recibos append-only encadeados por hash
├── contract.py       # registro versionado intent/<change-id>/ → contrato congelado
├── gitwork.py        # worktree isolado, SHA, estado da árvore (P4)
├── verify.py         # Verifier separado executa checks e grava provas (P2/P3)
├── gate.py           # promoção fail-closed (P1–P5)
├── coordinator.py    # MOTOR: orquestra estações, retomável
└── tests/            # critérios de saída P1–P5 (casos negativos inclusos)
```

Runtime state (fora do Git): `.scratch/factory/` — `queue/`, `leases/`,
`runs/<run-id>/{state.json,contract/,proofs/,receipt.summary.json}` e
`ledger/<run-id>.jsonl`. O `.gitignore` do repo já cobre `.scratch/`.

## Uso

```bash
python3 -m factory intake --event-id FE-1 --origin AID-2676 --scope "fix X" --risk low
python3 -m factory claim FE-1 --context agent-author      # 2º claim → exit 2 (P1)
python3 -m factory freeze FE-1 --change-id AID-2676-agentic-factory-poc --context agent-author
python3 -m factory build FE-1 --context agent-author --cmd "<comando que produz o commit>"
python3 -m factory prove FE-1 --context agent-verifier    # contexto distinto (P3)
python3 -m factory gate  FE-1 --context coordinator [--pr-head <sha>]
python3 -m factory ledger FE-1 --verify                   # revalida a cadeia
```

`FACTORY_HOME` reposiciona o runtime state (os testes usam tmp dirs).

### Contrato de saída do CLI (AID-2728)

- **Exit 0** só em sucesso/veredito promote; **exit 2** é o código único de
  recusa (block, fence, exceção do domínio). Exceções do domínio
  (`ContractError`, `CoordinatorError`, `LedgerError`, `FactoryError`) nunca
  derrubam traceback: viram `{"error": "<tipo>", "reason": "..."}` na stderr +
  exit 2.
- `ledger --verify` sempre imprime veredito estruturado — linha truncada ou
  não-JSON devolve `{"chain_ok": false, "error": {"line", "reason"}}` + exit 2.
- `gate` com contrato congelado adulterado devolve veredito `block` (motivo
  P4) + exit 2, como o caminho do registro versionado.
- Lease liberado (`release`) é legível pelo modelo (`released_at`) e
  fail-closed: `heartbeat`/`claim`/estações recusam com motivo estruturado —
  re-claim exige re-intake; takeover só pós-expiração (AID-2721).

## Retomada idempotente por estação (AID-2726)

Kill físico em qualquer janela de estação não trava a run — o retry converge
sem intervenção manual: `freeze` grava o state (`station: freezing`) ANTES dos
efeitos e recongela contract dir parcial/órfão (inclusive o estado legado
"contract dir sem state.json"); `build` reclama worktree de tentativa morta
(remove registro + diretório) antes de recriar no SHA da base; `gate` grava o
`receipt.summary.json` ANTES da transição `promoted` e regenera o resumo de
runs promoted sem resumo. Reentrada em `contracted`/`promoted` é idempotente e
completa recibos pendentes com `detail.backfill` (acrécimo no ledger, jamais
reescrita). Regressões: `factory/tests/test_s1_resumption.py`.

## Liberação de lease: túmulo legível (AID-2762)

`release(event_id)` com `holder_enforcement=True` (default) NÃO remove o
arquivo do lease: regrava atomicamente (tmp + replace) preenchendo o campo
`released_at` — um **túmulo legível**. A semântica de release é
**fail-closed conforme AID-2728 S7 (autoritativa, PR #535)** — o takeover
pós-túmulo originalmente proposto aqui foi retirado no update-branch:

- `Lease.released_at` é campo first-class; `Lease.from_json` ignora chaves
  desconhecidas (leitura tolerante — arquivos de lease nunca envenenam
  `lease_of`/`claim`/`lease_expired` com `TypeError`).
- Item liberado NÃO volta para `pending()` (o túmulo ocupa o slot) e NÃO é
  re-claimável — nem após expiração: `claim` → `LeaseHeldError`
  "re-intake required"; `heartbeat` e estações recusam (fence). Retomar o
  item exige re-intake pela fila.
- Takeover com época incrementada + recibo no ledger existe SOMENTE para
  lease VIVO expirado (AID-2721; regressão
  `factory/tests/test_exit_contract_2728.py::test_takeover_after_expiry_still_works`).
- `release(event_id, holder_enforcement=False)` remove o arquivo (caminho
  interno do takeover em `claim`): sem túmulo, o item volta à fila.

## Critérios de saída (HTML §04) e onde são garantidos

| ID | Afirmação | Enforcement |
| --- | --- | --- |
| P1 | Um item gera uma execução ativa; reenvio não duplica; perda/tomada do lease inviabiliza o holder obsoleto | `queue.claim` O_CREAT\|O_EXCL; intake atômico create-if-absent (tmp por escritor + `os.link`, divergência concorrente/sequencial → `FactoryError`, AID-2727/AID-2731); fencing por `epoch` + recibo de takeover no ledger; estações revalidam holder/época (AID-2718/AID-2721); takeover atômico (lockfile por evento + swap único `os.replace`) e perdedor de claim sempre com erro tipado (AID-2725) |
| P2 | Todo check aprovado tem prova; perfil `standard` pelo verificador | `verify.run_checks` + `revalidate_proofs` + `standard_profile_gaps` |
| P2+ | Prova não é auto-atestada: `{check_id, cmd_sha256, exit_code, output_sha256}` selado no recibo `verified` do ledger; gate compara runtime ↔ âncora e bloqueia divergência ou ausência de âncora (AID-2715) | `model.proof_evidence` + `gate.evidence_anchor_gaps` + `coordinator._proof_anchor`; âncora reflui em `receipt.summary.json` |
| P3 | Autor e Verifier são contextos distintos | `gate.evaluate` recusa `author_context == verifier_context` |
| P4 | Gate só promove evidência do commit e árvore examinados | digest do contrato + SHA build==verify + drift de não-rastreados |
| P5 | PR e CI concordam sobre o head | `gate.evaluate(pr_head_sha=...)` recusa head ≠ SHA provado |

O teste negativo é parte do aceite: `factory/tests/` cobre cada bloqueio.

## Fronteiras (HTML §03)

- Registro canônico único: `intent/<change-id>/` (não criar `.specs/`
  concorrente). A compatibilidade de formato com os validadores do
  `tlc-spec-lean` é um spike declarado, não resolvido por symlink.
- Runtime state fora do Git (`.scratch/factory/`); só um resumo pequeno
  (`receipt.summary.json`) pode voltar ao registro versionado.
- Não avança `learner/`, `curriculum/` nem `.mavis/`; reutiliza os padrões
  lease/outbox/ledger já provados no supervisor do
  `engines/miniMaxEvolutionEngine`, sem estendê-lo.
- Produção fica fora da primeira POC: o piloto termina em PR pronto para
  decisão humana (HTML §06, recomendado).

## Verificação

```bash
python3 -m pytest factory/tests/ -q
```
