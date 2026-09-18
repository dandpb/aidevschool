# Plan: AID-2384-regrant-complete-labels-self-guarantee

Bounded fix, 3 arquivos. Owner FPE `fa8130d5`; aceite = AID-2384 §Aceite.

## Passos

1. **Branch** `fpe/aid-2384-regrant-complete-labels-self-guarantee` a partir de
   `main` (`6470f7ac`).
2. **`.github/workflows/readiness-regrant-complete.yml`**:
   - header: nota AID-2384 (auto-garantia + comentário-antes-de-label);
   - novo passo `ensure observation labels exist` (idempotente, espelha a
     fábrica) imediatamente antes de `record the observation state on the PR`;
   - reordenar os dois caminhos de `record the observation state`:
     comentário primeiro, label depois; verde mantém o add fatal (fail-closed),
     vermelho faz add `|| true` e mantém `exit 1`.
3. **`docs/product-readiness/REGRANT-RUNBOOK.md`** §Labels (R2): uma sentença
   documentando a auto-garantia (AID-2384).
4. **`intent/AID-2384-regrant-complete-labels-self-guarantee/`**: intent.md +
   plan.md (este arquivo) — registro do produtor antes do merge.
5. **Verificação local** (producer-side; countersign QA é o veredito
   independente):
   - YAML parse do workflow (python yaml);
   - `bash -n` do script de cada `run:` editado (stub de env);
   - diff review: conteúdo dos comentários e mensagens preservados verbatim;
     sem mudança de `permissions:`/gatilhos/`if:`.
6. **PR** para `main` citando AID-2384 + evidência do drill falho
   (run 35300417695) + aceite.
7. **Countersign QA fresh-context pré-merge** (diff toca autoridade de
   processo) via issue Paperclip designada ao QA Lead; **merge single-writer
   CEO** após CONFORME (relay se necessário).
8. **Drill pós-merge (aceite executável)**: deletar as duas labels do repo →
   PR drill head `regrant/auto-*` (padrão AID-2380 PR #490) → `workflow_dispatch`
   input `pr` → verificar: check vermelho nomeado + label
   `regrant-pending-observation` recriada/aplicada + comentário "regrant
   observation incomplete" postado → fechar PR drill + deletar branch
   (protocolo AID-1741, comentário drill-jobs-receipt) → labels ficam
   auto-criadas pelo próprio gate.

## Riscos e trade-offs

- **add-label verde fatal**: uma falha transitória de label deixa o check
  vermelho mesmo com o gate verde — escolhido fail-closed (sem janela nova);
  re-run resolve.
- **Sem `issues: write`**: evidência first-hand (run 35224606938) de que
  `pull-requests: write` autoriza `gh label create` neste repo; se o ambiente
  mudar, o `|| true` do bootstrap degrada ao comportamento pré-AID-2384 (sem
  regressão vs. hoje).
- **Labels deletadas em uso**: `regrant-pending-observation` hoje só está em
   PR fechado (#490); o drill do passo 8 recria ambas via próprio gate.
