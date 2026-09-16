# Plan: emenda §PRs automatizados + checklist §Merge protocol (AID-2219)

Change-id: AID-2219-merge-discipline-bot-pr-gate · From: intent/AID-2219-merge-discipline-bot-pr-gate/intent.md (fast path: bounded docs-only, spec colapsado aqui) · Status: approved (decisão de owner AID-2219)

## Files that change

- `docs/sdlc/README.md` — dois pontos:
  1. §PRs automatizados, logo após o bloco "Producer ≠ verifier nunca é
     dispensado" (fim do item 3 do fast path): novo parágrafo binding
     "Ordenamento binding: veredito + registro antes do merge (AID-2219)".
  2. §Merge protocol — hygiene de runs (AID-1618): nova regra 4, checklist
     binário pré-merge para PR de bot ("veredito postado? registro
     commitado?").
- `intent/AID-2219-merge-discipline-bot-pr-gate/` (new) — este registro.

## Order of work

1. Commit do registro (este dir) no branch do PR — registro do produtor
   commitado **antes** do merge (modela a própria regra).
2. Emenda 1 (parágrafo §PRs automatizados): amarrar que founder merge é
   forma de aceite, não dispensa (i) veredito first-hand no carrier e (ii)
   registro commitado; citar caso âncora #460/AID-2201 e a recorrência
   AID-767/F1.
3. Emenda 2 (regra 4 do §Merge protocol): checklist binário para todo bot
   PR antes do merge; CI verde explicitamente declarado não-gate-completo
   para essa classe.
4. PR docs-only → countersign QA fresh-context **pré-merge** (diff toca
   autoridade de processo; análogo founder-direct item 3) → merge single-writer
   citando o countersign.

## Risks

- Redundância entre as duas emendas — aceita deliberadamente: a norma vive
  na seção de política, o check vive no protocolo executável do merge-writer
  (mesmo padrão re-read/guardrail do AID-1618).
- Texto vira "mais uma regra que ninguém relê" — mitigado colocando o check
  no ponto de execução (§Merge protocol é o que o merge-writer relê antes de
  mergar) e mantendo cada emenda curta (1 parágrafo / 1 item).
- Alternativa considerada e NÃO escolhida: hook/CI que bloqueia merge de bot
  PR sem label de veredito — fora de escopo deste issue (docs-only); pode ser
  follow-up se a recorrência persistir.

## Proof

- `git diff origin/main -- docs/sdlc/README.md` → apenas os dois blocos
  novos; nenhum outro path tocado além de `intent/AID-2219-...`.
- CI do PR verde no head, incl. job `sdlc-guards` (guardrail de paths/testes
  no diff).
- Verificação semântica pelo verifier: (a) o parágrafo novo torna o
  ordenamento inambíguo para AMBAS as formas de aceitação do item 3;
  (b) a regra 4 é binária (dois checks) e cita AID-2219/#460;
  (c) nenhum precedente existente (AID-1136 founder merge; AID-1515
  founder-direct) é invalidado retroativamente.

## Verification split

QA Lead (fresh-context countersign pré-merge, child issue Paperclip):
confere o diff contra este plan ( Proof itens acima) e postar veredito
CONFORME/NÃO CONFORME no carrier antes do merge. Produtor (CEO) não verifica
o próprio diff.
