<!-- issue: AID-2688 | key: volume-stress-receipt | doc_id: 8d9ae69d-4e82-4f8a-b6e6-4d1c9e26d79e | updated: 2026-09-26 03:46:34.478+00 -->

# Receipt — Volume stress (lote de lições)

(AID-2688)

# RECEIPT — AID-2688 FACTORY-STRESS Volume ritmo-Duolingo (lote de lições)

**Veredito: LOOP JUSTIFICA O CUSTO EM LOTE (≥10) — 14/14 promovidos, 15/15 cadeias de ledger íntegras.** O custo fixo por item é dominado por checkout completo (79% do ciclo), não pela verificação em si.

## Ambiente
- Worktree novo na base `ae9db6fc` (tip de `origin/main`; pós-merge #527 `2d9928f2`, inclui hardening #529/#530).
- Baseline: `python3 -m pytest factory/tests/ -q` → **37 passed**.
- Runtime: `.scratch/factory/` (gitignored) no worktree; saturação em `FACTORY_HOME` separado (`/tmp/opencode/w2688/sat-home`).
- Contratos do lote em `intent/AID-2688-volume-stress-lessons/` (compartilhado) + `intent/AID-2688-vs-item-{a,b}/` (por-item); checks C1–C4 (C3/C4 profile=standard).

## O que rodou (comandos + saídas-chave)
Lote de 14 itens (12 com contrato compartilhado `FE-L01..FE-L12`, projetos `curriculum/00..11`; 2 com contrato por-item `FE-P01/P02`), por item:
```
python3 -m factory --repo <wt> intake  --event-id FE-Lxx --origin AID-2688 --scope "lesson-note <proj>" --risk low
python3 -m factory --repo <wt> claim   FE-Lxx --context cce-author-93e26ea9      # verificador ≠ autor (P3)
python3 -m factory --repo <wt> freeze  FE-Lxx --change-id <registro> --context cce-author-93e26ea9
python3 -m factory --repo <wt> build   FE-Lxx --context cce-author-93e26ea9 --cmd "bash author.sh <proj> FE-Lxx"
python3 -m factory --repo <wt> prove   FE-Lxx --context cce-verifier-distinto
python3 -m factory --repo <wt> gate    FE-Lxx --context cce-coordinator          # verdict: promote ×14
python3 -m factory --repo <wt> ledger  FE-Lxx --verify                           # hashes_ok+chain_ok ×15
```
Mudança-padrao: 1 linha `lesson-note:AID-2688` em `curriculum/<proj>/docs/learning_notes.md`, 1 commit por item.

## Métricas (missão)
| Métrica | Resultado |
| --- | --- |
| Throughput sequencial | **25.8 itens/min** (32.6s de parede p/ 14 itens; 2.32s/item) |
| Tempo por estação (média) | build 1.84s (79%) · prove 0.19s · intake/claim/freeze/gate/ledger ~0.06s cada |
| Dominante do build | `git worktree add` = 1.23s (checkout completo de **5.848 arquivos** p/ diff de 1 arquivo) |
| Custo de disco | 15 worktrees = **3.2GB** (~213MB/item) p/ 15 edições de 1 linha — worktrees removidos após gate |
| Intake idempotente em lote | reenvio dos 12 IDs → rc=0, fila permanece **14 arquivos** (sem duplicar) |
| Saturação da fila | 2.000 intakes sintéticos: p50 **flat 56.5→57.1ms** (0-500 … 1500-2000), sem joelho; teto ~17 intakes/s limitado por spawn de processo (~55ms), não pela fila; `pending()` (varredura O(N)) 0.10s @2.000; claim/duplo-claim O(1) @2.000 |
| P1 ao vivo | duplo claim por outro contexto → rc=2 `BLOCKED (P1)` |
| Custo por item vs. benefício | Governança barata (cadeia de evidência íntegra), mas 79% do ciclo é checkout — desperdício p/ micro-edição. Com propostas P-1/P-2 o custo marginal cai ~3× e o loop fica claramente justificado no ritmo Duolingo; item único avulso continua viável porém desperdiçador |

## Fricções/defeitos (repro mínima)
1. **B5 confirmado ao vivo (já trackeado AID-2732, backlog/high)**: `freeze` no registro canônico → `ContractError: plan.md header must carry 'Status: approved'` (base `ae9db6fc`). *Nota p/ AID-2732:* a repro mínima documentada (freeze sem claim) agora esbarra antes no fence P1 ("no lease for …"); incluir `intake`+`claim` antes do `freeze` na repro.
2. **Parser de `checks.md` reescreve `||` como `|` (silencioso)**: `C1 | test -f Makefile || echo missing` → cmd congelado `test -f Makefile | echo missing` (OR vira pipe — semântica do check alterada sem erro). Repro: `parse_checks_md("C1 | test -f Makefile || echo missing
")[0].cmd`.
3. **Raio de explosão do contrato compartilhado**: edição no registro entre freeze e gate bloqueia TODAS as runs daquele contrato (P4 fail-closed, correto), mas em lote com contrato compartilhado uma edição envenena o lote inteiro. Repro ao vivo: edit `plan.md` pós-freeze → gate `block: contract digest drifted`. *(Comportamento desejável no gate; problema é o modo lote depender de registro vivo.)*
4. **Processo por estação (~55ms × 7 chamadas/item)**: teto medido de 17 intakes/s; 2.000 intakes = 115s de puro spawn.

## Propostas de melhoria (≥2 — replicadas na umbrella AID-2681)
- **P-1 Worktree quente/sparse p/ lotes de conteúdo**: `--worktree-reuse` ou sparse-checkout (cone) na estação build → build 1.84s→~0.3s, ~3× throughput, elimina 213MB/item de churn. Isolamento P4 preservado: tree-state capturado por run + detach limpo por item.
- **P-2 Modo lote/daemon (`factory batch`)**: intake de N eventos num processo; elimina 7×55ms de spawn/item; idempotência de lote atômica (reenvio do lote = no-op). Teto 17/s → centenas/s.
- **P-3 (complementar) Pin do contrato por ref git no freeze**: gate compara contra o ref pinado, não o diretório vivo — remove a fricção 3 e casa com a semântica "congelado".

## Limites respeitados
Worktree novo pós-#527; nada promovido a `main` (commits ficam nos worktrees da fábrica, removidos após gate; ledger/receipts permanecem em `.scratch/factory/`); produção intacta; produtor ≠ verificador (`cce-author-93e26ea9` × `cce-verifier-distinto`, P3 exigido pelo gate); sem PII; custo externo zero.
