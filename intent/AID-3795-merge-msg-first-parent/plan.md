# Plan: AID-3795-merge-msg-first-parent

Author: FPE (agent 1e9be0fa) · Date: 2026-10-02 · Loop SDLC próprio (fast
path NÃO aplicável — mudança de gate; artefatos colapsados por paridade com
AID-3447)

## Entregas

| # | Entrega | Arquivo/superfície | Verificação |
| --- | --- | --- | --- |
| E1 | `range_shas` com `git log --first-parent --reverse` (modo range = só first-parent path do head do push = main); docstring contrato item 1 emendado (obrigação vale na superfície de aterrissagem); `--sha` inalterado (D3) | `scripts/merge_msg_check.py` | self-test: fixture sintética com update-branch merge no 2º pai NÃO listado/verificado; merge fora-da-porta no first-parent path CONTINUA sinalizado; `--sha` no update-branch merge ainda audita (1 violação) |
| E2 | Step de incidente lista SHAs com `git log --first-parent` (D2) + comentários de escopo no workflow | `.github/workflows/merge-msg-gate.yml` | YAML parse; leitura cruzada E1; dogfood no merge do próprio PR |
| E3 | Emenda AID-3795 no §Merge protocol item 5 (2 falsos-positivos, causa-raiz do range, escopo first-parent, sem enfraquecimento) | `docs/sdlc/README.md` | leitura cruzada com emendas AID-2655/AID-3447 (mesma série) |
| E4 | Contra-história real: ranges dos 2 incidentes agora PASS | — | `--range fcf84d3e..195887c2` → PASS (só `195887c2` checado); `--range 195887c2..8d257abc` → PASS (só `8d257abc`); backfill full: `--range 262a781b..origin/main` sem regressão de merges reais |

## Sequência

1. Branch `aid-3795/merge-msg-first-parent` a partir de `origin/main`
   atual; artefatos intent/ commitados junto (E1–E3 num PR único,
   bounded).
2. Verificação local: `python3 scripts/merge_msg_check.py --self-test`
   (todos os casos novos + pré-existentes) + contra-história real E4 +
   `bash scripts/merge_pr.sh --self-test` (intacto) + YAML parse.
3. PR único; countersign independente via
   `scripts/countersign_assign.sh` (dedup AID-2844); **merge pela porta
   única** `scripts/merge_pr.sh` — o push resultante é o dogfood: com
   update-branch no PR (branch protection strict), o `merge-msg-gate`
   precisa ficar VERDE onde os 2 incidentes ficaram vermelhos.
4. Recibo no carrier AID-3795 (template `docs/sdlc/templates/receipt.md`)
   com os rc citados; triage final dos incidentes AID-3788 (done) e
   AID-3791 (todo → fechado como falso-positivo corrigido); flip `done`
   após run verde em main.

## Riscos / tradeoffs

- **Enfraquecimento (risco central):** merges fora-da-porta só escapam se
  aterrissarem fora do first-parent path de main — mas TODO merge que
  aterrissa em main por merge É o novo head first-parent de main (porta,
  web UI, API raw, CLI fallback: `git merge` em main sempre põe main como
  1º pai). Self-test negativo pinia o caso; critério 2 do carrier.
- **Merge com base não-resolvível** (force-push/push inicial): continua
  caindo para só-o-head com `::warning` (head é first-parent de main por
  construção) — sem mudança.
- **Rebase/octopus:** rebase de main não gera merge commit (fora do
  escopo por construção); octopus no first-parent path é verificado como
  qualquer merge (≥2 pais).
- **`--sha` em update-branch merge continua VIOLATION:** intencional (D3,
  ferramenta de triagem explícita) — documentado no self-test e na emenda.
