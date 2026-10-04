# Plan: AID-3772 — fatia r5 do retorno takeaway→feedback

Author: FPE (fa8130d5) · Change-id: AID-3772-f1-takeaway-r5 · Status: executed (local slice; reviews pending)

## Passos

1. **Admissão (precondição PO)** — avaliação do gate registrada em AID-3772 antes de qualquer
   código (comentário `f3b633d1`): preparação em branch/worktree separada ADMITIDA pelo
   precedente AID-3849→AID-3859; landing/manifest/transporte de aceites continuam gateados.
2. **Clone isolado** — `git clone /paperclip/repo /paperclip/aid3772-r5-slice`;
   `git checkout -b aid3772/f1-takeaway-r5 b20fdc74` (fonte e `_default` imóveis).
3. **Specs novas primeiro (failing-test-first)** —
   `guidedPracticeTakeawayReturn.test.ts` + `GuidedPracticeApp.takeawayReturn.test.tsx`;
   vermelho comprovado (6/7 falhando) antes do delta.
4. **Delta mínimo** — reducer: evento `revisao-pedida` + case (guard takeaway, só troca phase);
   UI: botão de revisão + motivo no action bar do takeaway com blockers. Nenhum outro arquivo.
5. **Verificação local** — `npm test` (433 testes), `biome lint` (4 arquivos), `tsc -b`.
6. **Manifest real** — registrado como comentário-manifest no AID-3772 (forma do precedente
   AID-3859/`e259ac97`), com HEAD/tree/base/diff efetivo completo/pins/dependências/exclusões/
   reprodutibilidade/proveniência, declarado ANTES de qualquer transporte de aceite (nada
   transportado).
7. **Revisões (a admitir pelo PO)** — técnica independente FSE (`e761b40c`) sobre o objeto
   exato; pedagógica por rota própria legítima; só depois provas focadas PD-05/PD-04b.

## Riscos e mitigações

- **Quebra do invariante do manifest r4** — mitigado: branch local separada; r4/`rc/qa-c0-*` e
  `/paperclip/repo` imóveis (porcelain vazio conferido); zero push.
- **Regressão do ciclo canônico** — mitigado: bateria completa do engine verde; reteste PD-04b
  obrigatório pós-revisão antes de qualquer landing.
- **Desvio de escopo** — mitigado: delta limitado a 2 arquivos de código + 2 specs novas +
  intent docs; entrada do takeaway deliberadamente sem gate (contrato PO item 3).
