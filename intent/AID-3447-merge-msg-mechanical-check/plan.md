# Plan: AID-3447-merge-msg-mechanical-check

Author: CEO (agent 501cb456) · Date: 2026-09-30 · Fast path normal
(artefatos colapsados: intent.md + este plan.md; decisão CEO AID-3447 é o
plano aprovado)

## Entregas mapeadas na decisão

| # | Entrega | Arquivo/superfície | Verificação |
| --- | --- | --- | --- |
| E1 | `merge_msg_check.py`: check fail-closed por range/sha — só merge commits (≥2 parents); linha `^Countersign: ` com conteúdo no CORPO (bloco após o subject); title-only e corpo vazio falham; `--self-test` hermético (história sintética com o shape #607 e o shape da porta); `--open-incident` best-effort idempotente | `scripts/merge_msg_check.py` (novo) | `python3 scripts/merge_msg_check.py --self-test`; contra-história real: `--sha 8975ba43` → VIOLATION rc=1; `--sha a1f0d724`/`262a781b` → PASS; range `2fb688ac..262a781b` → só `8975ba43` |
| E2 | Workflow `merge-msg-gate`: push@main (range `before..sha`; base infranqueável → só o head, convenção do CI sdlc-guards) + workflow_dispatch backfill; self-test primeiro; incidente Paperclip `if: failure()` `continue-on-error` | `.github/workflows/merge-msg-gate.yml` (novo) | YAML parse; leitura cruzada E1; dogfood no merge do próprio PR (merge pela porta ⇒ run verde) |
| E3 | Porta fail-closed §5b: `body_has_canonical_line` + recusa de body sem linha canônica + 4 casos no `--self-test` | `scripts/merge_pr.sh` | `bash scripts/merge_pr.sh --self-test` (26 passed, 0 failed) |
| E4 | Emenda AID-3447 em `docs/sdlc/README.md` §Merge protocol item 5: 5ª ocorrência, mitigações íntegras, sem ação retroativa (paridade #514), item 3 mecânico (D1+D2) | `docs/sdlc/README.md` | leitura cruzada com AID-2655/AID-2428/AID-3433 (mesma série de emendas) |

## Sequência

1. Branch `aid-3447/merge-msg-mechanical-check` a partir de `origin/main`
   (`262a781b`); artefatos intent/ commitados junto (E1–E4 num PR único,
   bounded).
2. Verificação local: self-tests E1/E3 + contra-história real + YAML parse.
3. PR único; countersign independente QA Lead via
   `scripts/countersign_assign.sh` (dedup AID-2844); **merge pela porta
   única** `scripts/merge_pr.sh` (a linha canônica na merge msg é
   obrigatória — e o próprio merge vira o dogfood E2: a run do
   `merge-msg-gate` no push resultante precisa ficar verde).
4. Recibo no carrier AID-3447 (template `docs/sdlc/templates/receipt.md`)
   com os rc citados; flip `done` após run verde em main.

## Riscos / tradeoffs

- **Falso positivo** (merge legítimo sem linha): é exatamente a classe a
  detectar; mitigado pela triage do incidente (critério de severidade da
  emenda AID-2655) — e merges pela porta nunca disparam (§5/§5b).
- **Squash/octopus**: squash (1 parent) fica fora do escopo por construção
  (a linha é obrigação de merge-msg; squash não tem merge commit). Octopus
  (≥3 parents) é verificado como qualquer merge.
- **Incidente duplicado**: dedup por sha nos títulos de issues abertas;
  criação é best-effort e nunca mascara o check vermelho.
- **`--range` com base não-resolvível** (force-push/push inicial): cai para
  só-o-head com `::warning` — mesma convenção do job sdlc-guards do CI.
